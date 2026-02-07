import { askAI } from "../services/ai.service.js";

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Thiếu message" });
    }

    const reply = await askAI(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "AI lỗi rồi 😭" });
  }
};
