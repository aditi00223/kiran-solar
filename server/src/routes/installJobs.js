const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 12) ----------

const JOB_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];

// Phones and servers can disagree by a few minutes
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// An error with its own status code, which errorHandler turns into a clean response
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const summarySelect = {
  id: true,
  status: true,
  scheduledDate: true,
  orderId: true,
  order: { select: { lead: { select: { id: true, name: true, city: true, address: true } } } },
  technician: { select: { id: true, name: true } },
};

const detailSelect = {
  ...summarySelect,
  order: {
    select: {
      lead: { select: { id: true, name: true, city: true, address: true } },
      quote: {
        select: {
          lines: {
            select: { productId: true, description: true, quantity: true },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  },
  startTime: true,
  endTime: true,
  hoursWorked: true,
  systemSizeKw: true,
  photoUrls: true,
  signatureUrl: true,
};

// The database names differ from the API names, so translate here.
function toSummary(j) {
  return {
    id: j.id,
    status: j.status,
    scheduledAt: j.scheduledDate,
    orderId: j.orderId,
    lead: j.order.lead,
    technician: j.technician,
  };
}

function toDetail(j) {
  return {
    ...toSummary(j),
    lines: j.order.quote.lines,
    startedAt: j.startTime,
    finishedAt: j.endTime,
    hours: j.hoursWorked,
    systemSizeKw: j.systemSizeKw,
    photoUrls: j.photoUrls,
    signatureUrl: j.signatureUrl,
  };
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(JOB_STATUSES, { message: "Status must be SCHEDULED, IN_PROGRESS or COMPLETED" }).optional(),
  technicianId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
});

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

// GET /api/install-jobs (real, Step 12a)
router.get("/", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, status, technicianId, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    // A technician only ever sees their own jobs, whatever they ask for
    if (req.user.role === "TECHNICIAN") where.technicianId = req.user.id;
    else if (technicianId) where.technicianId = technicianId;
    if (search) where.order = { lead: { name: { contains: search, mode: "insensitive" } } };

    const [total, jobs] = await Promise.all([
      prisma.installJob.count({ where }),
      prisma.installJob.findMany({
        where,
        select: summarySelect,
        orderBy: [{ scheduledDate: { sort: "asc", nulls: "last" } }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, jobs.map(toSummary), 200, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/install-jobs/:id (real, Step 12a)
router.get("/:id", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const job = await prisma.installJob.findUnique({ where: { id }, select: detailSelect });
    if (!job) return fail(res, 404, "Record not found");

    if (req.user.role === "TECHNICIAN" && (!job.technician || job.technician.id !== req.user.id)) {
      return fail(res, 403, "This job is not assigned to you");
    }

    return ok(res, toDetail(job));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/install-jobs/:id/assign (real, Step 12b)
router.patch("/:id/assign", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = assignSchema.parse(req.body);

    const scheduledDate = new Date(body.scheduledAt);
    if (scheduledDate < new Date()) {
      return fail(res, 400, "The installation date cannot be in the past");
    }

    const job = await prisma.installJob.findUnique({ where: { id }, select: { status: true } });
    if (!job) return fail(res, 404, "Record not found");
    if (job.status !== "SCHEDULED") {
      return fail(res, 400, "Only a scheduled job can be assigned");
    }

    const technician = await prisma.user.findFirst({
      where: { id: body.technicianId, role: "TECHNICIAN", active: true },
      select: { id: true },
    });
    if (!technician) return fail(res, 400, "Selected technician was not found");

    const updated = await prisma.installJob.update({
      where: { id },
      data: { technicianId: technician.id, scheduledDate },
      select: detailSelect,
    });

    return ok(res, toDetail(updated));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/install-jobs/:id/complete (real, Step 12c)
router.patch("/:id/complete", authenticate, requireRole("TECHNICIAN"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = completeSchema.parse(req.body);
    const startTime = new Date(body.startedAt);
    const endTime = new Date(body.finishedAt);

    if (endTime.getTime() > Date.now() + CLOCK_SKEW_MS) {
      return fail(res, 400, "Finish time cannot be in the future");
    }

    const job = await prisma.installJob.findUnique({
      where: { id },
      select: { status: true, technicianId: true, orderId: true, order: { select: { status: true } } },
    });
    if (!job) return fail(res, 404, "Record not found");
    if (job.technicianId !== req.user.id) {
      return fail(res, 403, "This job is not assigned to you");
    }
    if (job.status === "COMPLETED") {
      return fail(res, 400, "This job is already completed");
    }
    if (job.order.status !== "DELIVERED") {
      return fail(res, 400, "The order has not been delivered yet");
    }

    // Hours feed technician pay (F17) and profit per job (F14)
    const hours = Math.round(((endTime - startTime) / 36e5) * 100) / 100;

    const updated = await prisma.$transaction(async (tx) => {
      // Only one request can complete the job, and only its own technician
      const moved = await tx.installJob.updateMany({
        where: { id, technicianId: req.user.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
        data: {
          status: "COMPLETED",
          startTime,
          endTime,
          hoursWorked: hours,
          systemSizeKw: body.systemSizeKw,
          photoUrls: body.photoUrls,
          signatureUrl: body.signatureUrl,
        },
      });
      if (moved.count === 0) throw httpError(400, "This job is already completed");

      const order = await tx.order.updateMany({
        where: { id: job.orderId, status: "DELIVERED" },
        data: { status: "INSTALLED" },
      });
      if (order.count === 0) throw httpError(400, "The order has not been delivered yet");

      return tx.installJob.findUnique({ where: { id }, select: detailSelect });
    });

    return ok(res, toDetail(updated));
  } catch (err) {
    next(err);
  }
});

module.exports = router;