const express = require("express");
const { z } = require("zod");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 6 ----------

const sampleLead = {
  id: 7,
  name: "Rajinder Pal Singh",
  phone: "9876543210",
  email: "rajinder.pal@gmail.com",
  address: "House 214, Model Town Extension",
  city: "Ludhiana",
  source: "WEB",
  status: "NEW",
  systemSizeKw: 3,
  message: "Interested in a 3 kW system under the subsidy scheme.",
  shadowFreeArea: null,
  monthlyBill: null,
  gridSuitable: null,
  assignedTo: { id: 2, name: "Simran Kaur" },
  surveys: [],
  quotes: [],
  createdAt: "2026-11-21T08:30:00.000Z",
};

const createLeadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone number"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  city: z.string().optional(),
  systemSizeKw: z.number().positive("Must be a positive number").optional(),
  message: z.string().optional(),
  source: z.enum(["WEB", "CALL", "WHATSAPP"]).optional(),
});

const callCheckSchema = z.object({
  shadowFreeArea: z.number().positive("Must be a positive number"),
  monthlyBill: z.number().positive("Must be a positive number"),
  gridSuitable: z.boolean(),
});

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "SURVEY_SCHEDULED", "SURVEY_APPROVED", "QUOTED", "ORDERED", "LOST"]).optional(),
  assignedToId: z.number().int().optional(),
});

// POST /api/leads (Public: website enquiry form)
router.post("/", (req, res, next) => {
  try {
    const body = createLeadSchema.parse(req.body);
    return ok(res, { ...sampleLead, ...body, source: body.source || "WEB", status: "NEW" }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/leads
router.get("/", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  const summary = {
    id: sampleLead.id,
    name: sampleLead.name,
    phone: sampleLead.phone,
    city: sampleLead.city,
    source: sampleLead.source,
    status: sampleLead.status,
    systemSizeKw: sampleLead.systemSizeKw,
    assignedTo: sampleLead.assignedTo,
    createdAt: sampleLead.createdAt,
  };
  return ok(res, [summary], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

// GET /api/leads/new-count (must stay above /:id)
router.get("/new-count", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  return ok(res, { count: 1 });
});

// GET /api/leads/:id
router.get("/:id", authenticate, requireRole("SALES", "DIRECTOR"), (req, res) => {
  return ok(res, { ...sampleLead, id: Number(req.params.id) });
});

// PATCH /api/leads/:id/call-check
router.patch("/:id/call-check", authenticate, requireRole("SALES"), (req, res, next) => {
  try {
    const body = callCheckSchema.parse(req.body);
    return ok(res, { ...sampleLead, id: Number(req.params.id), ...body, status: "CONTACTED" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leads/:id
router.patch("/:id", authenticate, requireRole("SALES", "DIRECTOR"), (req, res, next) => {
  try {
    const body = updateLeadSchema.parse(req.body);
    return ok(res, { ...sampleLead, id: Number(req.params.id), ...body });
  } catch (err) {
    next(err);
  }
});

module.exports = router;