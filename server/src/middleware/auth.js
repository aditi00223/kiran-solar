const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

// Step 1: is the person logged in? Reads the token from the
// "Authorization: Bearer <token>" header.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return fail(res, 401, "Please log in first");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch (err) {
    return fail(res, 401, "Your session has expired, please log in again");
  }
}

// Step 2: does this role have permission? Use it after authenticate.
// Example: router.get("/leads", authenticate, requireRole("SALES", "DIRECTOR"), ...)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, "Please log in first");
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(
        res,
        403,
        `Your role (${req.user.role}) is not allowed to do this`
      );
    }
    next();
  };
}

module.exports = { authenticate, requireRole };