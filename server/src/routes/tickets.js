const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 13) ----------

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "FIXED_PENDING_CONFIRMATION", "CLOSED"];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// IN while today is on or before the warranty end date, otherwise OUT
function warrantyStatus(warrantyEnd) {
  return warrantyEnd && warrantyEnd >= new Date() ? "IN" : "OUT";
}

const ticketSelect = {
  id: true,
  status: true,
  description: true,
  underWarranty: true,
  resolution: true,
  customerConfirmed: true,
  createdAt: true,
  closedAt: true,
  lead: { select: { id: true, name: true, phone: true } },
  serialUnit: { select: { serial: true } },
  invoices: {
    where: { type: "SERVICE" },
    select: { id: true, invoiceNumber: true, partsAmount: true, labourAmount: true, totalAmount: true, paid: true },
    orderBy: { id: "desc" },
    take: 1,
  },
};

// Prisma returns money as Decimal (text in JSON). Convert to plain numbers.
function toInvoice(inv) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    partsAmount: Number(inv.partsAmount),
    labourAmount: Number(inv.labourAmount),
    amount: Number(inv.totalAmount),
    status: inv.paid ? "PAID" : "UNPAID",
  };
}

// The database names differ from the API names, so translate here.
function toSummary(t) {
  return {
    id: t.id,
    status: t.status,
    issue: t.description,
    warrantyStatus: t.underWarranty ? "IN" : "OUT",
    customer: t.lead,
    serial: t.serialUnit ? t.serialUnit.serial : null,
    createdAt: t.createdAt,
  };
}

function toDetail(t) {
  return {
    ...toSummary(t),
    resolution: t.resolution,
    customerConfirmed: t.customerConfirmed,
    closedAt: t.closedAt,
    invoice: t.invoices[0] ? toInvoice(t.invoices[0]) : null,
  };
}

const searchQuerySchema = z.object({
  q: z
    .string({ message: "Enter a serial number or phone number" })
    .trim()
    .min(3, "Enter at least 3 characters of a serial or phone number"),
});

const createTicketSchema = z.object({
  serial: z.string().trim().min(3, "Serial number is required"),
  issue: z.string().trim().min(5, "Describe the problem"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum(TICKET_STATUSES, { message: "Status must be OPEN, IN_PROGRESS, FIXED_PENDING_CONFIRMATION or CLOSED" })
    .optional(),
  search: z.string().trim().optional(),
});

// GET /api/serials/search?q= (real, Step 13a)
router.get("/serials/search", authenticate, requireRole("SUPPORT", "DIRECTOR"), async (req, res, next) => {
  try {
    const { q } = searchQuerySchema.parse(req.query);

    // Only delivered units can have a ticket, and only they have warranty dates
    const units = await prisma.serialUnit.findMany({
      where: {
        warrantyEnd: { not: null },
        OR: [
          { serial: { contains: q, mode: "insensitive" } },
          { order: { lead: { phone: { contains: q } } } },
        ],
      },
      select: {
        serial: true,
        warrantyStart: true,
        warrantyEnd: true,
        product: { select: { id: true, name: true, category: true } },
        order: { select: { lead: { select: { id: true, name: true, phone: true, city: true } } } },
      },
      orderBy: { id: "desc" },
      take: 20,
    });

    return ok(
      res,
      units.map((u) => ({
        serial: u.serial,
        product: u.product,
        customer: u.order.lead,
        warrantyStart: u.warrantyStart,
        warrantyEnd: u.warrantyEnd,
        warrantyStatus: warrantyStatus(u.warrantyEnd),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets (real, Step 13a)
router.post("/tickets", authenticate, requireRole("SUPPORT"), async (req, res, next) => {
  try {
    const body = createTicketSchema.parse(req.body);
    const serial = body.serial.toUpperCase();

    const unit = await prisma.serialUnit.findUnique({
      where: { serial },
      select: { id: true, warrantyEnd: true, order: { select: { leadId: true } } },
    });
    if (!unit) return fail(res, 404, "Serial number not found");
    if (!unit.warrantyEnd) return fail(res, 400, "This unit has not been delivered yet");

    const open = await prisma.ticket.findFirst({
      where: { serialUnitId: unit.id, status: { not: "CLOSED" } },
      select: { id: true },
    });
    if (open) return fail(res, 400, `This unit already has an open ticket (#${open.id})`);

    // Warranty is checked when the customer calls, and kept on the ticket
    const ticket = await prisma.ticket.create({
      data: {
        leadId: unit.order.leadId,
        serialUnitId: unit.id,
        description: body.issue,
        underWarranty: warrantyStatus(unit.warrantyEnd) === "IN",
      },
      select: ticketSelect,
    });

    return ok(res, toDetail(ticket), 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets (real, Step 13a)
router.get("/tickets", authenticate, requireRole("SUPPORT", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, status, search } = listQuerySchema.parse(req.query);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { lead: { name: { contains: search, mode: "insensitive" } } },
        { lead: { phone: { contains: search } } },
        { serialUnit: { serial: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        select: ticketSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, tickets.map(toSummary), 200, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id (real, Step 13a)
router.get("/tickets/:id", authenticate, requireRole("SUPPORT", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const ticket = await prisma.ticket.findUnique({ where: { id }, select: ticketSelect });
    if (!ticket) return fail(res, 404, "Record not found");

    return ok(res, toDetail(ticket));
  } catch (err) {
    next(err);
  }
});

// ---------- Step 13b: repair, automatic invoice, close ----------

const round2 = (n) => Math.round(n * 100) / 100;

const repairSchema = z.object({
  partsCost: z.number().nonnegative("Parts cost cannot be negative").default(0),
  labourCost: z.number().nonnegative("Labour cost cannot be negative").default(0),
  notes: z.string().trim().optional(),
});

const closeSchema = z.object({
  customerConfirmed: z.literal(true, { message: "Customer has not confirmed the fix yet" }),
});

// PATCH /api/tickets/:id/repair
router.patch("/tickets/:id/repair", authenticate, requireRole("SUPPORT"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const body = repairSchema.parse(req.body);

    const existing = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true, underWarranty: true, serialUnit: { select: { orderId: true } } },
    });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.status === "FIXED_PENDING_CONFIRMATION") {
      return fail(res, 400, "This ticket has already been repaired");
    }
    if (existing.status === "CLOSED") return fail(res, 400, "This ticket is already closed");

    const parts = round2(body.partsCost);
    const labour = round2(body.labourCost);
    const total = round2(parts + labour);

    if (!existing.underWarranty && total <= 0) {
      return fail(res, 400, "Enter the parts or labour cost to bill");
    }

    const ticket = await prisma.$transaction(async (tx) => {
      // Out of warranty: bill the customer automatically. In warranty: no invoice.
      if (!existing.underWarranty) {
        const last = await tx.invoice.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
        const number = `SRV-${new Date().getFullYear()}-${String((last ? last.id : 0) + 1).padStart(4, "0")}`;
        await tx.invoice.create({
          data: {
            invoiceNumber: number,
            type: "SERVICE",
            orderId: existing.serialUnit ? existing.serialUnit.orderId : null,
            ticketId: id,
            partsAmount: parts,
            labourAmount: labour,
            totalAmount: total,
          },
        });
      }
      return tx.ticket.update({
        where: { id },
        data: { status: "FIXED_PENDING_CONFIRMATION", resolution: body.notes || null },
        select: ticketSelect,
      });
    });

    return ok(res, toDetail(ticket));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/close (only after the customer confirms the fix)
router.patch("/tickets/:id/close", authenticate, requireRole("SUPPORT"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    closeSchema.parse(req.body);

    const existing = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return fail(res, 404, "Record not found");
    if (existing.status === "CLOSED") return fail(res, 400, "This ticket is already closed");
    if (existing.status !== "FIXED_PENDING_CONFIRMATION") {
      return fail(res, 400, "Ticket has not been repaired yet");
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status: "CLOSED", customerConfirmed: true, closedAt: new Date() },
      select: ticketSelect,
    });

    return ok(res, toDetail(ticket));
  } catch (err) {
    next(err);
  }
});

module.exports = router;