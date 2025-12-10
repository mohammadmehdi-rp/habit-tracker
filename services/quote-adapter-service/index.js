const express = require("express");
const axios = require("axios");

const app = express();

// GET /quote -> returns { text, author }
app.get("/quote", async (req, res) => {
  try {
    const response = await axios.get("https://zenquotes.io/api/random");
    const data = Array.isArray(response.data) ? response.data[0] : null;

    const quote = {
      text: data?.q || "Keep going. Keep growing.",
      author: data?.a || "Unknown",
    };

    return res.json(quote);
  } catch (err) {
    console.error("Quote API error:", err.message);
    // Fallback quote if API fails
    return res.json({
      text: "Small consistent habits create big changes.",
      author: "Habit Tracker",
    });
  }
});

const PORT = 4003;
app.listen(PORT, () => {
  console.log(`Quote adapter service listening on port ${PORT}`);
});
