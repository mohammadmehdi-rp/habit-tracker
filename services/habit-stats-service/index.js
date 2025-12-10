const express = require("express");
const axios = require("axios");
const dayjs = require("dayjs");

const app = express();
const HABIT_DATA_URL = process.env.HABIT_DATA_URL || "http://localhost:4002";

async function getHabits(userId) {
  const res = await axios.get(`${HABIT_DATA_URL}/habits`, {
    params: { userId },
  });
  return res.data;
}

async function getLogs(userId, from, to) {
  const res = await axios.get(`${HABIT_DATA_URL}/habit-logs`, {
    params: { userId, from, to },
  });
  return res.data;
}

// Compute streaks per habit
function computeStreaks(habits, logs, todayStr) {
  const logsByHabit = {};
  logs.forEach((log) => {
    if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = new Set();
    logsByHabit[log.habit_id].add(log.date);
  });

  const today = dayjs(todayStr);
  const result = [];

  for (const h of habits) {
    let streak = 0;
    const dates = logsByHabit[h.id] || new Set();
    let cursor = today;

    while (dates.has(cursor.format("YYYY-MM-DD"))) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
    }

    result.push({
      habitId: h.id,
      habitName: h.name,
      streak,
    });
  }
  return result;
}

// GET /daily-summary?userId=&date=
app.get("/daily-summary", async (req, res) => {
  try {
    const { userId, date } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const day = date || dayjs().format("YYYY-MM-DD");

    const [habits, logs] = await Promise.all([
      getHabits(userId),
      getLogs(userId, day, day),
    ]);

    const completedHabitIds = new Set(
      logs.filter((l) => l.completed).map((l) => l.habit_id)
    );

    const summary = habits.map((h) => ({
      habitId: h.id,
      name: h.name,
      completed: completedHabitIds.has(h.id),
    }));

    const completionRate =
      habits.length === 0
        ? 0
        : (summary.filter((s) => s.completed).length / habits.length) * 100;

    return res.json({
      date: day,
      summary,
      completionRate: Math.round(completionRate),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal error" });
  }
});

// GET /streaks?userId=&date=
app.get("/streaks", async (req, res) => {
  try {
    const { userId, date } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const day = date || dayjs().format("YYYY-MM-DD");
    const from = dayjs(day).subtract(60, "day").format("YYYY-MM-DD");

    const [habits, logs] = await Promise.all([
      getHabits(userId),
      getLogs(userId, from, day),
    ]);

    const streaks = computeStreaks(habits, logs, day);
    return res.json({ date: day, streaks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal error" });
  }
});

const PORT = 4004;
app.listen(PORT, () => {
  console.log(`Habit stats service listening on port ${PORT}`);
});
