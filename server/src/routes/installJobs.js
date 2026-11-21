const express = require("express");
const { z } = require("zod");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 12 ----------

const sampleJob = {
  id: 3,
  status: "SCHEDULED",
  scheduledAt: "2026-11-27T09:00:00.000Z",
  orderId: 3,
  lead: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali", address: "Sector 70, House 1183" },
  technician: { id: 6, name: "Jaspreet Singh" },
};

const jobDetail = {
  ...sampleJob,
  lines: [
    { productId: 1, description: "Mono PERC Solar Panel 540W", quantity: 6 },
    { productId: 4, description: "On-Grid Solar Inverter 3 kW", quantity: 1 },
  ],
  startedAt: null,
  finishedAt: null,
  hours: null,
  systemSizeKw: null,
  photoUrls: [],
  signatureUrl: null,
};

const assignSchema = z.object({
  technicianId: z.number().int("technicianId is required"),
  scheduledAt: z.string().datetime("Enter a valid date and time"),
});

const completeSchema = z
  .object({
    startedAt: z.string().datetime("Enter a valid start time"),
    finishedAt: z.string().datetime("Enter a valid finish time"),
    systemSizeKw: z.number().positive("Must be a positive number"),
    photoUrls: z.array(z.string().url()).min(1, "At least one photo is required"),
    signatureUrl: z.string().min(1, "Customer signature is required"),
  })
  .refine((v) => new Date(v.finishedAt) > new Date(v.startedAt), {
    message: "Finish time must be after start time",
    path: ["finishedAt"],
  });

// GET /api/install-jobs
router.get("/", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), (req, res) => {
  return ok(res, [sampleJob], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/install-jobs/:id
router.get("/:id", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), (req, res) => {
  return ok(res, { ...jobDetail, id: Number(req.params.id) });
});

// PATCH /api/install-jobs/:id/assign
router.patch("/:id/assign", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = assignSchema.parse(req.body);
    return ok(res, {
      ...jobDetail,
      id: Number(req.params.id),
      scheduledAt: body.scheduledAt,
      technician: { id: body.technicianId, name: "Jaspreet Singh" },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/install-jobs/:id/complete
router.patch("/:id/complete", authenticate, requireRole("TECHNICIAN"), (req, res, next) => {
  try {
    const body = completeSchema.parse(req.body);
    const hours = Math.round(((new Date(body.finishedAt) - new Date(body.startedAt)) / 36e5) * 100) / 100;
    return ok(res, { ...jobDetail, id: Number(req.params.id), ...body, hours, status: "COMPLETED" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;