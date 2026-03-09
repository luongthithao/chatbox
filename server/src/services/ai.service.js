import axios from "axios";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3:8b";

const SYSTEM_PROMPT = `
Bạn là trợ lý AI thông minh, trả lời:
- Ngắn gọn
- Chính xác
- Trực tiếp vào vấn đề
- Nếu không chắc thì nói rõ
- Trả lời bằng tiếng Việt
`;

export const generateAIResponse = async (message, history = []) => {
  const conversation = `
${SYSTEM_PROMPT}

Lịch sử:
${history.map(m => `${m.role}: ${m.content}`).join("\n")}

Người dùng: ${message}
AI:
`;

  try {
    const { data } = await axios.post(OLLAMA_URL, {
      model: MODEL,
      prompt: conversation,
      stream: false,
      options: {
        temperature: 0.3,   // ↓ giảm bịa chuyện
        top_p: 0.9
      }
    });

    return data.response?.trim();

  } catch (error) {
    throw new Error("AI service unavailable");
  }
};