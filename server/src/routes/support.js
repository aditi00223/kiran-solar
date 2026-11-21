const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 13 ----------

const sampleTicket = {
  id: 2,
  status: "OPEN",
  issue: "Inverter shows fault code E04, no power.",
  warrantyStatus: "IN",
  customer: { id: 5, name: "Parminder Kaur Dhillon", phone: "9988776655" },
  serial: "INV-3K-2026-00417",
  createdAt: "2028-05-14T08:00:00.000Z",
};

const sampleSerial = {
  serial: "INV-3K-2026-00417",
  product: { id: 4, name: "On-Grid Solar Inverter 3 kW", category: "INVERTER" },
  customer: { id: 5, name: "Parminder Kaur Dhillon", phone: "9988776655", city: "Mohali" },
  warrantyStart: "2026-11-25",
  warrantyEnd: "2028-11-25",
  warrantyStatus: "IN",
};

const createTicketSchema = z.object({
  serial: z.string().min(3, "Serial number is required"),
  issue: z.string().min(5, "Describe the problem"),
});

const repairSchema = z.object({
  partsCost: z.number().nonnegative("Parts cost cannot be negative"),
  labourCost: z.number().nonnegative("Labour cost cannot be negative"),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  customerConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Customer has not confirmed the fix yet" }),
  }),
});

// GET /api/serials/search?q=
router.get("/serials/search", authenticate, requireRole("SUPPORT", "DIRECTOR"), (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return fail(res, 400, "q: Enter a serial number or phone number");
  return ok(res, [sampleSerial]);
});

// POST /api/tickets
router.post("/tickets", authenticate, requireRole("SUPPORT"), (req, res, next) => {
  try {
    const body = createTicketSchema.parse(req.body);
    return ok(res, { ...sampleTicket, serial: body.serial, issue: body.issue, status: "OPEN" }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets
router.get("/tickets", authenticate, requireRole("SUPPORT", "DIRECTOR"), (req, res) => {
  return ok(res, [sampleTicket], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/tickets/:id
router.get("/tickets/:id", authenticate, requireRole("SUPPORT", "DIRECTOR"), (req, res) => {
  return ok(res, { ...sampleTicket, id: Number(req.params.id), invoice: null });
});

// PATCH /api/tickets/:id/repair
router.patch("/tickets/:id/repair", authenticate, requireRole("SUPPORT"), (req, res, next) => {
  try {
    const body = repairSchema.parse(req.body);
    return ok(res, {
      ...sampleTicket,
      id: Number(req.params.id),
      status: "FIXED",
      warrantyStatus: "OUT",
      invoice: { id: 6, amount: body.partsCost + body.labourCost, status: "UNPAID" },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/close
router.patch("/tickets/:id/close", authenticate, requireRole("SUPPORT"), (req, res, next) => {
  try {
    closeSchema.parse(req.body);
    return ok(res, { ...sampleTicket, id: Number(req.params.id), status: "CLOSED" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;