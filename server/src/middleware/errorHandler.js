const { ZodError } = require("zod");
const { fail } = require("../utils/response");

// Runs when no route matches the request
function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// Runs when any route throws an error
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const msg = err.issues
      .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    return fail(res, 400, msg);
  }
  if (err.code === "P2002") {
    return fail(res, 409, "This record already exists (duplicate value)");
  }
  if (err.code === "P2025") {
    return fail(res, 404, "Record not found");
  }
  if (err.status) {
    return fail(res, err.status, err.message);
  }
  console.error(err);
  return fail(res, 500, "Something went wrong on the server");
}

module.exports = { notFound, errorHandler };