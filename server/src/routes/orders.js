const express = require("express");
const { z } = require("zod");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 9 ----------

const sampleOrder = {
  id: 3,
  status: "CONFIRMED",
  totalAmount: 189500,
  paid: 95000,
  balance: 94500,
  lead: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali" },
  confirmedAt: "2026-11-21T09:30:00.000Z",
};

const orderDetail = {
  ...sampleOrder,
  lead: {
    id: 5, name: "Parminder Kaur Dhillon", phone: "9988776655",
    address: "Sector 70, House 1183", city: "Mohali",
  },
  payments: [
    { id: 5, amount: 95000, type: "ADVANCE", method: "UPI", paidAt: "2026-11-21T09:30:00.000Z" },
  ],
  lines: [
    { productId: 1, description: "Mono PERC Solar Panel 540W", quantity: 6, unitPrice: 14500, lineTotal: 87000 },
    { productId: 4, description: "On-Grid Solar Inverter 3 kW", quantity: 1, unitPrice: 38000, lineTotal: 38000 },
  ],
  serials: [],
  installJob: { id: 3, status: "SCHEDULED", technician: null },
};

const createOrderSchema = z.object({
  quoteId: z.number().int("quoteId is required"),
  payment: z.object({
    amount: z.number().positive("Payment amount must be more than 0"),
    type: z.enum(["ADVANCE", "FULL"], {
      errorMap: () => ({ message: "Type must be ADVANCE or FULL" }),
    }),
    method: z.string().optional(),
  }),
});

const addPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be more than 0"),
  type: z.enum(["BALANCE", "FULL"], {
    errorMap: () => ({ message: "Type must be BALANCE or FULL" }),
  }),
  method: z.string().optional(),
  note: z.string().optional(),
});

// POST /api/orders
router.post("/", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const paid = body.payment.amount;
    return ok(res, { ...sampleOrder, paid, balance: sampleOrder.totalAmount - paid }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders
router.get("/", authenticate, requireRole("SALES", "WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, [sampleOrder], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/orders/:id
router.get("/:id", authenticate, requireRole("SALES", "WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, { ...orderDetail, id: Number(req.params.id) });
});

// POST /api/orders/:id/payments
router.post("/:id/payments", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = addPaymentSchema.parse(req.body);
    const paid = sampleOrder.paid + body.amount;
    return ok(res, { ...sampleOrder, id: Number(req.params.id), paid, balance: sampleOrder.totalAmount - paid }, 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;