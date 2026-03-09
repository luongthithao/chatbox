import { useState, useRef, useEffect } from "react";
import "./ChatBox.css";

const API_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "llama3:8b";

const SYSTEM_PROMPT = `
Bạn là một AI assistant thông minh.
Trả lời ngắn gọn, rõ ràng, đúng trọng tâm.
Luôn trả lời bằng tiếng Việt.
Nếu câu hỏi không rõ, hãy hỏi lại để làm rõ.
`;

export default function ChatBox() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chat_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("chat_history", JSON.stringify(messages));
  }, [messages]);

  // Tạo prompt có memory
  const buildPrompt = (history, newMessage) => {
    const conversation = history
      .slice(-6) // chỉ lấy 6 tin gần nhất để tăng tốc
      .map(msg =>
        msg.role === "user"
          ? `Người dùng: ${msg.content}`
          : `AI: ${msg.content}`
      )
      .join("\n");

    return `
${SYSTEM_PROMPT}

${conversation}
Người dùng: ${newMessage}
AI:
`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const prompt = buildPrompt(messages, userMessage.content);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: prompt,
          stream: false,
          temperature: 0.6,   // giảm để trả lời chính xác hơn
          num_predict: 150,   // giới hạn token để nhanh hơn
        }),
      });

      if (!response.ok) {
        throw new Error("AI server error");
      }

      const data = await response.json();

      const aiMessage = {
        role: "ai",
        content: data.response?.trim() || "AI không có phản hồi.",
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "Không thể kết nối AI server 😭" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const clearChat = () => {
    localStorage.removeItem("chat_history");
    setMessages([]);
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-box">

        <div className="chat-header">
          Con Cừu Non 🐑
          <button onClick={clearChat} className="clear-btn">
            Xóa chat
          </button>
        </div>

        <div className="chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className="message ai">
              AI đang suy nghĩ... 🤔
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            placeholder="Nhập câu hỏi..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi"}
          </button>
        </div>

      </div>
    </div>
  );
}