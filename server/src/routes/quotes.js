const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 9 ----------

const sampleQuote = {
  id: 4,
  status: "DRAFT",
  totalAmount: 189500,
  notes: "Includes net-metering paperwork.",
  lead: { id: 5, name: "Parminder Kaur Dhillon", phone: "9988776655", city: "Mohali" },
  template: { id: 3, name: "3 kW On-Grid System" },
  lines: [
    { id: 21, productId: 1, description: "Mono PERC Solar Panel 540W", quantity: 6, unitPrice: 14500, lineTotal: 87000 },
    { id: 22, productId: 4, description: "On-Grid Solar Inverter 3 kW", quantity: 1, unitPrice: 38000, lineTotal: 38000 },
    { id: 23, productId: 8, description: "MPPT Charge Controller 40A", quantity: 1, unitPrice: 4800, lineTotal: 4800 },
    { id: 24, productId: 10, description: "GI Panel Mounting Stand (per panel)", quantity: 6, unitPrice: 2200, lineTotal: 13200 },
  ],
  createdAt: "2026-11-21T09:00:00.000Z",
};

const createQuoteSchema = z.object({
  leadId: z.number().int("leadId is required"),
  templateId: z.number().int("templateId is required"),
  notes: z.string().optional(),
});

const updateQuoteSchema = z.object({
  lines: z
    .array(
      z.object({
        id: z.number().int(),
        unitPrice: z.number().nonnegative("Price cannot be negative").optional(),
        quantity: z.number().int().positive("Quantity must be at least 1").optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "SENT"]).optional(),
});

// POST /api/quotes
router.post("/", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const body = createQuoteSchema.parse(req.body);

    // The survey gate (F5): no approved survey, no quote
    const lead = await prisma.lead.findUnique({ where: { id: body.leadId }, select: { id: true } });
    if (!lead) return fail(res, 404, "Record not found");

    const approved = await prisma.survey.count({ where: { leadId: body.leadId, status: "APPROVED" } });
    if (approved === 0) return fail(res, 403, "Survey not approved yet");

    // Still a stub below: the real quote is saved in Step 9
    return ok(res, { ...sampleQuote, notes: body.notes || null }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  const { lines, notes, ...summary } = sampleQuote;
  return ok(res, [summary], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/quotes/:id
router.get("/:id", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  return ok(res, { ...sampleQuote, id: Number(req.params.id) });
});

// PATCH /api/quotes/:id
router.patch("/:id", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = updateQuoteSchema.parse(req.body);
    return ok(res, { ...sampleQuote, id: Number(req.params.id), notes: body.notes ?? sampleQuote.notes, status: body.status || sampleQuote.status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;