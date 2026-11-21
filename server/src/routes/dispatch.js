const express = require("express");
const { z } = require("zod");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Steps 10 and 11 ----------

const customer = { name: "Parminder Kaur Dhillon", city: "Mohali" };

const sampleOrder = {
  id: 3,
  status: "CONFIRMED",
  totalAmount: 189500,
  paid: 95000,
  balance: 94500,
  lead: { id: 5, name: "Parminder Kaur Dhillon", city: "Mohali" },
  confirmedAt: "2026-11-21T09:30:00.000Z",
};

const scanSchema = z.object({
  orderId: z.number().int("orderId is required"),
  serial: z.string().min(3, "Serial number is required"),
});

// GET /api/orders/:id/pick-list
router.get("/orders/:id/pick-list", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, {
    orderId: Number(req.params.id),
    customer,
    items: [
      { productId: 4, name: "On-Grid Solar Inverter 3 kW", category: "INVERTER", quantity: 1, scanned: 0 },
      { productId: 8, name: "MPPT Charge Controller 40A", category: "CONTROLLER", quantity: 1, scanned: 0 },
      { productId: 1, name: "Mono PERC Solar Panel 540W", category: "PANEL", quantity: 6, scanned: 0 },
    ],
  });
});

// POST /api/dispatch/scan
router.post("/dispatch/scan", authenticate, requireRole("WAREHOUSE"), (req, res, next) => {
  try {
    const body = scanSchema.parse(req.body);

    // STUB ONLY: this serial does not exist, so the scanner can show the real error
    if (body.serial === "UNKNOWN-000") {
      return fail(res, 404, "Serial number not found");
    }

    return ok(
      res,
      {
        serial: body.serial,
        product: { id: 4, name: "On-Grid Solar Inverter 3 kW", category: "INVERTER" },
        orderId: body.orderId,
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/dispatch
router.post("/orders/:id/dispatch", authenticate, requireRole("WAREHOUSE"), (req, res) => {
  return ok(res, { ...sampleOrder, id: Number(req.params.id), status: "DISPATCHED" });
});

// POST /api/orders/:id/deliver
router.post("/orders/:id/deliver", authenticate, requireRole("WAREHOUSE"), (req, res) => {
  return ok(res, {
    orderId: Number(req.params.id),
    status: "DELIVERED",
    deliveredAt: "2026-11-25T11:00:00.000Z",
    serials: [
      { serial: "INV-3K-2026-00417", product: "On-Grid Solar Inverter 3 kW", warrantyStart: "2026-11-25", warrantyEnd: "2028-11-25" },
      { serial: "PNL-540-2026-01201", product: "Mono PERC Solar Panel 540W", warrantyStart: "2026-11-25", warrantyEnd: "2046-11-25" },
    ],
  });
});

module.exports = router;