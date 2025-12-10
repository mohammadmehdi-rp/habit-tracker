const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

// Load OpenAPI spec
const swaggerDocumentPath = path.join(__dirname, "../../docs/openapi.json");
const swaggerDocument = JSON.parse(
  fs.readFileSync(swaggerDocumentPath, "utf8")
);

// Mount Swagger UI at /docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const AUTH_URL = process.env.AUTH_URL || "http://localhost:4001";
const HABIT_DATA_URL = process.env.HABIT_DATA_URL || "http://localhost:4002";
const STATS_URL = process.env.STATS_URL || "http://localhost:4004";
const QUOTE_URL = process.env.QUOTE_URL || "http://localhost:4003";

async function verifyTokenFromHeader(req) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    throw { status: 401, message: "missing or invalid Authorization header" };
  }
  const token = auth.substring(7);
  const res = await axios.get(`${AUTH_URL}/verify-token`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { userId: res.data.userId, token };
}

// POST /add-habit
app.post("/add-habit", async (req, res) => {
  try {
    const { userId } = await verifyTokenFromHeader(req);
    const { name, frequency } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const resp = await axios.post(`${HABIT_DATA_URL}/habits`, {
      userId,
      name,
      frequency: frequency || "daily",
    });

    return res.status(201).json(resp.data);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "invalid token" });
    }
    console.error(err.message || err);
    return res.status(500).json({ error: "internal error" });
  }
});

// GET /list-habits
app.get("/list-habits", async (req, res) => {
  try {
    const { userId } = await verifyTokenFromHeader(req);

    const resp = await axios.get(`${HABIT_DATA_URL}/habits`, {
      params: { userId },
    });
    return res.json(resp.data);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "invalid token" });
    }
    console.error(err.message || err);
    return res.status(500).json({ error: "internal error" });
  }
});

// POST /complete-habit
app.post("/complete-habit", async (req, res) => {
  try {
    await verifyTokenFromHeader(req);
    const { habitId, date } = req.body;
    if (!habitId) return res.status(400).json({ error: "habitId required" });

    const resp = await axios.post(
      `${HABIT_DATA_URL}/habits/${habitId}/completions`,
      { date }
    );

    return res.status(201).json(resp.data);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "invalid token" });
    }
    console.error(err.message || err);
    return res.status(500).json({ error: "internal error" });
  }
});

// GET /daily-summary
app.get("/daily-summary", async (req, res) => {
  try {
    const { userId } = await verifyTokenFromHeader(req);
    const { date } = req.query;

    const [statsResp, quoteResp] = await Promise.all([
      axios.get(`${STATS_URL}/daily-summary`, {
        params: { userId, date },
      }),
      axios.get(`${QUOTE_URL}/quote`),
    ]);

    return res.json({
      ...statsResp.data,
      quote: quoteResp.data,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "invalid token" });
    }
    console.error(err.message || err);
    return res.status(500).json({ error: "internal error" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
});
