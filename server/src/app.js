const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ok } = require("./utils/response");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "5mb" })); // 5mb leaves room for signature images
app.use(morgan("dev"));

// Quick check that the server is alive
app.get("/api/health", (req, res) => ok(res, { status: "Kiran API running" }));

// Feature routes get plugged in here in later steps

app.use(notFound);
app.use(errorHandler);

module.exports = app;