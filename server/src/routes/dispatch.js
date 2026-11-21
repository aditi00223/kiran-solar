const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Add whole months to a date (used for warranty end dates)
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

// An error with its own status code, which errorHandler turns into a clean response
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const summarySelect = {
  id: true,
  status: true,
  totalAmount: true,
  confirmedAt: true,
  lead: { select: { id: true, name: true, city: true } },
  payments: { select: { amount: true } },
};

// paid and balance are worked out from the payments, same as in orders.js
function toSummary(o) {
  const total = Number(o.totalAmount);
  const paid = round2(o.payments.reduce((sum, p) => sum + Number(p.amount), 0));
  return {
    id: o.id,
    status: o.status,
    totalAmount: total,
    paid,
    balance: round2(total - paid),
    lead: o.lead,
    confirmedAt: o.confirmedAt,
  };
}
const router = express.Router();


const scanSchema = z.object({
  orderId: z.number().int("orderId is required"),
  serial: z.string().min(3, "Serial number is required"),
});

// GET /api/orders/:id/pick-list
// GET /api/orders/:id/pick-list (real, Step 10a)
router.get("/orders/:id/pick-list", authenticate, requireRole("WAREHOUSE", "DIRECTOR"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        lead: { select: { name: true, phone: true, address: true, city: true } },
        quote: {
          select: {
            lines: {
              select: {
                productId: true,
                quantity: true,
                product: { select: { name: true, sku: true, category: true, requiresSerial: true, stockQty: true } },
              },
              orderBy: { id: "asc" },
            },
          },
        },
        serials: { select: { productId: true } },
      },
    });
    if (!order) return fail(res, 404, "Record not found");

    // Several quote lines can be the same product, so add them up.
    // Services (like installation) are not packed, so they are skipped.
    const byProduct = new Map();
    for (const line of order.quote.lines) {
      if (line.product.category === "SERVICE") continue;
      const item = byProduct.get(line.productId);
      if (item) {
        item.quantity += line.quantity;
      } else {
        byProduct.set(line.productId, {
          productId: line.productId,
          name: line.product.name,
          sku: line.product.sku,
          category: line.product.category,
          quantity: line.quantity,
          requiresSerial: line.product.requiresSerial,
          stockQty: line.product.stockQty,
        });
      }
    }

    const items = [...byProduct.values()].map((item) => {
      const scanned = order.serials.filter((s) => s.productId === item.productId).length;
      const { stockQty, ...rest } = item;
      return { ...rest, scanned, inStock: stockQty >= item.quantity };
    });

    // Ready when the order is not yet dispatched, every serial item is fully
    // scanned, and the warehouse has enough stock of everything.
    const readyToDispatch =
      ["CONFIRMED", "PACKED"].includes(order.status) &&
      items.filter((i) => i.requiresSerial).every((i) => i.scanned >= i.quantity) &&
      items.every((i) => i.inStock);

    return ok(res, {
      orderId: order.id,
      status: order.status,
      customer: order.lead,
      items,
      readyToDispatch,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/dispatch/scan (real, Step 10b)
router.post("/dispatch/scan", authenticate, requireRole("WAREHOUSE"), async (req, res, next) => {
  try {
    const body = scanSchema.parse(req.body);
    const serial = body.serial.trim().toUpperCase();

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: {
        id: true,
        status: true,
        quote: {
          select: {
            lines: {
              select: {
                productId: true,
                quantity: true,
                product: { select: { id: true, name: true, sku: true, category: true, requiresSerial: true } },
              },
            },
          },
        },
        serials: { select: { productId: true } },
      },
    });
    if (!order) return fail(res, 404, "Order not found");
    if (!["CONFIRMED", "PACKED"].includes(order.status)) {
      return fail(res, 400, "This order has already been dispatched");
    }

    const already = await prisma.serialUnit.findUnique({ where: { serial }, select: { id: true } });
    if (already) return fail(res, 409, "This serial number has already been scanned");

    // How many units of each serial-tracked product this order needs
    const required = new Map();
    for (const line of order.quote.lines) {
      if (!line.product.requiresSerial) continue;
      const item = required.get(line.productId);
      if (item) item.quantity += line.quantity;
      else required.set(line.productId, { product: line.product, quantity: line.quantity });
    }

    // Match the serial to an item by SKU prefix. The longest SKU wins.
    const match = [...required.values()]
      .filter((r) => serial.startsWith(`${r.product.sku.toUpperCase()}-`))
      .sort((a, b) => b.product.sku.length - a.product.sku.length)[0];
    if (!match) return fail(res, 400, "This serial number does not match any item on this order");

    const scannedFor = (productId) => order.serials.filter((s) => s.productId === productId).length;
    if (scannedFor(match.product.id) >= match.quantity) {
      return fail(res, 400, `All ${match.quantity} ${match.product.name} units are already scanned`);
    }

    const scanned = scannedFor(match.product.id) + 1;
    const fullyScanned = [...required.values()].every((r) => {
      const count = r.product.id === match.product.id ? scanned : scannedFor(r.product.id);
      return count >= r.quantity;
    });

    await prisma.$transaction(async (tx) => {
      await tx.serialUnit.create({
        data: { serial, productId: match.product.id, orderId: order.id },
      });
      if (fullyScanned && order.status === "CONFIRMED") {
        await tx.order.update({ where: { id: order.id }, data: { status: "PACKED" } });
      }
    });

    return ok(
      res,
      {
        serial,
        product: { id: match.product.id, name: match.product.name, category: match.product.category },
        orderId: order.id,
        scanned,
        required: match.quantity,
        orderFullyScanned: fullyScanned,
      },
      201
    );
  } catch (err) {
    next(err);
  }
});
// POST /api/orders/:id/dispatch (real, Step 10c)
router.post("/orders/:id/dispatch", authenticate, requireRole("WAREHOUSE"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        quote: {
          select: {
            lines: {
              select: {
                productId: true,
                quantity: true,
                product: { select: { name: true, category: true, requiresSerial: true } },
              },
            },
          },
        },
        serials: { select: { productId: true } },
      },
    });
    if (!order) return fail(res, 404, "Record not found");
    if (!["CONFIRMED", "PACKED"].includes(order.status)) {
      return fail(res, 400, "This order has already been dispatched");
    }

    // What the order needs, per product. Services are not packed, so they are skipped.
    const needs = new Map();
    for (const line of order.quote.lines) {
      if (line.product.category === "SERVICE") continue;
      const n = needs.get(line.productId);
      if (n) n.quantity += line.quantity;
      else needs.set(line.productId, { name: line.product.name, requiresSerial: line.product.requiresSerial, quantity: line.quantity });
    }

    // Every serial-tracked item must be fully scanned
    const missing = [];
    for (const [productId, n] of needs) {
      if (!n.requiresSerial) continue;
      const scanned = order.serials.filter((s) => s.productId === productId).length;
      if (scanned < n.quantity) missing.push(`${n.name} (${scanned} of ${n.quantity})`);
    }
    if (missing.length > 0) {
      return fail(res, 400, `Scan all serial numbers first: ${missing.join(", ")}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Only one request can move the order to DISPATCHED, so stock is never reduced twice
      const moved = await tx.order.updateMany({
        where: { id, status: { in: ["CONFIRMED", "PACKED"] } },
        data: { status: "DISPATCHED" },
      });
      if (moved.count === 0) throw httpError(400, "This order has already been dispatched");

      // Reduce stock, but only if there is enough. If any item is short, everything rolls back.
      for (const [productId, n] of needs) {
        const result = await tx.product.updateMany({
          where: { id: productId, stockQty: { gte: n.quantity } },
          data: { stockQty: { decrement: n.quantity } },
        });
        if (result.count === 0) throw httpError(400, `Not enough stock for ${n.name}`);
      }

      // Stock history: negative quantity means stock went out
      await tx.stockMovement.createMany({
        data: [...needs.entries()].map(([productId, n]) => ({
          productId,
          type: "DISPATCH",
          quantity: -n.quantity,
          orderId: id,
          note: `Dispatched for order ${id}`,
        })),
      });

      return tx.order.findUnique({ where: { id }, select: summarySelect });
    });

    return ok(res, toSummary(updated));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/deliver (real, Step 11)
router.post("/orders/:id/deliver", authenticate, requireRole("WAREHOUSE"), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 404, "Record not found");

    const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) return fail(res, 404, "Record not found");
    if (["DELIVERED", "INSTALLED"].includes(order.status)) {
      return fail(res, 400, "This order has already been delivered");
    }
    if (order.status !== "DISPATCHED") {
      return fail(res, 400, "Dispatch the order first");
    }

    const deliveredAt = new Date();

    const serials = await prisma.$transaction(async (tx) => {
      // Only one request can move the order to DELIVERED
      const moved = await tx.order.updateMany({
        where: { id, status: "DISPATCHED" },
        data: { status: "DELIVERED", deliveredAt },
      });
      if (moved.count === 0) throw httpError(400, "This order has already been delivered");

      // The warranty clock starts on delivery, for every serial number
      const units = await tx.serialUnit.findMany({
        where: { orderId: id },
        select: { id: true, serial: true, product: { select: { name: true, warrantyMonths: true } } },
        orderBy: { id: "asc" },
      });

      const result = [];
      for (const u of units) {
        const warrantyEnd = addMonths(deliveredAt, u.product.warrantyMonths);
        await tx.serialUnit.update({
          where: { id: u.id },
          data: { warrantyStart: deliveredAt, warrantyEnd },
        });
        result.push({
          serial: u.serial,
          product: u.product.name,
          warrantyStart: deliveredAt,
          warrantyEnd,
        });
      }
      return result;
    });

    return ok(res, { orderId: id, status: "DELIVERED", deliveredAt, serials });
  } catch (err) {
    next(err);
  }
});

module.exports = router;