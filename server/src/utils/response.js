// Success: { data, error: null, meta? }
function ok(res, data, status = 200, meta) {
  const body = { data, error: null };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

// Failure: { data: null, error: "clear message" }
function fail(res, status, message) {
  return res.status(status).json({ data: null, error: message });
}

module.exports = { ok, fail };