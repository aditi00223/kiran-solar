const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 15 ----------

const STAGES = ["APPLIED", "DOCUMENTS_SUBMITTED", "APPROVED", "RECEIVED"];

const sampleSubsidy = {
  id: 2,
  stage: "DOCUMENTS_SUBMITTED",
  amount: 78000,
  order: { id: 3, lead: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali" } },
  documentLinks: ["https://res.cloudinary.com/kiran/raw/upload/aadhaar5.pdf"],
  appliedOn: "2026-11-26",
  updatedAt: "2026-11-28T09:00:00.000Z",
};

const createSubsidySchema = z.object({
  orderId: z.number().int("orderId is required"),
  amount: z.number().positive("Must be a positive number"),
});

const updateSubsidySchema = z.object({
  stage: z.enum(STAGES, {
    errorMap: () => ({ message: "Stage must be APPLIED, DOCUMENTS_SUBMITTED, APPROVED or RECEIVED" }),
  }).optional(),
  amount: z.number().positive("Must be a positive number").optional(),
  documentLinks: z.array(z.string().url("Enter a valid link")).optional(),
});

// GET /api/subsidies
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  const { stage } = req.query;
  const list = stage ? [sampleSubsidy].filter((s) => s.stage === stage) : [sampleSubsidy];
  return ok(res, list, 200, { page: 1, limit: 10, total: list.length, totalPages: 1 });
});

// POST /api/subsidies
router.post("/", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = createSubsidySchema.parse(req.body);
    return ok(
      res,
      {
        ...sampleSubsidy,
        id: 3,
        stage: "APPLIED",
        amount: body.amount,
        order: { id: body.orderId, lead: sampleSubsidy.order.lead },
        documentLinks: [],
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subsidies/:id
router.patch("/:id", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = updateSubsidySchema.parse(req.body);

    // STUB ONLY: the sample record is already past APPLIED, so this shows the real error
    if (body.stage && STAGES.indexOf(body.stage) < STAGES.indexOf(sampleSubsidy.stage)) {
      return fail(res, 400, "Subsidy stage cannot move backwards");
    }

    return ok(res, { ...sampleSubsidy, id: Number(req.params.id), ...body });
  } catch (err) {
    next(err);
  }
});

module.exports = router;