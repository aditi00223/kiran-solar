const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---------- Real database logic (Step 14) ----------

const CATEGORIES = ["PANEL", "INVERTER", "BATTERY", "CONTROLLER", "STAND", "WIRING", "EARTHING", "SWITCH", "SERVICE", "OTHER"];

const round2 = (n) => Math.round(n * 100) / 100;

const stockSelect = {
  id: true,
  name: true,
  category: true,
  stockQty: true,
  lowStockLevel: true,
};

function toStock(p) {
  return {
    productId: p.id,
    name: p.name,
    category: p.category,
    inStock: p.stockQty,
    lowStockLevel: p.lowStockLevel,
    isLow: p.stockQty < p.lowStockLevel,
  };
}

function toPurchase(p) {
  return {
    id: p.id,
    supplier: p.supplier,
    productId: p.productId,
    name: p.product.name,
    quantity: p.quantity,
    unitCost: Number(p.unitCost),
    totalCost: Number(p.totalCost),
    createdAt: p.purchasedAt,
  };
}

const purchaseSelect = {
  id: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  purchasedAt: true,
  productId: true,
  supplier: { select: { id: true, name: true } },
  product: { select: { name: true } },
};

const stockQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.enum(CATEGORIES, { message: "Unknown product category" }).optional(),
});

const movementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  productId: z.coerce.number().int().positive().optional(),
});

const purchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  supplierId: z.coerce.number().int().positive().optional(),
});

const purchaseSchema = z.object({
  supplierId: z.number().int("supplierId is required"),
  productId: z.number().int("productId is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Must be at least 1")
    .max(100000, "Quantity is too large"),
  unitCost: z
    .number()
    .positive("Must be a positive number")
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most 2 decimal places"),
});

async function activeProducts(query) {
  const where = { active: true };
  if (query.category) where.category = query.category;
  if (query.search) where.name = { contains: query.search, mode: "insensitive" };
  return prisma.product.findMany({ where, select: stockSelect, orderBy: { name: "asc" } });
}

// GET /api/stock
router.get("/stock", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const query = stockQuerySchema.parse(req.query);
    const products = await activeProducts(query);
    return ok(res, products.map(toStock));
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/low
router.get("/stock/low", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const products = await activeProducts({});
    return ok(res, products.map(toStock).filter((s) => s.isLow));
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/movements
router.get("/stock/movements", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, productId } = movementsQuerySchema.parse(req.query);
    const where = productId ? { productId } : {};

    const [total, rows] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        select: {
          id: true,
          productId: true,
          type: true,
          quantity: true,
          orderId: true,
          createdAt: true,
          product: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      name: m.product.name,
      type: m.type,
      quantity: m.quantity,
      orderId: m.orderId,
      createdAt: m.createdAt,
    }));

    return ok(res, data, 200, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/suppliers
router.get("/suppliers", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
    return ok(res, suppliers);
  } catch (err) {
    next(err);
  }
});

// POST /api/purchases (stock goes up, history row is written, all in one transaction)
router.post("/purchases", authenticate, requireRole("WAREHOUSE"), async (req, res, next) => {
  try {
    const body = purchaseSchema.parse(req.body);

    const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId }, select: { id: true } });
    if (!supplier) return fail(res, 404, "Supplier not found");

    const product = await prisma.product.findFirst({ where: { id: body.productId, active: true }, select: { id: true } });
    if (!product) return fail(res, 404, "Product not found");

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          supplierId: body.supplierId,
          productId: body.productId,
          quantity: body.quantity,
          unitCost: body.unitCost,
          totalCost: round2(body.quantity * body.unitCost),
        },
        select: purchaseSelect,
      });
      await tx.product.update({
        where: { id: body.productId },
        data: { stockQty: { increment: body.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: body.productId,
          type: "PURCHASE",
          quantity: body.quantity,
          note: `Purchase #${created.id}`,
        },
      });
      return created;
    });

    return ok(res, toPurchase(purchase), 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases
router.get("/purchases", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const { page, limit, supplierId } = purchasesQuerySchema.parse(req.query);
    const where = supplierId ? { supplierId } : {};

    const [total, rows] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        select: purchaseSelect,
        orderBy: { purchasedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok(res, rows.map(toPurchase), 200, {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;