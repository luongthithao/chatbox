import { askAI } from "../services/ai.service.js";

export const chatWithAI = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Thiếu message" });
  }

  try {
    const reply = await askAI(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI không trả lời được" });
  }
};
