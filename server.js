
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Urdu AI Study Tool" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-8)
      : [];

    if (!question) {
      return res.status(400).json({
        error: "Meherbani karke apna sawal likhein."
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "AI API key set nahi hai. .env file check karein."
      });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful Urdu study tutor. Answer in simple Urdu " +
          "or Roman Urdu according to the user's language. Explain " +
          "step by step, use examples, and help with Urdu literature, " +
          "grammar, translation, vocabulary, and general study topics. " +
          "If uncertain, say so instead of inventing facts."
      },
      ...history
        .filter(
          (m) =>
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        )
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 3000)
        })),
      { role: "user", content: question.slice(0, 5000) }
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
          messages,
          temperature: 0.5,
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("AI provider error:", data);
      return res.status(502).json({
        error: "AI service se jawab nahi mila. API key, model aur quota check karein."
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "AI ne khaali jawab diya. Dobara koshish karein."
      });
    }

    res.json({ answer });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({
      error: "Server mein masla hua. Terminal ka error check karein."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Urdu AI Study Tool: http://localhost:${PORT}`);
});
