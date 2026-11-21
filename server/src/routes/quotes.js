const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 9) ----------

const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED"];

const round2 = (n) => Math.round(n * 100) / 100;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const quoteInclude = {
  lead: { select: { id: true, name: true, phone: true, city: true } },
  template: { select: { id: true, name: true } },
  lines: {
    select: { id: true, productId: true, description: true, quantity: true, unitPrice: true, lineTotal: true },
    orderBy: { id: "asc" },
  },
  order: { select: { id: true } },
};

// Prisma returns money as Decimal (text in JSON). Convert to plain numbers.
function toQuote(q) {
  return {
    id: q.id,
    status: q.status,
    totalAmount: Number(q.totalAmount),
    notes: q.notes,
    lead: q.lead,
    template: q.template,
    lines: q.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    })),
    orderId: q.order ? q.order.id : null,
    createdAt: q.createdAt,
  };
}

const createQuoteSchema = z.object({
  leadId: z.number().int("leadId is required"),
  templateId: z.number().int("templateId is required"),
  notes: z.string().trim().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(QUOTE_STATUSES, { message: "Status must be DRAFT, SENT or ACCEPTED" }).optional(),
  leadId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
});

const updateQuoteSchema = z.object({
  lines: z
    .array(
      z.object({
        id: z.number().int("Line id is required"),
        unitPrice: z.number().nonnegative("Price cannot be negative").optional(),
        quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be at least 1").optional(),
      })
    )
    .optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["DRAFT", "SENT"], { message: "Status must be DRAFT or SENT" }).optional(),
});

// POST /api/quotes
router.post("/", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const body = createQuoteSchema.parse(req.body);

    const lead = await prisma.lead.findUnique({ where: { id: body.leadId }, select: { status: true } });
    if (!lead) return fail(res, 404, "Record not found");

    // The survey gate (F5): no approved survey, no quote
    const approved = await prisma.survey.count({ where: { leadId: body.leadId, status: "APPROVED" } });
    if (approved === 0) return fail(res, 403, "Survey not approved yet");

    if (lead.status === "LOST") return fail(res, 400, "This lead is marked lost");
    if (lead.status === "ORDERED") return fail(res, 400, "This lead already has an order");

    const template = await prisma.packageTemplate.findFirst({
      where: { id: body.templateId, active: true },
      select: {
        id: true,
        items: {
          select: { quantity: true, product: { select: { id: true, name: true, unitPrice: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!template) return fail(res, 404, "Package not found");
    if (template.items.length === 0) return fail(res, 400, "This package has no parts list");

    // F6: copy the package's parts into the quote as a snapshot
    const lines = template.items.map((i) => {
      const unitPrice = Number(i.product.unitPrice);
      return {
        productId: i.product.id,
        description: i.product.name,
        quantity: i.quantity,
        unitPrice,
        lineTotal: round2(unitPrice * i.quantity),
      };
    });
    const total = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          leadId: body.leadId,
          templateId: template.id,
          createdById: req.user.id,
          notes: body.notes || null,
          totalAmount: total,
          lines: { create: lines },
        },
        include: quoteInclude,
      });
      // Only move a lead forward. A lead already past this stage keeps its status.
      if (lead.status === "SURVEY_APPROVED") {
        await tx.lead.update({ where: { id: body.leadId }, data: { status: "QUOTED" } });
      }
      return created;
    });

    return ok(res, toQuote(quote), 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, status, leadId, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    if (search) where.lead = { name: { contains: search, mode: "insensitive" } };

    const [total, quotes] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          lead: { select: { id: true, name: true, city: true } },
          template: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = quotes.map((q) => ({ ...q, totalAmount: Number(q.totalAmount) }));
    return ok(res, data, 200, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes/:id
router.get("/:id", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const quote = await prisma.quote.findUnique({ where: { id }, include: quoteInclude });
    if (!quote) return fail(res, 404, "Record not found");

    return ok(res, toQuote(quote));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/quotes/:id (edit prices or quantities, or mark as sent)
router.patch("/:id", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = updateQuoteSchema.parse(req.body);

    const existing = await prisma.quote.findUnique({
      where: { id },
      select: {
        order: { select: { id: true } },
        lines: { select: { id: true, quantity: true, unitPrice: true } },
      },
    });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.order) return fail(res, 400, "This quote already has an order and cannot be edited");

    const byId = new Map(existing.lines.map((l) => [l.id, l]));
    for (const edit of body.lines || []) {
      if (!byId.has(edit.id)) return fail(res, 400, "Quote line not found on this quote");
    }

    const quote = await prisma.$transaction(async (tx) => {
      for (const edit of body.lines || []) {
        const current = byId.get(edit.id);
        const quantity = edit.quantity ?? current.quantity;
        const unitPrice = edit.unitPrice ?? Number(current.unitPrice);
        await tx.quoteLine.update({
          where: { id: edit.id },
          data: { quantity, unitPrice, lineTotal: round2(unitPrice * quantity) },
        });
      }

      // The total is always recalculated from the lines
      const lines = await tx.quoteLine.findMany({ where: { quoteId: id }, select: { lineTotal: true } });
      const total = round2(lines.reduce((sum, l) => sum + Number(l.lineTotal), 0));

      const data = { totalAmount: total };
      if (body.notes !== undefined) data.notes = body.notes || null;
      if (body.status !== undefined) data.status = body.status;

      return tx.quote.update({ where: { id }, data, include: quoteInclude });
    });

    return ok(res, toQuote(quote));
  } catch (err) {
    next(err);
  }
});

module.exports = router;