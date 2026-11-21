const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");

const router = express.Router();

// ---------- Real database logic (Step 8) ----------

const PACKAGE_TYPES = ["ON_GRID", "OFF_GRID", "PANEL_SET", "INSTALLATION"];

const listQuerySchema = z.object({
  type: z
    .enum(PACKAGE_TYPES, {
      message: "Type must be ON_GRID, OFF_GRID, PANEL_SET or INSTALLATION",
    })
    .optional(),
});

const itemsInclude = {
  items: {
    select: {
      quantity: true,
      product: {
        select: { id: true, name: true, category: true, unitPrice: true, warrantyMonths: true },
      },
    },
    orderBy: { id: "asc" },
  },
};

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Longest warranty (in whole years) among the package's parts of one category.
function warrantyYears(items, category) {
  const months = items
    .filter((i) => i.product.category === category)
    .map((i) => i.product.warrantyMonths);
  return months.length ? Math.round(Math.max(...months) / 12) : 0;
}

function toSummary(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    type: pkg.type,
    capacityKw: pkg.capacityKw,
    price: Number(pkg.price),
    description: pkg.description,
    warranty: {
      panelsYears: warrantyYears(pkg.items, "PANEL"),
      inverterYears: warrantyYears(pkg.items, "INVERTER"),
    },
  };
}

// GET /api/packages (Public)
router.get("/", async (req, res, next) => {
  try {
    const { type } = listQuerySchema.parse(req.query);

    const packages = await prisma.packageTemplate.findMany({
      where: { active: true, ...(type ? { type } : {}) },
      include: itemsInclude,
      orderBy: [{ type: "asc" }, { capacityKw: "asc" }, { id: "asc" }],
    });

    return ok(res, packages.map(toSummary));
  } catch (err) {
    next(err);
  }
});

// GET /api/packages/:id (Public: package with its parts list)
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const pkg = await prisma.packageTemplate.findFirst({
      where: { id, active: true },
      include: itemsInclude,
    });
    if (!pkg) return fail(res, 404, "Record not found");

    return ok(res, {
      ...toSummary(pkg),
      items: pkg.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        category: i.product.category,
        quantity: i.quantity,
        unitPrice: Number(i.product.unitPrice),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;