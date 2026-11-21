const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 15) ----------

const STAGES = ["APPLIED", "DOCUMENTS_SUBMITTED", "APPROVED", "RECEIVED"];
const STAGE_DATE_FIELD = {
  DOCUMENTS_SUBMITTED: "submittedAt",
  APPROVED: "approvedAt",
  RECEIVED: "receivedAt",
};

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const subsidySelect = {
  id: true,
  stage: true,
  amount: true,
  documentLinks: true,
  appliedAt: true,
  submittedAt: true,
  approvedAt: true,
  receivedAt: true,
  updatedAt: true,
  order: { select: { id: true, lead: { select: { id: true, name: true, city: true } } } },
};

const dateOnly = (d) => (d ? d.toISOString().slice(0, 10) : null);

// Prisma returns money as Decimal (text in JSON). Convert to a plain number.
function toSubsidy(s) {
  return {
    id: s.id,
    stage: s.stage,
    amount: Number(s.amount),
    order: s.order,
    documentLinks: s.documentLinks,
    appliedOn: dateOnly(s.appliedAt),
    submittedOn: dateOnly(s.submittedAt),
    approvedOn: dateOnly(s.approvedAt),
    receivedOn: dateOnly(s.receivedAt),
    updatedAt: s.updatedAt,
  };
}

const money = z
  .number()
  .positive("Must be a positive number")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimal places");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  stage: z
    .enum(STAGES, { message: "Stage must be APPLIED, DOCUMENTS_SUBMITTED, APPROVED or RECEIVED" })
    .optional(),
  search: z.string().trim().optional(),
});

const createSubsidySchema = z.object({
  orderId: z.number().int("orderId is required"),
  amount: money,
});

const updateSubsidySchema = z
  .object({
    stage: z
      .enum(STAGES, { message: "Stage must be APPLIED, DOCUMENTS_SUBMITTED, APPROVED or RECEIVED" })
      .optional(),
    amount: money.optional(),
    documentLinks: z.array(z.string().trim().url("Enter a valid link")).optional(),
  })
  .refine((v) => v.stage !== undefined || v.amount !== undefined || v.documentLinks !== undefined, {
    message: "Send stage, amount or documentLinks",
    path: ["stage"],
  });

// GET /api/subsidies
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, stage, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (stage) where.stage = stage;
    if (search) where.order = { lead: { name: { contains: search, mode: "insensitive" } } };

    const [total, rows] = await Promise.all([
      prisma.subsidy.count({ where }),
      prisma.subsidy.findMany({
        where,
        select: subsidySelect,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, rows.map(toSubsidy), 200, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/subsidies (start a subsidy record for an order)
router.post("/", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const body = createSubsidySchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: { id: true, subsidy: { select: { id: true } } },
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.subsidy) return fail(res, 400, "This order already has a subsidy record");

    const subsidy = await prisma.subsidy.create({
      data: { orderId: body.orderId, amount: body.amount },
      select: subsidySelect,
    });

    return ok(res, toSubsidy(subsidy), 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subsidies/:id (next stage, new amount, or more document links)
router.patch("/:id", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = updateSubsidySchema.parse(req.body);

    const existing = await prisma.subsidy.findUnique({
      where: { id },
      select: { stage: true, documentLinks: true },
    });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.stage === "RECEIVED") {
      return fail(res, 400, "This subsidy has already been received and cannot be changed");
    }

    const data = {};

    // New links are added to the existing ones, without duplicates
    const links = [...new Set([...existing.documentLinks, ...(body.documentLinks || [])])];
    if (body.documentLinks !== undefined) data.documentLinks = links;
    if (body.amount !== undefined) data.amount = body.amount;

    if (body.stage !== undefined) {
      const current = STAGES.indexOf(existing.stage);
      const target = STAGES.indexOf(body.stage);

      if (target < current) return fail(res, 400, "Subsidy stage cannot move backwards");
      if (target > current + 1) {
        return fail(res, 400, `Subsidy stage must move one step at a time (next is ${STAGES[current + 1]})`);
      }
      if (target > current) {
        if (body.stage === "DOCUMENTS_SUBMITTED" && links.length === 0) {
          return fail(res, 400, "Add at least one document link before submitting documents");
        }
        data.stage = body.stage;
        data[STAGE_DATE_FIELD[body.stage]] = new Date();
      }
    }

    const subsidy = await prisma.subsidy.update({ where: { id }, data, select: subsidySelect });
    return ok(res, toSubsidy(subsidy));
  } catch (err) {
    next(err);
  }
});

module.exports = router;