const express = require("express"); // creates the app object
const cors = require("cors"); // lets react app run , call this API from the browser
const helmet = require("helmet"); // adds security headers to every response (like blocking the page from being embedded in another site). One line, and it avoids a whole class of browser attacks.
const morgan = require("morgan");
const { ok } = require("./utils/response");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const leadRoutes = require("./routes/leads");
const surveyRoutes = require("./routes/surveys");
const userRoutes = require("./routes/users");
const packageRoutes = require("./routes/packages");
const quoteRoutes = require("./routes/quotes");
const orderRoutes = require("./routes/orders");
const dispatchRoutes = require("./routes/dispatch");
const installJobRoutes = require("./routes/installJobs");
const supportRoutes = require("./routes/support");
const stockRoutes = require("./routes/stock");
const subsidyRoutes = require("./routes/subsidies");
const payrollRoutes = require("./routes/payroll");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "5mb" })); // 5mb leaves room for signature images
app.use(morgan("dev"));

// Quick check that the server is alive
app.get("/api/health", (req, res) => ok(res, { status: "Kiran API running" }));

// Feature routes get plugged in here in later steps
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/install-jobs", installJobRoutes);
app.use("/api", dispatchRoutes);
app.use("/api", supportRoutes);
app.use("/api/subsidies", subsidyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", stockRoutes);
app.use("/api", payrollRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

// it decides the order every request passes through