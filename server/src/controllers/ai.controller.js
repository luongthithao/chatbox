import { generateAIResponse } from "../services/ai.service.js";

export const askAI = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const reply = await generateAIResponse(message);

    res.json({
      success: true,
      reply: reply || "AI không có phản hồi.",
    });

  } catch (error) {
    next(error);
  }
};