const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 17 ----------

const summary = {
  range: "month",
  from: "2026-11-01",
  to: "2026-11-21",
  newLeads: 14,
  ordersConfirmed: 6,
  installsCompleted: 4,
  revenue: 1137000,
  partsCost: 812000,
  technicianCost: 31000,
  profit: 294000,
  openRepairs: 2,
  unfinishedJobs: 3,
};

const profitRows = [
  {
    orderId: 3,
    customer: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali" },
    status: "INSTALLED",
    revenue: 189500,
    partsCost: 131000,
    technicianCost: 1625,
    profit: 56875,
    result: "PROFIT",
  },
  {
    orderId: 4,
    customer: { id: 6, name: "Gurpreet Singh Sandhu", city: "Ludhiana" },
    status: "INSTALLED",
    revenue: 61500,
    partsCost: 64200,
    technicianCost: 1875,
    profit: -4575,
    result: "LOSS",
  },
];

const shareSchema = z.object({
  range: z.enum(["today", "week", "month"]).optional(),
});

// GET /api/dashboard/summary
router.get("/summary", authenticate, requireRole("DIRECTOR"), (req, res) => {
  const range = ["today", "week", "month"].includes(req.query.range) ? req.query.range : "today";
  return ok(res, { ...summary, range });
});

// GET /api/dashboard/profit-per-job
router.get("/profit-per-job", authenticate, requireRole("DIRECTOR"), (req, res) => {
  return ok(res, profitRows, 200, { page: 1, limit: 10, total: profitRows.length, totalPages: 1 });
});

// GET /api/dashboard/open-repairs
router.get("/open-repairs", authenticate, requireRole("DIRECTOR"), (req, res) => {
  return ok(res, [
    {
      id: 2,
      status: "OPEN",
      issue: "Inverter shows fault code E04, no power.",
      warrantyStatus: "IN",
      customer: { id: 5, name: "Parminder Kaur Dhillon", phone: "9988776655" },
      daysOpen: 3,
    },
  ]);
});

// GET /api/dashboard/unfinished-jobs
router.get("/unfinished-jobs", authenticate, requireRole("DIRECTOR"), (req, res) => {
  return ok(res, [
    {
      orderId: 4,
      customer: { id: 6, name: "Gurpreet Singh Sandhu", city: "Ludhiana" },
      status: "DISPATCHED",
      waitingFor: "Delivery confirmation",
      balance: 94500,
      daysSinceConfirmed: 6,
    },
  ]);
});

// POST /api/dashboard/share
router.post("/share", authenticate, requireRole("DIRECTOR"), (req, res, next) => {
  try {
    shareSchema.parse(req.body);
    return ok(
      res,
      {
        url: "https://kiran-solar.vercel.app/shared/9f3a2c71b8e4",
        token: "9f3a2c71b8e4",
        expiresAt: "2026-11-28T09:00:00.000Z",
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/shared/:token (Public: summary numbers only, no customer details)
router.get("/shared/:token", (req, res) => {
  if (req.params.token !== "9f3a2c71b8e4") {
    return fail(res, 404, "This link has expired or does not exist");
  }
  return ok(res, summary);
});

module.exports = router;