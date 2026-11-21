require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// One shared demo password for all staff, so the team can log in easily
const DEMO_PASSWORD = "Solar@123";

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [
    { name: "Harpreet Singh Gill", email: "director@kiran.in", phone: "9815012345", role: "DIRECTOR" },
    { name: "Simran Kaur", email: "sales@kiran.in", phone: "9815023456", role: "SALES" },
    { name: "Gurpreet Sandhu", email: "sales2@kiran.in", phone: "9815034567", role: "SALES" },
    { name: "Balwinder Singh", email: "warehouse@kiran.in", phone: "9815045678", role: "WAREHOUSE" },
    { name: "Navjot Kaur", email: "support@kiran.in", phone: "9815056789", role: "SUPPORT" },
    { name: "Jaspreet Singh", email: "jaspreet@kiran.in", phone: "9815067890", role: "TECHNICIAN", payRate: 250 },
    { name: "Manpreet Singh", email: "manpreet@kiran.in", phone: "9815078901", role: "TECHNICIAN", payRate: 275 },
    { name: "Amandeep Sidhu", email: "amandeep@kiran.in", phone: "9815089012", role: "TECHNICIAN", payRate: 240 },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`Users ready: ${users.length}`);
}

async function seedProducts() {
  const products = [
    // Panels
    { sku: "PNL-540", name: "Mono PERC Solar Panel 540W", category: "PANEL", unitPrice: 14500, costPrice: 12200, stockQty: 120, lowStockLevel: 20, requiresSerial: true, warrantyMonths: 240 },

    // On-grid inverters
    { sku: "INV-ON-1K", name: "On-Grid Solar Inverter 1 kW", category: "INVERTER", unitPrice: 18000, costPrice: 14500, stockQty: 12, lowStockLevel: 3, requiresSerial: true, warrantyMonths: 24 },
    { sku: "INV-ON-2K", name: "On-Grid Solar Inverter 2 kW", category: "INVERTER", unitPrice: 27500, costPrice: 22000, stockQty: 10, lowStockLevel: 3, requiresSerial: true, warrantyMonths: 24 },
    { sku: "INV-ON-3K", name: "On-Grid Solar Inverter 3 kW", category: "INVERTER", unitPrice: 38000, costPrice: 30500, stockQty: 8, lowStockLevel: 3, requiresSerial: true, warrantyMonths: 24 },
    { sku: "INV-ON-4K", name: "On-Grid Solar Inverter 4 kW", category: "INVERTER", unitPrice: 48500, costPrice: 39000, stockQty: 5, lowStockLevel: 2, requiresSerial: true, warrantyMonths: 24 },
    { sku: "INV-ON-5K", name: "On-Grid Solar Inverter 5 kW", category: "INVERTER", unitPrice: 59000, costPrice: 47500, stockQty: 2, lowStockLevel: 3, requiresSerial: true, warrantyMonths: 24 },

    // Battery (off-grid only)
    { sku: "BAT-150", name: "Tubular Battery 12V 150Ah", category: "BATTERY", unitPrice: 15500, costPrice: 12800, stockQty: 24, lowStockLevel: 6, requiresSerial: true, warrantyMonths: 24 },

    // Charge controllers
    { sku: "CTL-40A", name: "MPPT Charge Controller 40A", category: "CONTROLLER", unitPrice: 4800, costPrice: 3600, stockQty: 15, lowStockLevel: 4, requiresSerial: true, warrantyMonths: 24 },
    { sku: "CTL-60A", name: "MPPT Charge Controller 60A", category: "CONTROLLER", unitPrice: 7600, costPrice: 5900, stockQty: 10, lowStockLevel: 3, requiresSerial: true, warrantyMonths: 24 },

    // Stands, wiring, earthing, switches
    { sku: "STD-PNL", name: "GI Panel Mounting Stand (per panel)", category: "STAND", unitPrice: 2200, costPrice: 1700, stockQty: 150, lowStockLevel: 20 },
    { sku: "CBL-DC4", name: "DC Solar Cable 4 sq mm (per metre)", category: "WIRING", unitPrice: 62, costPrice: 48, stockQty: 800, lowStockLevel: 100 },
    { sku: "CON-MC4", name: "MC4 Connector Pair", category: "WIRING", unitPrice: 260, costPrice: 190, stockQty: 200, lowStockLevel: 30 },
    { sku: "BOX-DCDB", name: "DC/AC Distribution Wiring Box", category: "WIRING", unitPrice: 3800, costPrice: 2900, stockQty: 25, lowStockLevel: 5 },
    { sku: "ERT-KIT", name: "Safety Earthing Kit", category: "EARTHING", unitPrice: 3500, costPrice: 2600, stockQty: 25, lowStockLevel: 5 },
    { sku: "SW-DC", name: "DC Isolator Switch", category: "SWITCH", unitPrice: 1800, costPrice: 1300, stockQty: 30, lowStockLevel: 6 },
    { sku: "SW-ACMCB", name: "AC MCB Switch", category: "SWITCH", unitPrice: 950, costPrice: 700, stockQty: 40, lowStockLevel: 8 },

    // Services (no stock)
    { sku: "SRV-INST", name: "Installation and Testing Service", category: "SERVICE", unitPrice: 12000, costPrice: 7000, stockQty: 0, lowStockLevel: 0 },
    { sku: "SRV-LAB", name: "Service Visit Labour", category: "SERVICE", unitPrice: 800, costPrice: 500, stockQty: 0, lowStockLevel: 0 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }
  console.log(`Products ready: ${products.length}`);
}

async function seedTemplates() {
  const products = await prisma.product.findMany();
  const bySku = {};
  products.forEach((p) => (bySku[p.sku] = p));

  const batteryCount = { 1: 1, 2: 2, 3: 2, 4: 4, 5: 4 };
  const defs = [];

  for (const kw of [1, 2, 3, 4, 5]) {
    const onGridItems = [
      ["PNL-540", kw * 2],
      [`INV-ON-${kw}K`, 1],
      [kw <= 3 ? "CTL-40A" : "CTL-60A", 1],
      ["STD-PNL", kw * 2],
      ["CBL-DC4", kw * 15],
      ["CON-MC4", kw],
      ["BOX-DCDB", 1],
      ["ERT-KIT", 1],
      ["SW-DC", 1],
      ["SW-ACMCB", 1],
    ];

    defs.push({
      name: `${kw} kW On-Grid System`,
      type: "ON_GRID",
      capacityKw: kw,
      description: `Grid-connected rooftop system, ${kw} kW. Cuts your electricity bill and is subsidy-ready.`,
      items: onGridItems,
    });

    defs.push({
      name: `${kw} kW Off-Grid System`,
      type: "OFF_GRID",
      capacityKw: kw,
      description: `Off-grid system, ${kw} kW, with battery backup for power cuts.`,
      items: [...onGridItems, ["BAT-150", batteryCount[kw]]],
    });
  }

  defs.push({
    name: "Solar Panel Set",
    type: "PANEL_SET",
    capacityKw: null,
    description: "Hardware only: 4 solar panels with connectors and wires.",
    items: [["PNL-540", 4], ["CON-MC4", 2], ["CBL-DC4", 40]],
  });

  defs.push({
    name: "Installation Service",
    type: "INSTALLATION",
    capacityKw: null,
    description: "Fitting and testing by our crew at your site.",
    items: [["SRV-INST", 1]],
  });

  for (const d of defs) {
    const exists = await prisma.packageTemplate.findFirst({
      where: { name: d.name },
    });
    if (exists) continue;

    const price = d.items.reduce(
      (sum, [sku, qty]) => sum + Number(bySku[sku].unitPrice) * qty,
      0
    );

    await prisma.packageTemplate.create({
      data: {
        name: d.name,
        type: d.type,
        capacityKw: d.capacityKw,
        description: d.description,
        price,
        items: {
          create: d.items.map(([sku, qty]) => ({
            productId: bySku[sku].id,
            quantity: qty,
          })),
        },
      },
    });
  }
  console.log(`Templates ready: ${defs.length}`);
}

async function seedLeads() {
  const existing = await prisma.lead.count();
  if (existing > 0) {
    console.log("Leads already exist, skipping");
    return;
  }

  const sales1 = await prisma.user.findUnique({ where: { email: "sales@kiran.in" } });
  const sales2 = await prisma.user.findUnique({ where: { email: "sales2@kiran.in" } });
  const tech1 = await prisma.user.findUnique({ where: { email: "jaspreet@kiran.in" } });
  const tech2 = await prisma.user.findUnique({ where: { email: "manpreet@kiran.in" } });

  const days = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const leads = [
    {
      name: "Rajinder Pal Singh", phone: "9876543210", email: "rajinder.pal@gmail.com",
      address: "House 214, Model Town Extension", city: "Ludhiana",
      source: "WEB", systemSizeKw: 3, message: "Interested in a 3 kW system under the subsidy scheme.",
      status: "NEW", assignedToId: sales1.id, createdAt: days(1),
    },
    {
      name: "Kulwinder Kaur", phone: "9872011223", email: "kulwinder.kaur@gmail.com",
      address: "Flat 12, Basti Nau", city: "Jalandhar",
      source: "CALL", systemSizeKw: 2, message: "Wants to reduce the electricity bill.",
      status: "CONTACTED", shadowFreeArea: 280, monthlyBill: 3200, gridSuitable: true,
      assignedToId: sales2.id, createdAt: days(4),
    },
    {
      name: "Sukhdev Singh Brar", phone: "9815567788", email: "sukhdev.brar@gmail.com",
      address: "Kothi 45, Urban Estate Phase 2", city: "Patiala",
      source: "WEB", systemSizeKw: 3, message: "Need a roof survey this week.",
      status: "SURVEY_SCHEDULED", shadowFreeArea: 350, monthlyBill: 4800, gridSuitable: true,
      assignedToId: sales1.id, createdAt: days(6),
    },
    {
      name: "Gagandeep Verma", phone: "9914456677", email: "gagan.verma@gmail.com",
      address: "B-17, Green Avenue", city: "Amritsar",
      source: "WHATSAPP", systemSizeKw: 5, message: "Small workshop, wants a 5 kW system.",
      status: "SURVEY_APPROVED", shadowFreeArea: 620, monthlyBill: 9500, gridSuitable: true,
      assignedToId: sales2.id, createdAt: days(10),
    },
    {
      name: "Parminder Kaur Dhillon", phone: "9988776655", email: "parminder.dhillon@gmail.com",
      address: "Sector 70, House 1183", city: "Mohali",
      source: "WEB", systemSizeKw: 3, message: "3 kW on-grid system under the subsidy.",
      status: "SURVEY_APPROVED", shadowFreeArea: 400, monthlyBill: 5200, gridSuitable: true,
      assignedToId: sales1.id, createdAt: days(14),
    },
    {
      name: "Lakhwinder Singh", phone: "9855001122", email: "lakhwinder.singh@gmail.com",
      address: "Rice mill road, Near Canal Colony", city: "Bathinda",
      source: "CALL", systemSizeKw: 5, message: "Factory roof, wants 5 kW.",
      status: "LOST", shadowFreeArea: 120, monthlyBill: 7800, gridSuitable: true,
      assignedToId: sales2.id, createdAt: days(20),
    },
  ];

  const created = {};
  for (const l of leads) {
    created[l.name] = await prisma.lead.create({ data: l });
  }

  const surveys = [
    {
      leadId: created["Sukhdev Singh Brar"].id, technicianId: tech1.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
    },
    {
      leadId: created["Gagandeep Verma"].id, technicianId: tech2.id,
      scheduledAt: days(7), status: "APPROVED",
      roofDirection: "South", tiltAngle: 25, cableDistance: 18,
      notes: "Flat concrete roof, no shadow after 10 am.", reviewNote: "Approved, good roof.",
    },
    {
      leadId: created["Parminder Kaur Dhillon"].id, technicianId: tech1.id,
      scheduledAt: days(11), status: "APPROVED",
      roofDirection: "South-West", tiltAngle: 22, cableDistance: 12,
      notes: "Clear roof, water tank on the north side only.", reviewNote: "Approved.",
    },
    {
      leadId: created["Lakhwinder Singh"].id, technicianId: tech2.id,
      scheduledAt: days(16), status: "REJECTED",
      roofDirection: "East", tiltAngle: 10, cableDistance: 40,
      notes: "Heavy shade from the nearby silo all day.",
      reviewNote: "Rejected: shadow-free area too small for 5 kW.",
    },
  ];

  for (const s of surveys) {
    await prisma.survey.create({ data: s });
  }

  console.log(`Leads ready: ${leads.length}, Surveys ready: ${surveys.length}`);
}

async function seedHistory() {
  const already = await prisma.lead.findFirst({ where: { phone: "9815200111" } });
  if (already) {
    console.log("Past orders already exist, skipping");
    return;
  }

  const sales = await prisma.user.findUnique({ where: { email: "sales@kiran.in" } });
  const tech1 = await prisma.user.findUnique({ where: { email: "jaspreet@kiran.in" } });
  const tech2 = await prisma.user.findUnique({ where: { email: "manpreet@kiran.in" } });

  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const addMonths = (date, n) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
  };

  const customers = [
    {
      tag: "HS25",
      templateName: "3 kW On-Grid System",
      lead: {
        name: "Harjinder Singh Sandhu", phone: "9815200111", email: "harjinder.sandhu@gmail.com",
        address: "House 88, BRS Nagar", city: "Ludhiana", source: "WEB", systemSizeKw: 3,
      },
      deliveredDaysAgo: 548,
      technician: tech1,
      hours: 6.5,
      subsidyAmount: 78000,
      invoiceNo: "KIR-INV-0001",
    },
    {
      tag: "DP24",
      templateName: "2 kW Off-Grid System",
      lead: {
        name: "Davinder Pal Kaur", phone: "9815200222", email: "davinder.kaur@gmail.com",
        address: "Street 4, Guru Nanak Pura", city: "Jalandhar", source: "CALL", systemSizeKw: 2,
      },
      deliveredDaysAgo: 913,
      technician: tech2,
      hours: 8,
      subsidyAmount: 60000,
      invoiceNo: "KIR-INV-0002",
    },
  ];

  for (const c of customers) {
    const template = await prisma.packageTemplate.findFirst({
      where: { name: c.templateName },
      include: { items: { include: { product: true } } },
    });

    const deliveredAt = daysAgo(c.deliveredDaysAgo);
    const confirmedAt = daysAgo(c.deliveredDaysAgo + 7);

    // Lead (the customer record)
    const lead = await prisma.lead.create({
      data: {
        ...c.lead,
        status: "ORDERED",
        shadowFreeArea: 400,
        monthlyBill: 5000,
        gridSuitable: true,
        assignedToId: sales.id,
        createdAt: daysAgo(c.deliveredDaysAgo + 30),
      },
    });

    // Approved survey
    await prisma.survey.create({
      data: {
        leadId: lead.id, technicianId: c.technician.id,
        scheduledAt: daysAgo(c.deliveredDaysAgo + 20), status: "APPROVED",
        roofDirection: "South", tiltAngle: 24, cableDistance: 15,
        notes: "Clear roof, no shading.", reviewNote: "Approved.",
      },
    });

    // Quote with the parts list copied from the template
    const lines = template.items.map((it) => ({
      productId: it.productId,
      description: it.product.name,
      quantity: it.quantity,
      unitPrice: it.product.unitPrice,
      lineTotal: Number(it.product.unitPrice) * it.quantity,
    }));
    const total = lines.reduce((s, l) => s + l.lineTotal, 0);

    const quote = await prisma.quote.create({
      data: {
        leadId: lead.id, templateId: template.id, createdById: sales.id,
        status: "ACCEPTED", totalAmount: total,
        createdAt: daysAgo(c.deliveredDaysAgo + 15),
        lines: { create: lines },
      },
    });

    // Order, delivered and installed
    const order = await prisma.order.create({
      data: {
        quoteId: quote.id, leadId: lead.id, status: "INSTALLED",
        totalAmount: total, confirmedAt, deliveredAt,
        createdAt: confirmedAt,
      },
    });

    // Advance 50 percent, balance 50 percent
    const half = Math.round(total / 2);
    await prisma.payment.createMany({
      data: [
        { orderId: order.id, amount: half, type: "ADVANCE", method: "UPI", paidAt: confirmedAt },
        { orderId: order.id, amount: total - half, type: "BALANCE", method: "Bank transfer", paidAt: deliveredAt },
      ],
    });

    // Serial numbers with warranty dates (same rule the app will use on delivery)
    let serialCount = 0;
    for (const it of template.items) {
      if (!it.product.requiresSerial) continue;
      for (let i = 1; i <= it.quantity; i++) {
        await prisma.serialUnit.create({
          data: {
            serial: `${it.product.sku}-${c.tag}-${String(i).padStart(3, "0")}`,
            productId: it.productId,
            orderId: order.id,
            dispatchedAt: deliveredAt,
            warrantyStart: deliveredAt,
            warrantyEnd: addMonths(deliveredAt, it.product.warrantyMonths),
          },
        });
        serialCount++;
      }
    }

    // Finished install job
    const start = new Date(deliveredAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    await prisma.installJob.create({
      data: {
        orderId: order.id, technicianId: c.technician.id, status: "COMPLETED",
        scheduledDate: start, startTime: start,
        endTime: new Date(start.getTime() + c.hours * 60 * 60 * 1000),
        hoursWorked: c.hours, systemSizeKw: c.lead.systemSizeKw,
        photoUrls: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
        notes: "Installed and tested. Generation confirmed.",
      },
    });

    // Sale invoice, fully paid
    await prisma.invoice.create({
      data: {
        invoiceNumber: c.invoiceNo, type: "ORDER", orderId: order.id,
        partsAmount: total, labourAmount: 0, totalAmount: total,
        paid: true, issuedAt: deliveredAt,
      },
    });

    // Subsidy received
    await prisma.subsidy.create({
      data: {
        orderId: order.id, stage: "RECEIVED", amount: c.subsidyAmount,
        notes: "Subsidy credited to the customer account.",
        appliedAt: daysAgo(c.deliveredDaysAgo + 5),
        submittedAt: daysAgo(c.deliveredDaysAgo),
        approvedAt: daysAgo(c.deliveredDaysAgo - 30),
        receivedAt: daysAgo(c.deliveredDaysAgo - 60),
      },
    });

    console.log(`Past order ready: ${c.lead.name} (${serialCount} serials)`);
  }
}

async function main() {
  await seedUsers();
await seedProducts();
  await seedTemplates();
    await seedLeads();
      await seedHistory();
  // Products, templates and demo data get added here in the next steps
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());