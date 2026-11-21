const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 7) ----------

const SURVEY_STATUSES = ["SCHEDULED", "COMPLETED", "APPROVED", "REJECTED"];

const listSelect = {
  id: true,
  status: true,
  scheduledAt: true,
  roofDirection: true,
  tiltAngle: true,
  cableDistance: true,
  lead: { select: { id: true, name: true, city: true } },
  technician: { select: { id: true, name: true } },
};

const detailSelect = { ...listSelect, notes: true, reviewNote: true };

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const createSurveySchema = z.object({
  leadId: z.number().int("leadId is required"),
  technicianId: z.number().int("technicianId is required"),
  scheduledAt: z
    .string()
    .datetime("Enter a valid date and time")
    .refine((v) => new Date(v) > new Date(), "Survey date must be in the future"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(SURVEY_STATUSES).optional(),
  leadId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
});

const recordSurveySchema = z.object({
  roofDirection: z.string().trim().min(1, "Roof direction is required"),
  tiltAngle: z.number().min(0, "Tilt must be between 0 and 90 degrees").max(90, "Tilt must be between 0 and 90 degrees"),
  cableDistance: z.number().positive("Must be a positive number"),
  notes: z.string().trim().optional(),
});

const reviewSurveySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"], {
      errorMap: () => ({ message: "Decision must be APPROVED or REJECTED" }),
    }),
    reviewNote: z.string().trim().optional(),
  })
  .refine((v) => v.decision !== "REJECTED" || (v.reviewNote && v.reviewNote.length > 0), {
    message: "A reason is required when rejecting a survey",
    path: ["reviewNote"],
  });

// POST /api/surveys
router.post("/", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const body = createSurveySchema.parse(req.body);

    const lead = await prisma.lead.findUnique({ where: { id: body.leadId }, select: { status: true } });
    if (!lead) return fail(res, 404, "Lead not found");
    if (lead.status === "LOST") return fail(res, 400, "This lead is marked lost");
    if (lead.status === "ORDERED") return fail(res, 400, "This lead already has an order");

    const live = await prisma.survey.findFirst({
      where: { leadId: body.leadId, status: { in: ["SCHEDULED", "COMPLETED", "APPROVED"] } },
      select: { status: true },
    });
    if (live) {
      return fail(
        res,
        400,
        live.status === "APPROVED"
          ? "This lead already has an approved survey"
          : "This lead already has a survey in progress"
      );
    }

    const technician = await prisma.user.findFirst({
      where: { id: body.technicianId, role: "TECHNICIAN", active: true },
      select: { id: true },
    });
    if (!technician) return fail(res, 400, "Selected technician was not found");

    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          leadId: body.leadId,
          technicianId: body.technicianId,
          scheduledAt: new Date(body.scheduledAt),
        },
        select: {
          id: true,
          leadId: true,
          status: true,
          scheduledAt: true,
          technician: { select: { id: true, name: true } },
        },
      });
      // Only move a lead forward. A lead already past this stage keeps its status.
      if (["NEW", "CONTACTED"].includes(lead.status)) {
        await tx.lead.update({ where: { id: body.leadId }, data: { status: "SURVEY_SCHEDULED" } });
      }
      return created;
    });

    return ok(res, survey, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys
router.get("/", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, status, leadId, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    if (search) where.lead = { name: { contains: search, mode: "insensitive" } };
    // Technicians only see their own surveys.
    if (req.user.role === "TECHNICIAN") where.technicianId = req.user.id;

    const [total, surveys] = await Promise.all([
      prisma.survey.count({ where }),
      prisma.survey.findMany({
        where,
        select: listSelect,
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, surveys, 200, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys/:id
router.get("/:id", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const where = { id };
    if (req.user.role === "TECHNICIAN") where.technicianId = req.user.id;

    const survey = await prisma.survey.findFirst({ where, select: detailSelect });
    if (!survey) return fail(res, 404, "Record not found");

    return ok(res, survey);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/surveys/:id/record (technician records the roof measurements)
router.patch("/:id/record", authenticate, requireRole("TECHNICIAN"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = recordSurveySchema.parse(req.body);

    const existing = await prisma.survey.findFirst({
      where: { id, technicianId: req.user.id },
      select: { status: true },
    });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.status !== "SCHEDULED") {
      return fail(res, 400, "This survey has already been recorded");
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        roofDirection: body.roofDirection,
        tiltAngle: body.tiltAngle,
        cableDistance: body.cableDistance,
        notes: body.notes || null,
        status: "COMPLETED",
      },
      select: detailSelect,
    });

    return ok(res, survey);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/surveys/:id/review (approve or reject a completed survey)
router.patch("/:id/review", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = reviewSurveySchema.parse(req.body);

    const existing = await prisma.survey.findUnique({
      where: { id },
      select: { status: true, leadId: true, lead: { select: { status: true } } },
    });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.status === "SCHEDULED") return fail(res, 400, "Survey has not been completed yet");
    if (existing.status !== "COMPLETED") return fail(res, 400, "This survey has already been reviewed");

    const survey = await prisma.$transaction(async (tx) => {
      const updated = await tx.survey.update({
        where: { id },
        data: { status: body.decision, reviewNote: body.reviewNote || null },
        select: detailSelect,
      });
      // Approval opens the quote gate. A lead already quoted or ordered is left alone.
      if (
        body.decision === "APPROVED" &&
        ["NEW", "CONTACTED", "SURVEY_SCHEDULED"].includes(existing.lead.status)
      ) {
        await tx.lead.update({ where: { id: existing.leadId }, data: { status: "SURVEY_APPROVED" } });
      }
      return updated;
    });

    return ok(res, survey);
  } catch (err) {
    next(err);
  }
});

module.exports = router;