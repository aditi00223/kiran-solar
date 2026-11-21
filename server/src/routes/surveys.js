const express = require("express");
const { z } = require("zod");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 7 ----------

const sampleSurvey = {
  id: 4,
  status: "APPROVED",
  scheduledAt: "2026-11-10T10:00:00.000Z",
  roofDirection: "South-West",
  tiltAngle: 22,
  cableDistance: 12,
  notes: "Clear roof, water tank on the north side only.",
  reviewNote: "Approved.",
  lead: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali" },
  technician: { id: 6, name: "Jaspreet Singh" },
};

const createSurveySchema = z.object({
  leadId: z.number().int("leadId is required"),
  technicianId: z.number().int("technicianId is required"),
  scheduledAt: z.string().datetime("Enter a valid date and time"),
});

const recordSurveySchema = z.object({
  roofDirection: z.string().min(1, "Roof direction is required"),
  tiltAngle: z.number().min(0).max(90, "Tilt must be between 0 and 90 degrees"),
  cableDistance: z.number().positive("Must be a positive number"),
  notes: z.string().optional(),
});

const reviewSurveySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"], {
      errorMap: () => ({ message: "Decision must be APPROVED or REJECTED" }),
    }),
    reviewNote: z.string().optional(),
  })
  .refine((v) => v.decision !== "REJECTED" || (v.reviewNote && v.reviewNote.trim()), {
    message: "A reason is required when rejecting a survey",
    path: ["reviewNote"],
  });

// POST /api/surveys
router.post("/", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = createSurveySchema.parse(req.body);
    return ok(
      res,
      {
        id: 5,
        leadId: body.leadId,
        status: "SCHEDULED",
        scheduledAt: body.scheduledAt,
        technician: { id: body.technicianId, name: "Jaspreet Singh" },
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys
router.get("/", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), (req, res) => {
  const { notes, reviewNote, ...summary } = sampleSurvey;
  return ok(res, [summary], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/surveys/:id
router.get("/:id", authenticate, requireRole("SALES", "TECHNICIAN", "DIRECTOR"), (req, res) => {
  return ok(res, { ...sampleSurvey, id: Number(req.params.id) });
});

// PATCH /api/surveys/:id/record
router.patch("/:id/record", authenticate, requireRole("TECHNICIAN"), (req, res, next) => {
  try {
    const body = recordSurveySchema.parse(req.body);
    return ok(res, { ...sampleSurvey, id: Number(req.params.id), ...body, status: "COMPLETED", reviewNote: null });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/surveys/:id/review
router.patch("/:id/review", authenticate, requireRole("SALES", "DIRECTOR"), (req, res, next) => {
  try {
    const body = reviewSurveySchema.parse(req.body);
    return ok(res, { ...sampleSurvey, id: Number(req.params.id), status: body.decision, reviewNote: body.reviewNote || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;