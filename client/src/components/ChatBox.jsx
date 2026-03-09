import { useState, useRef, useEffect } from "react";
import "./ChatBox.css";

const API_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "llama3:8b";
const MAX_HISTORY = 30;
const CONTEXT_HISTORY = 6;
const REQUEST_TIMEOUT = 30000;

const SYSTEM_PROMPT = `
Bạn là trợ lý AI tiếng Việt.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt tự nhiên, dễ hiểu.
- Trả lời đúng trọng tâm, không lan man.
- Ưu tiên hiểu câu hỏi theo ngữ cảnh người Việt Nam.
- Với câu hỏi về kiến thức phổ thông, hãy hiểu theo chương trình học phổ thông Việt Nam.
- Nếu người dùng yêu cầu liệt kê, hãy liệt kê đúng số lượng họ yêu cầu.
- Không tự ý thêm kiến thức ngoài chủ đề khi chưa cần.
- Nếu câu hỏi chưa rõ, chỉ hỏi lại 1 câu ngắn để làm rõ.
- Không bịa thông tin. Nếu không chắc, hãy nói rõ là không chắc.
- Khi trả lời dạng danh sách, xuống dòng rõ ràng, dễ đọc.
`;

const createMessage = (role, content, extra = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  ...extra,
});

const normalizeUserInput = (text) => {
  const q = text.trim();
  const lowerQ = q.toLowerCase();

  if (lowerQ.includes("hằng đẳng thức đáng nhớ")) {
    return "Hãy liệt kê đúng 7 hằng đẳng thức đáng nhớ trong đại số phổ thông Việt Nam, viết đúng công thức, trình bày theo danh sách đánh số rõ ràng, không thêm kiến thức ngoài yêu cầu.";
  }

  if (lowerQ.includes("phương trình bậc 2") || lowerQ.includes("phương trình bậc hai")) {
    return "Hãy giải thích hoặc trình bày về phương trình bậc hai theo kiến thức toán phổ thông Việt Nam, viết ngắn gọn, dễ hiểu, đúng trọng tâm.";
  }

  if (lowerQ.includes("văn nghị luận")) {
    return "Hãy trả lời theo ngữ cảnh môn Ngữ văn phổ thông Việt Nam, trình bày rõ ràng, đúng trọng tâm.";
  }

  if (lowerQ.startsWith("viết cho tôi ") && lowerQ.includes(" công thức")) {
    return `${q}. Hãy trình bày theo danh sách, xuống dòng rõ ràng, không lan man.`;
  }

  if (lowerQ.startsWith("liệt kê ") || lowerQ.startsWith("nêu ")) {
    return `${q}. Hãy trả lời đúng số lượng yêu cầu, trình bày thành danh sách rõ ràng.`;
  }

  return q;
};

export default function ChatBox() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_history");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem(
      "chat_history",
      JSON.stringify(messages.slice(-MAX_HISTORY))
    );
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const buildPrompt = (history, currentInput) => {
    const conversation = history
      .slice(-CONTEXT_HISTORY)
      .map((msg) =>
        msg.role === "user"
          ? `Người dùng: ${msg.content}`
          : `AI: ${msg.content}`
      )
      .join("\n");

    return `
${SYSTEM_PROMPT}

Lịch sử hội thoại gần đây:
${conversation}

Yêu cầu mới của người dùng:
Người dùng: ${currentInput}

Hãy trả lời đúng yêu cầu mới nhất của người dùng.
AI:
`.trim();
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError("");

    const normalizedInput = normalizeUserInput(trimmed);

    const userMessage = createMessage("user", trimmed);
    const thinkingMessage = createMessage("ai", "Đang trả lời...", {
      loading: true,
    });

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);

    try {
      const promptHistory = [...messages, userMessage];
      const prompt = buildPrompt(promptHistory, normalizedInput);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt,
          stream: false,
          temperature: 0.2,
          num_predict: 220,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI server error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.response?.trim() || "AI không có phản hồi.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMessage.id
            ? { ...msg, content: aiText, loading: false }
            : msg
        )
      );
    } catch (err) {
      const errorMessage =
        err.name === "AbortError"
          ? "Hết thời gian chờ phản hồi từ AI."
          : "Không thể kết nối AI server 😭";

      console.error("Chat error:", err);
      setError(errorMessage);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingMessage.id
            ? { ...msg, content: errorMessage, loading: false, error: true }
            : msg
        )
      );
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    localStorage.removeItem("chat_history");
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-box">
        <div className="chat-header">
          AI 🐑
          <button onClick={clearChat} className="clear-btn">
            Xóa chat
          </button>
        </div>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="message ai">
              Xin chào, bạn muốn mình giúp gì hôm nay?
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role} ${msg.error ? "error" : ""}`}
            >
              {msg.content}
            </div>
          ))}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            placeholder="Nhập câu hỏi..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? "Đang trả lời..." : "Gửi"}
          </button>
        </div>

        {error && <div className="chat-error">{error}</div>}
      </div>
    </div>
  );
}