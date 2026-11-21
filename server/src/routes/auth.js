const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { ok, fail } = require("../utils/response");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/login  (public)
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordOk = user && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !passwordOk) {
      return fail(res, 401, "Incorrect email or password");
    }
    if (!user.active) {
      return fail(res, 403, "This account has been deactivated");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return ok(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (any logged-in user)
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (!user) {
      return fail(res, 404, "User not found");
    }
    return ok(res, user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;