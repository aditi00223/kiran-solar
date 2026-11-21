const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 16) ----------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const round2 = (n) => Math.round(n * 100) / 100;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// "2026-11" for the current month in Indian time
function currentMonth() {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

// Start (inclusive) and end (exclusive) of a month, in Indian time
function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS),
  };
}

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must look like 2026-11");

const payRateSchema = z.object({
  hourlyRate: z
    .number()
    .positive("Must be a positive number")
    .max(100000, "Rate is too high")
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimal places"),
});

const payrollQuerySchema = z.object({
  month: monthSchema.optional(),
});

const paySchema = z.object({
  technicianId: z.number().int("technicianId is required"),
  month: monthSchema,
});

// One row per technician for a month. Paid months come from the saved TechnicianPay row,
// unpaid months are worked out live from the completed jobs and the current rate.
async function buildPayroll(month, onlyTechnicianId) {
  const { start, end } = monthRange(month);
  const techFilter = onlyTechnicianId ? { id: onlyTechnicianId } : {};

  const [technicians, jobs, pays] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TECHNICIAN", ...techFilter },
      select: { id: true, name: true, active: true, payRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.installJob.findMany({
      where: {
        status: "COMPLETED",
        endTime: { gte: start, lt: end },
        technicianId: onlyTechnicianId ? onlyTechnicianId : { not: null },
      },
      select: { technicianId: true, hoursWorked: true },
    }),
    prisma.technicianPay.findMany({
      where: { month, ...(onlyTechnicianId ? { technicianId: onlyTechnicianId } : {}) },
    }),
  ]);

  const rows = [];
  for (const t of technicians) {
    const mine = jobs.filter((j) => j.technicianId === t.id);
    const pay = pays.find((p) => p.technicianId === t.id);
    if (!onlyTechnicianId && !t.active && mine.length === 0 && !pay) continue;

    if (pay && pay.paid) {
      rows.push({
        technicianId: t.id,
        name: t.name,
        jobs: mine.length,
        hours: pay.hours,
        hourlyRate: Number(pay.rate),
        amount: Number(pay.amount),
        status: "PAID",
        paidAt: pay.paidAt,
      });
      continue;
    }

    const hours = round2(mine.reduce((sum, j) => sum + (j.hoursWorked || 0), 0));
    const rate = t.payRate ? Number(t.payRate) : 0;
    rows.push({
      technicianId: t.id,
      name: t.name,
      jobs: mine.length,
      hours,
      hourlyRate: rate,
      amount: round2(hours * rate),
      status: "UNPAID",
    });
  }
  return rows;
}

// PATCH /api/users/:id/pay-rate
router.patch("/users/:id/pay-rate", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = payRateSchema.parse(req.body);

    const technician = await prisma.user.findFirst({
      where: { id, role: "TECHNICIAN" },
      select: { id: true },
    });
    if (!technician) return fail(res, 404, "Record not found");

    const user = await prisma.user.update({
      where: { id },
      data: { payRate: body.hourlyRate },
      select: { id: true, name: true, payRate: true },
    });

    return ok(res, { id: user.id, name: user.name, hourlyRate: Number(user.payRate) });
  } catch (err) {
    next(err);
  }
});

// GET /api/payroll
router.get("/payroll", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const query = payrollQuerySchema.parse(req.query);
    const month = query.month || currentMonth();

    const technicians = await buildPayroll(month);
    const totalPayable = round2(technicians.reduce((sum, t) => sum + t.amount, 0));
    const totalPaid = round2(
      technicians.filter((t) => t.status === "PAID").reduce((sum, t) => sum + t.amount, 0)
    );

    return ok(res, { month, technicians, totalPayable, totalPaid });
  } catch (err) {
    next(err);
  }
});

// POST /api/payroll/pay (mark one technician's month as paid)
router.post("/payroll/pay", authenticate, requireRole("DIRECTOR"), async (req, res, next) => {
  try {
    const body = paySchema.parse(req.body);

    const technician = await prisma.user.findFirst({
      where: { id: body.technicianId, role: "TECHNICIAN" },
      select: { id: true },
    });
    if (!technician) return fail(res, 404, "Technician not found");

    const [row] = await buildPayroll(body.month, body.technicianId);

    if (row.status === "PAID") return fail(res, 400, "This month is already paid for this technician");
    if (body.month > currentMonth()) return fail(res, 400, "This month has not started yet");
    if (row.hours <= 0) return fail(res, 400, "Nothing to pay for this month");
    if (row.hourlyRate <= 0) return fail(res, 400, "Set an hourly rate for this technician first");

    // Save the hours, rate and amount, so a later rate change never alters a paid month
    const saved = await prisma.technicianPay.upsert({
      where: { technicianId_month: { technicianId: body.technicianId, month: body.month } },
      create: {
        technicianId: body.technicianId,
        month: body.month,
        hours: row.hours,
        rate: row.hourlyRate,
        amount: row.amount,
        paid: true,
        paidAt: new Date(),
      },
      update: {
        hours: row.hours,
        rate: row.hourlyRate,
        amount: row.amount,
        paid: true,
        paidAt: new Date(),
      },
    });

    return ok(
      res,
      {
        technicianId: saved.technicianId,
        month: saved.month,
        hours: saved.hours,
        amount: Number(saved.amount),
        status: "PAID",
        paidAt: saved.paidAt,
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;