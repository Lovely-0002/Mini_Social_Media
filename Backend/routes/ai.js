// routes/ai.js
const express = require('express');
const router = express.Router();
require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1' // Groq's OpenAI-compatible endpoint
});

// Chat endpoint using Groq Llama 3 70B model
router.post('/chat-ai', async (req, res) => {
  const { messages } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      messages
    });

    const reply = completion.choices[0]?.message?.content || "Sorry, I could not respond.";
    res.json({ reply });
  } catch (err) {
    console.error('Groq Chat AI error:', err);
    res.status(500).json({ error: 'Failed to generate AI reply' });
  }
});

// Caption generation using Groq Llama 3
router.post('/generate-caption', async (req, res) => {
  const { mood, keywords } = req.body;
  const prompt = `Write a catchy social media caption. Mood: ${mood}. Keywords: ${keywords}.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }]
    });

    const caption = completion.choices[0]?.message?.content?.trim() || "Caption unavailable";
    res.json({ caption });
  } catch (err) {
    console.error('Groq Caption error:', err);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

module.exports = router;
