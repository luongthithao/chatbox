import { generateAIResponse } from "../services/ai.service.js";
import { assertMessages } from "../utils/validate.js";

export const askAI = async (req, res, next) => {
  try {
    const messages = assertMessages(req.body?.messages);
    const reply = await generateAIResponse(messages);

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    next(error);
  }
};
