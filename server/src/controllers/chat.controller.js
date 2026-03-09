import { generateAIResponse } from "../services/ai.service.js";

export const chatWithAI = async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const reply = await generateAIResponse(messages);

    res.json({ reply });
  } catch (error) {
    next(error);
  }
};