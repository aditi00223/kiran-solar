const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 9) ----------

const ORDER_STATUSES = ["CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "INSTALLED"];

const round2 = (n) => Math.round(n * 100) / 100;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Rupees with at most 2 decimal places
const money = z
  .number()
  .positive("Payment amount must be more than 0")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimal places");

const summarySelect = {
  id: true,
  status: true,
  totalAmount: true,
  confirmedAt: true,
  lead: { select: { id: true, name: true, city: true } },
  payments: { select: { amount: true } },
};

// paid and balance are always worked out from the payments, never stored
function toSummary(o) {
  const total = Number(o.totalAmount);
  const paid = round2(o.payments.reduce((sum, p) => sum + Number(p.amount), 0));
  return {
    id: o.id,
    status: o.status,
    totalAmount: total,
    paid,
    balance: round2(total - paid),
    lead: o.lead,
    confirmedAt: o.confirmedAt,
  };
}

const createOrderSchema = z.object({
  quoteId: z.number().int("quoteId is required"),
  payment: z.object({
    amount: money,
    type: z.enum(["ADVANCE", "FULL"], { message: "Type must be ADVANCE or FULL" }),
    method: z.string().trim().optional(),
  }),
});

const addPaymentSchema = z.object({
  amount: money,
  type: z.enum(["BALANCE", "FULL"], { message: "Type must be BALANCE or FULL" }),
  method: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum(ORDER_STATUSES, { message: "Status must be CONFIRMED, PACKED, DISPATCHED, DELIVERED or INSTALLED" })
    .optional(),
  search: z.string().trim().optional(),
});

// POST /api/orders (confirm a quote and record the first payment)
router.post("/", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const pay = body.payment;

    const quote = await prisma.quote.findUnique({
      where: { id: body.quoteId },
      select: {
        id: true,
        leadId: true,
        totalAmount: true,
        order: { select: { id: true } },
        lead: { select: { status: true } },
      },
    });
    if (!quote) return fail(res, 404, "Quote not found");
    if (quote.order) return fail(res, 400, "This quote already has an order");
    if (quote.lead.status === "LOST") return fail(res, 400, "This lead is marked lost");

    const total = round2(Number(quote.totalAmount));
    if (total <= 0) return fail(res, 400, "This quote has no amount to order");
    if (round2(pay.amount) > total) return fail(res, 400, "Payment is more than the order total");
    if (pay.type === "FULL" && round2(pay.amount) !== total) {
      return fail(res, 400, "A full payment must equal the order total");
    }

    // F8 and F9 in one transaction: the order, its first payment and the crew job
    // are created together, or not at all.
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          quoteId: quote.id,
          leadId: quote.leadId,
          totalAmount: total,
          payments: { create: { amount: pay.amount, type: pay.type, method: pay.method || null } },
          installJob: { create: {} },
        },
        select: summarySelect,
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
      await tx.lead.update({ where: { id: quote.leadId }, data: { status: "ORDERED" } });
      return created;
    });

    return ok(res, toSummary(order), 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders
router.get("/", authenticate, requireRole("SALES", "WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, status, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (search) where.lead = { name: { contains: search, mode: "insensitive" } };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: summarySelect,
        orderBy: { confirmedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, orders.map(toSummary), 200, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get("/:id", authenticate, requireRole("SALES", "WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        confirmedAt: true,
        lead: { select: { id: true, name: true, phone: true, address: true, city: true } },
        payments: {
          select: { id: true, amount: true, type: true, method: true, paidAt: true },
          orderBy: { paidAt: "asc" },
        },
        quote: {
          select: {
            lines: {
              select: { productId: true, description: true, quantity: true, unitPrice: true, lineTotal: true },
              orderBy: { id: "asc" },
            },
          },
        },
        serials: {
          select: { serial: true, warrantyStart: true, warrantyEnd: true, product: { select: { name: true } } },
          orderBy: { id: "asc" },
        },
        installJob: {
          select: { id: true, status: true, technician: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) return fail(res, 404, "Record not found");

    const summary = toSummary(order);
    return ok(res, {
      id: summary.id,
      status: summary.status,
      totalAmount: summary.totalAmount,
      paid: summary.paid,
      balance: summary.balance,
      lead: order.lead,
      confirmedAt: order.confirmedAt,
      payments: order.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      lines: order.quote.lines.map((l) => ({
        ...l,
        unitPrice: Number(l.unitPrice),
        lineTotal: Number(l.lineTotal),
      })),
      serials: order.serials.map((s) => ({
        serial: s.serial,
        product: s.product.name,
        warrantyStart: s.warrantyStart,
        warrantyEnd: s.warrantyEnd,
      })),
      installJob: order.installJob,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/payments (record the balance or a full payment later)
router.post("/:id/payments", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = addPaymentSchema.parse(req.body);

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    });
    if (!existing) return fail(res, 404, "Record not found");

    const paid = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = round2(Number(existing.totalAmount) - paid);

    if (balance <= 0) return fail(res, 400, "This order is already fully paid");
    if (round2(body.amount) > balance) return fail(res, 400, "Payment is more than the balance due");
    if (body.type === "FULL" && round2(body.amount) !== balance) {
      return fail(res, 400, "A full payment must equal the balance due");
    }

    await prisma.payment.create({
      data: {
        orderId: id,
        amount: body.amount,
        type: body.type,
        method: body.method || null,
        note: body.note || null,
      },
    });

    const updated = await prisma.order.findUnique({ where: { id }, select: summarySelect });
    return ok(res, toSummary(updated), 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;