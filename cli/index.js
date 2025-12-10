const axios = require("axios");
const fs = require("fs");
const path = require("path");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4000";
const AUTH_URL = process.env.AUTH_URL || "http://localhost:4001";
const TOKEN_FILE = path.join(__dirname, ".habit-token.json");

function saveToken(token, username) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, username }, null, 2));
}

function loadToken() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
}

async function register(username, password) {
  const res = await axios.post(`${AUTH_URL}/register`, { username, password });
  console.log("Registered:", res.data);
}

async function login(username, password) {
  const res = await axios.post(`${AUTH_URL}/login`, { username, password });
  saveToken(res.data.token, res.data.username);
  console.log("Logged in as", res.data.username);
}

async function addHabit(name, frequency = "daily") {
  const tokenObj = loadToken();
  if (!tokenObj) {
    console.log("Please login first.");
    return;
  }
  const res = await axios.post(
    `${GATEWAY_URL}/add-habit`,
    { name, frequency },
    { headers: { Authorization: `Bearer ${tokenObj.token}` } }
  );
  console.log("Habit created:", res.data);
}

async function listHabits() {
  const tokenObj = loadToken();
  if (!tokenObj) {
    console.log("Please login first.");
    return;
  }
  const res = await axios.get(`${GATEWAY_URL}/list-habits`, {
    headers: { Authorization: `Bearer ${tokenObj.token}` },
  });
  console.log("Your habits:");
  res.data.forEach((h) => {
    console.log(`- [${h.id}] ${h.name} (${h.frequency})`);
  });
}

async function completeHabit(habitId) {
  const tokenObj = loadToken();
  if (!tokenObj) {
    console.log("Please login first.");
    return;
  }
  const res = await axios.post(
    `${GATEWAY_URL}/complete-habit`,
    { habitId },
    { headers: { Authorization: `Bearer ${tokenObj.token}` } }
  );
  console.log("Marked completed:", res.data);
}

async function dailySummary() {
  const tokenObj = loadToken();
  if (!tokenObj) {
    console.log("Please login first.");
    return;
  }
  const res = await axios.get(`${GATEWAY_URL}/daily-summary`, {
    headers: { Authorization: `Bearer ${tokenObj.token}` },
  });

  const data = res.data;
  console.log(`Summary for ${data.date}`);
  console.log("-----------------------------");
  data.summary.forEach((h) => {
    console.log(`${h.completed ? "[x]" : "[ ]"} ${h.name}`);
  });
  console.log(`Completion: ${data.completionRate}%`);
  console.log("");
  console.log(`Quote: "${data.quote.text}" — ${data.quote.author}`);
}

// Simple CLI dispatcher
async function main() {
  const [, , cmd, ...args] = process.argv;

  try {
    if (cmd === "register") {
      const [user, pw] = args;
      if (!user || !pw) {
        console.log("Usage: npm run cli -- register <user> <pw>");
        return;
      }
      await register(user, pw);
    } else if (cmd === "login") {
      const [user, pw] = args;
      if (!user || !pw) {
        console.log("Usage: npm run cli -- login <user> <pw>");
        return;
      }
      await login(user, pw);
    } else if (cmd === "add-habit") {
      const name = args[0];
      const freq = args[1] || "daily";
      if (!name) {
        console.log('Usage: npm run cli -- add-habit "Habit name" [frequency]');
        return;
      }
      await addHabit(name, freq);
    } else if (cmd === "list-habits") {
      await listHabits();
    } else if (cmd === "complete-habit") {
      const id = args[0];
      if (!id) {
        console.log("Usage: npm run cli -- complete-habit <habitId>");
        return;
      }
      await completeHabit(id);
    } else if (cmd === "daily-summary") {
      await dailySummary();
    } else {
      console.log("Usage:");
      console.log("  npm run cli -- register <user> <pw>");
      console.log("  npm run cli -- login <user> <pw>");
      console.log('  npm run cli -- add-habit "Study 1h" [frequency]');
      console.log("  npm run cli -- list-habits");
      console.log("  npm run cli -- complete-habit <habitId>");
      console.log("  npm run cli -- daily-summary");
    }
  } catch (err) {
    if (err.response) {
      console.error("Error:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

main();
