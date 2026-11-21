const express = require("express");
const prisma = require("../lib/prisma");
const { ok } = require("../utils/response");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/users/technicians (real data, not a stub)
router.get("/technicians", authenticate, requireRole("SALES", "DIRECTOR"), async (req, res, next) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: "TECHNICIAN", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return ok(res, technicians);
  } catch (err) {
    next(err);
  }
});

module.exports = router;