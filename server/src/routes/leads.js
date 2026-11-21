const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, optionalAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 6) ----------

const LEAD_STATUSES = ["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED", "ORDERED", "LOST"];
const LEAD_SOURCES = ["WEB", "CALL", "WHATSAPP"];
// A lead is "open" until it is ordered or lost. Used to balance the sales team's workload.
const OPEN_STATUSES = ["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED"];

const assignedToSelect = { select: { id: true, name: true } };

const summarySelect = {
  id: true,
  name: true,
  phone: true,
  city: true,
  source: true,
  status: true,
  systemSizeKw: true,
  assignedTo: assignedToSelect,
  createdAt: true,
};

const detailSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  source: true,
  status: true,
  systemSizeKw: true,
  message: true,
  shadowFreeArea: true,
  monthlyBill: true,
  gridSuitable: true,
  assignedTo: assignedToSelect,
  surveys: {
    select: { id: true, status: true, roofDirection: true, tiltAngle: true, cableDistance: true },
    orderBy: { createdAt: "desc" },
  },
  quotes: {
    select: { id: true, status: true, totalAmount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  },
  createdAt: true,
};

// Prisma returns money as Decimal (text in JSON). Convert to a plain number.
function toDetail(lead) {
  return { ...lead, quotes: lead.quotes.map((q) => ({ ...q, totalAmount: Number(q.totalAmount) })) };
}

// Returns a valid id, or null if the URL part is not a whole number.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// New web enquiries go to the active salesperson with the fewest open leads.
async function pickSalesperson() {
  const people = await prisma.user.findMany({
    where: { role: "SALES", active: true },
    select: {
      id: true,
      _count: { select: { leads: { where: { status: { in: OPEN_STATUSES } } } } },
    },
  });
  if (people.length === 0) return null;
  people.sort((a, b) => a._count.leads - b._count.leads || a.id - b.id);
  return people[0].id;
}

const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Address is required"),
  city: z.string().trim().optional(),
  systemSizeKw: z.number().positive("Must be a positive number").optional(),
  message: z.string().trim().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
});

const callCheckSchema = z.object({
  shadowFreeArea: z.number().positive("Must be a positive number"),
  monthlyBill: z.number().int("Enter the bill in whole rupees").positive("Must be a positive number"),
  gridSuitable: z.boolean(),
});

const updateLeadSchema = z
  .object({
        status: z.literal("LOST", { message: "Status can only be changed to LOST here" }).optional(),
    assignedToId: z.number().int("assignedToId must be a whole number").optional(),
  })
  .refine((v) => v.status !== undefined || v.assignedToId !== undefined, {
    message: "Send status or assignedToId",
    path: ["status"],
  });

// POST /api/leads (Public: website enquiry form; call/WhatsApp entries need a login)
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const body = createLeadSchema.parse(req.body);
    const source = body.source || "WEB";

    if (source !== "WEB") {
      if (!req.user) {
        return fail(res, 401, "Please log in to enter a call or WhatsApp lead");
      }
      if (!["SALES", "DIRECTOR"].includes(req.user.role)) {
        return fail(res, 403, `Your role (${req.user.role}) is not allowed to do this`);
      }
    }

    // A salesperson entering a lead by hand owns it; web leads are balanced across the team.
    const assignedToId =
      source !== "WEB" && req.user.role === "SALES" ? req.user.id : await pickSalesperson();

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        address: body.address,
        city: body.city || null,
        systemSizeKw: body.systemSizeKw ?? null,
        message: body.message || null,
        source,
        assignedToId,
      },
      select: summarySelect,
    });

    return ok(res, lead, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/leads
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, search, status, source } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        select: summarySelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, leads, 200, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/leads/new-count (must stay above /:id)
router.get("/new-count", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const count = await prisma.lead.count({ where: { status: "NEW" } });
    return ok(res, { count });
  } catch (err) {
    next(err);
  }
});

// GET /api/leads/:id
router.get("/:id", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const lead = await prisma.lead.findUnique({ where: { id }, select: detailSelect });
    if (!lead) return fail(res, 404, "Record not found");

    return ok(res, toDetail(lead));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leads/:id/call-check
router.patch("/:id/call-check", authenticate, requireRole("SALES"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = callCheckSchema.parse(req.body);

    const existing = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return fail(res, 404, "Record not found");

    // Only a brand-new lead becomes CONTACTED. A lead further along keeps its status.
    const lead = await prisma.lead.update({
      where: { id },
      data: { ...body, status: existing.status === "NEW" ? "CONTACTED" : existing.status },
      select: detailSelect,
    });

    return ok(res, toDetail(lead));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leads/:id (change owner or mark lost; leads are never deleted)
router.patch("/:id", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = updateLeadSchema.parse(req.body);

    const existing = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return fail(res, 404, "Record not found");

    if (body.status === "LOST" && existing.status === "ORDERED") {
      return fail(res, 400, "An ordered lead cannot be marked lost");
    }

    if (body.assignedToId !== undefined) {
      const salesperson = await prisma.user.findFirst({
        where: { id: body.assignedToId, role: "SALES", active: true },
        select: { id: true },
      });
      if (!salesperson) return fail(res, 400, "Selected salesperson was not found");
    }

    const data = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId;

    const lead = await prisma.lead.update({ where: { id }, data, select: detailSelect });
    return ok(res, toDetail(lead));
  } catch (err) {
    next(err);
  }
});

module.exports = router;