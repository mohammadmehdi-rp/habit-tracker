const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());

const dbPath = path.join(__dirname, "../../db/habit.db");
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

// POST /register
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  const password_hash = hashPassword(password);
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO users (username, password_hash, created_at) VALUES (?,?,?)",
    [username, password_hash, now],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: "username already exists" });
      }
      return res.status(201).json({ id: this.lastID, username });
    }
  );
});

// POST /login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  const password_hash = hashPassword(password);

  db.get(
    "SELECT * FROM users WHERE username = ? AND password_hash = ?",
    [username, password_hash],
    (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "internal error" });
      }
      if (!user) {
        return res.status(401).json({ error: "invalid credentials" });
      }

      const token = crypto.randomBytes(24).toString("hex");
      const now = new Date().toISOString();

      db.run(
        "INSERT INTO tokens (token, user_id, created_at) VALUES (?,?,?)",
        [token, user.id, now],
        (err2) => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({ error: "internal error" });
          }
          return res.json({ token, userId: user.id, username: user.username });
        }
      );
    }
  );
});

// GET /verify-token
app.get("/verify-token", (req, res) => {
  const auth = req.headers["authorization"];
  const headerToken =
    auth && auth.startsWith("Bearer ") ? auth.substring(7) : null;
  const token = headerToken || req.query.token;
  if (!token) return res.status(400).json({ error: "token required" });

  db.get("SELECT user_id FROM tokens WHERE token = ?", [token], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "internal error" });
    }
    if (!row) return res.status(401).json({ error: "invalid token" });

    return res.json({ userId: row.user_id });
  });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`);
});
