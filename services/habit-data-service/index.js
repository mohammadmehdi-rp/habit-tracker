const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dayjs = require("dayjs");

const app = express();
app.use(bodyParser.json());

const dbPath = path.join(__dirname, "../../db/habit.db");
const db = new sqlite3.Database(dbPath);

// Tables for habits and logs
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      frequency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      UNIQUE (habit_id, date),
      FOREIGN KEY(habit_id) REFERENCES habits(id)
    )
  `);
});

// POST /habits
app.post("/habits", (req, res) => {
  const { userId, name, frequency } = req.body;
  if (!userId || !name || !frequency) {
    return res.status(400).json({ error: "userId, name, frequency required" });
  }
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO habits (user_id, name, frequency, created_at) VALUES (?,?,?,?)",
    [userId, name, frequency, now],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "internal error" });
      }
      return res.status(201).json({
        id: this.lastID,
        userId,
        name,
        frequency,
        created_at: now,
      });
    }
  );
});

// GET /habits?userId=...
app.get("/habits", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required" });

  db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "internal error" });
    }
    return res.json(rows);
  });
});

// POST /habits/:id/completions
app.post("/habits/:id/completions", (req, res) => {
  const habitId = req.params.id;
  const { date } = req.body;
  const d = date || dayjs().format("YYYY-MM-DD");

  db.run(
    "INSERT OR REPLACE INTO habit_logs (habit_id, date, completed) VALUES (?,?,1)",
    [habitId, d],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "internal error" });
      }
      return res.status(201).json({ habitId, date: d, completed: 1 });
    }
  );
});

// GET /habit-logs?userId=&from=&to=
app.get("/habit-logs", (req, res) => {
  const { userId, from, to } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const fromDate = from || "1970-01-01";
  const toDate = to || "2999-12-31";

  const sql = `
    SELECT hl.*, h.user_id, h.name 
    FROM habit_logs hl
    JOIN habits h ON hl.habit_id = h.id
    WHERE h.user_id = ?
      AND hl.date >= ?
      AND hl.date <= ?
    ORDER BY hl.date ASC
  `;

  db.all(sql, [userId, fromDate, toDate], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "internal error" });
    }
    return res.json(rows);
  });
});

const PORT = 4002;
app.listen(PORT, () => {
  console.log(`Habit data service listening on port ${PORT}`);
});
