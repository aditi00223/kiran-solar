const express = require("express");
const { z } = require("zod");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 14 ----------

const stockList = [
  { productId: 4, name: "On-Grid Solar Inverter 3 kW", category: "INVERTER", inStock: 9, lowStockLevel: 5, isLow: false },
  { productId: 1, name: "Mono PERC Solar Panel 540W", category: "PANEL", inStock: 8, lowStockLevel: 20, isLow: true },
  { productId: 8, name: "MPPT Charge Controller 40A", category: "CONTROLLER", inStock: 12, lowStockLevel: 6, isLow: false },
];

const movements = [
  { id: 12, productId: 4, name: "On-Grid Solar Inverter 3 kW", type: "PURCHASE", quantity: 10, createdAt: "2026-11-18T10:00:00.000Z" },
  { id: 13, productId: 4, name: "On-Grid Solar Inverter 3 kW", type: "DISPATCH", quantity: -1, orderId: 3, createdAt: "2026-11-25T08:30:00.000Z" },
];

const suppliers = [
  { id: 1, name: "Punjab Solar Traders", city: "Ludhiana" },
  { id: 2, name: "Jalandhar Power Systems", city: "Jalandhar" },
];

const samplePurchase = {
  id: 8,
  supplier: { id: 1, name: "Punjab Solar Traders" },
  productId: 4,
  quantity: 10,
  unitCost: 31000,
  totalCost: 310000,
  createdAt: "2026-11-21T10:00:00.000Z",
};

const purchaseSchema = z.object({
  supplierId: z.number().int("supplierId is required"),
  productId: z.number().int("productId is required"),
  quantity: z.number().int().min(1, "Must be at least 1"),
  unitCost: z.number().positive("Must be a positive number"),
});

// GET /api/stock
router.get("/stock", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  const { search, category } = req.query;
  let list = stockList;
  if (category) list = list.filter((s) => s.category === category);
  if (search) list = list.filter((s) => s.name.toLowerCase().includes(String(search).toLowerCase()));
  return ok(res, list);
});

// GET /api/stock/low (must stay above any /stock/:id route)
router.get("/stock/low", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, stockList.filter((s) => s.isLow));
});

// GET /api/stock/movements
router.get("/stock/movements", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, movements, 200, { page: 1, limit: 10, total: movements.length, totalPages: 1 });
});

// GET /api/suppliers
router.get("/suppliers", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, suppliers);
});

// POST /api/purchases
router.post("/purchases", authenticate, requireRole("WAREHOUSE"), (req, res, next) => {
  try {
    const body = purchaseSchema.parse(req.body);
    return ok(
      res,
      { ...samplePurchase, ...body, totalCost: body.quantity * body.unitCost },
      201
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases
router.get("/purchases", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), (req, res) => {
  return ok(res, [samplePurchase], 200, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

module.exports = router;