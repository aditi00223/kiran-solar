const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 17) ----------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = ["today", "week", "month"];
const SHARE_PURPOSE = "dashboard-share";

const round2 = (n) => Math.round(n * 100) / 100;

const rangeMessage = "Range must be today, week or month";

// Start and end of a range, counted in Indian time
function rangeBounds(range) {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();

  let startIst = Date.UTC(y, m, d);
  if (range === "week") startIst -= ((ist.getUTCDay() + 6) % 7) * DAY_MS;
  if (range === "month") startIst = Date.UTC(y, m, 1);

  return {
    start: new Date(startIst - IST_OFFSET_MS),
    end: now,
    from: new Date(startIst).toISOString().slice(0, 10),
    to: ist.toISOString().slice(0, 10),
  };
}

// What an order needs for its money figures
const orderSelect = {
  id: true,
  status: true,
  totalAmount: true,
  confirmedAt: true,
  lead: { select: { id: true, name: true, city: true } },
  quote: {
    select: { lines: { select: { quantity: true, product: { select: { costPrice: true } } } } },
  },
  installJob: { select: { hoursWorked: true, technician: { select: { payRate: true } } } },
};

// Revenue minus parts cost minus technician cost
function orderFigures(o) {
  const revenue = Number(o.totalAmount);
  const partsCost = round2(
    o.quote.lines.reduce((sum, l) => sum + l.quantity * Number(l.product.costPrice), 0)
  );
  const hours = o.installJob && o.installJob.hoursWorked ? o.installJob.hoursWorked : 0;
  const rate =
    o.installJob && o.installJob.technician && o.installJob.technician.payRate
      ? Number(o.installJob.technician.payRate)
      : 0;
  const technicianCost = round2(hours * rate);
  return { revenue, partsCost, technicianCost, profit: round2(revenue - partsCost - technicianCost) };
}

async function computeSummary(range) {
  const { start, end, from, to } = rangeBounds(range);
  const window = { gte: start, lte: end };

  const [newLeads, orders, installsCompleted, openRepairs, unfinishedJobs] = await Promise.all([
    prisma.lead.count({ where: { createdAt: window } }),
    prisma.order.findMany({ where: { confirmedAt: window }, select: orderSelect }),
    prisma.installJob.count({ where: { status: "COMPLETED", endTime: window } }),
    prisma.ticket.count({ where: { status: { not: "CLOSED" } } }),
    prisma.order.count({ where: { status: { not: "INSTALLED" } } }),
  ]);

  const totals = orders.map(orderFigures).reduce(
    (sum, f) => ({
      revenue: sum.revenue + f.revenue,
      partsCost: sum.partsCost + f.partsCost,
      technicianCost: sum.technicianCost + f.technicianCost,
    }),
    { revenue: 0, partsCost: 0, technicianCost: 0 }
  );

  return {
    range,
    from,
    to,
    newLeads,
    ordersConfirmed: orders.length,
    installsCompleted,
    revenue: round2(totals.revenue),
    partsCost: round2(totals.partsCost),
    technicianCost: round2(totals.technicianCost),
    profit: round2(totals.revenue - totals.partsCost - totals.technicianCost),
    openRepairs,
    unfinishedJobs,
  };
}

const summaryQuerySchema = z.object({
  range: z.enum(RANGES, { message: rangeMessage }).default("today"),
});

const profitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  range: z.enum(RANGES, { message: rangeMessage }).optional(),
  search: z.string().trim().optional(),
});

const shareSchema = z.object({
  range: z.enum(RANGES, { message: rangeMessage }).default("today"),
});

// What each order is waiting for
const WAITING_FOR = {
  CONFIRMED: "Dispatch from warehouse",
  PACKED: "Dispatch from warehouse",
  DISPATCHED: "Delivery confirmation",
  DELIVERED: "Installation",
};

// GET /api/dashboard/summary
router.get("/summary", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const { range } = summaryQuerySchema.parse(req.query);
    return ok(res, await computeSummary(range));
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/profit-per-job
router.get("/profit-per-job", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, range, search } = profitQuerySchema.parse(req.query);

    const where = {};
    if (range) {
      const { start, end } = rangeBounds(range);
      where.confirmedAt = { gte: start, lte: end };
    }
    if (search) where.lead = { name: { contains: search, mode: "insensitive" } };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: orderSelect,
        orderBy: { confirmedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = orders.map((o) => {
      const f = orderFigures(o);
      return {
        orderId: o.id,
        customer: o.lead,
        status: o.status,
        revenue: f.revenue,
        partsCost: f.partsCost,
        technicianCost: f.technicianCost,
        profit: f.profit,
        result: f.profit >= 0 ? "PROFIT" : "LOSS",
      };
    });

    return ok(res, data, 200, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/open-repairs
router.get("/open-repairs", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { status: { not: "CLOSED" } },
      select: {
        id: true,
        status: true,
        description: true,
        underWarranty: true,
        createdAt: true,
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = Date.now();
    return ok(
      res,
      tickets.map((t) => ({
        id: t.id,
        status: t.status,
        issue: t.description,
        warrantyStatus: t.underWarranty ? "IN" : "OUT",
        customer: t.lead,
        daysOpen: Math.floor((now - t.createdAt.getTime()) / DAY_MS),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/unfinished-jobs
router.get("/unfinished-jobs", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "INSTALLED" } },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        confirmedAt: true,
        lead: { select: { id: true, name: true, city: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { confirmedAt: "asc" },
    });

    const now = Date.now();
    return ok(
      res,
      orders.map((o) => {
        const paid = o.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        return {
          orderId: o.id,
          customer: o.lead,
          status: o.status,
          waitingFor: WAITING_FOR[o.status] || "Next step",
          balance: round2(Number(o.totalAmount) - paid),
          daysSinceConfirmed: Math.floor((now - o.confirmedAt.getTime()) / DAY_MS),
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/dashboard/share (a signed link that stays valid for 7 days)
router.post("/share", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const { range } = shareSchema.parse(req.body || {});

    const token = jwt.sign({ purpose: SHARE_PURPOSE, range }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const expiresAt = new Date(jwt.decode(token).exp * 1000);
    const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

    return ok(res, { url: `${base}/shared/${token}`, token, expiresAt }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/shared/:token (Public: summary numbers only, no customer details)
router.get("/shared/:token", async (req, res, next) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    } catch (e) {
      return fail(res, 404, "This link has expired or does not exist");
    }
    if (payload.purpose !== SHARE_PURPOSE || !RANGES.includes(payload.range)) {
      return fail(res, 404, "This link has expired or does not exist");
    }

    return ok(res, await computeSummary(payload.range));
  } catch (err) {
    next(err);
  }
});

module.exports = router;