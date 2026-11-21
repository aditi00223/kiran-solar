const express = require("express");
const { ok, fail } = require("../utils/response");

const router = express.Router();

// ---------- STUB: fake data, replaced with real database logic in Step 8 ----------

const packages = [
  {
    id: 3, name: "3 kW On-Grid System", type: "ON_GRID", capacityKw: 3, price: 189500,
    description: "Grid-connected rooftop system, 3 kW. Cuts your electricity bill and is subsidy-ready.",
    warranty: { panelsYears: 20, inverterYears: 2 },
  },
  {
    id: 8, name: "3 kW Off-Grid System", type: "OFF_GRID", capacityKw: 3, price: 221500,
    description: "Off-grid system, 3 kW, with battery backup for power cuts.",
    warranty: { panelsYears: 20, inverterYears: 2 },
  },
  {
    id: 11, name: "Solar Panel Set", type: "PANEL_SET", capacityKw: null, price: 61500,
    description: "Hardware only: 4 solar panels with connectors and wires.",
    warranty: { panelsYears: 20, inverterYears: 0 },
  },
  {
    id: 12, name: "Installation Service", type: "INSTALLATION", capacityKw: null, price: 12000,
    description: "Fitting and testing by our crew at your site.",
    warranty: { panelsYears: 0, inverterYears: 0 },
  },
];

const items = [
  { productId: 1, name: "Mono PERC Solar Panel 540W", category: "PANEL", quantity: 6, unitPrice: 14500 },
  { productId: 4, name: "On-Grid Solar Inverter 3 kW", category: "INVERTER", quantity: 1, unitPrice: 38000 },
  { productId: 8, name: "MPPT Charge Controller 40A", category: "CONTROLLER", quantity: 1, unitPrice: 4800 },
  { productId: 10, name: "GI Panel Mounting Stand (per panel)", category: "STAND", quantity: 6, unitPrice: 2200 },
  { productId: 11, name: "DC Solar Cable 4 sq mm (per metre)", category: "WIRING", quantity: 45, unitPrice: 62 },
  { productId: 14, name: "Safety Earthing Kit", category: "EARTHING", quantity: 1, unitPrice: 3500 },
];

// GET /api/packages (Public)
router.get("/", (req, res) => {
  const { type } = req.query;
  const list = type ? packages.filter((p) => p.type === type) : packages;
  return ok(res, list);
});

// GET /api/packages/:id (Public)
router.get("/:id", (req, res) => {
  const pkg = packages.find((p) => p.id === Number(req.params.id)) || packages[0];
  return ok(res, { ...pkg, items });
});

module.exports = router;