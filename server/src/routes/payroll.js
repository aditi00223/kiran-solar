const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 16 ----------

const payrollMonth = {
  month: "2026-11",
  technicians: [
    { technicianId: 6, name: "Jaspreet Singh", jobs: 4, hours: 26.5, hourlyRate: 250, amount: 6625, status: "UNPAID" },
    { technicianId: 7, name: "Manpreet Singh", jobs: 3, hours: 19, hourlyRate: 250, amount: 4750, status: "PAID", paidAt: "2026-11-30T12:00:00.000Z" },
  ],
  totalPayable: 11375,
  totalPaid: 4750,
};

const payRateSchema = z.object({
  hourlyRate: z.number().positive("Must be a positive number"),
});

const paySchema = z.object({
  technicianId: z.number().int("technicianId is required"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-11"),
});

// PATCH /api/users/:id/pay-rate
router.patch("/users/:id/pay-rate", authenticate, requireRole("DIRECTOR"), (req, res, next) => {
  try {
    const body = payRateSchema.parse(req.body);
    return ok(res, { id: Number(req.params.id), name: "Jaspreet Singh", hourlyRate: body.hourlyRate });
  } catch (err) {
    next(err);
  }
});

// GET /api/payroll
router.get("/payroll", authenticate, requireRole("DIRECTOR"), (req, res) => {
  const month = req.query.month ? String(req.query.month) : payrollMonth.month;
  return ok(res, { ...payrollMonth, month });
});

// POST /api/payroll/pay
router.post("/payroll/pay", authenticate, requireRole("DIRECTOR"), (req, res, next) => {
  try {
    const body = paySchema.parse(req.body);

    // STUB ONLY: technician 7 is already paid for 2026-11, so this shows the real error
    if (body.technicianId === 7 && body.month === "2026-11") {
      return fail(res, 400, "This month is already paid for this technician");
    }

    return ok(
      res,
      { technicianId: body.technicianId, month: body.month, amount: 6625, status: "PAID", paidAt: "2026-11-30T12:00:00.000Z" },
      201
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;