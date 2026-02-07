export const chatWithAI = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Thiếu message" });
  }

  // AI giả lập (MOCK)
  const reply = `🤖 AI trả lời: "${message}"`;

  res.json({ reply });
};
