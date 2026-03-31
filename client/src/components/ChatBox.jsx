import { useEffect, useRef, useState } from "react";
import { conversationApi } from "../utils/api";
import "./ChatBox.css";

const INPUT_MIN_HEIGHT = 56;
const INPUT_MAX_HEIGHT = 180;

const createTemporaryMessage = (role, content) => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  isTemporary: true,
  createdAt: new Date().toISOString(),
});

const formatMessageTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const formatDateDivider = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getDayKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "invalid-date";
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const buildMessageItems = (messages) => {
  const items = [];
  let currentDayKey = null;

  for (const message of messages) {
    const nextDayKey = getDayKey(message.createdAt);

    if (nextDayKey !== currentDayKey) {
      currentDayKey = nextDayKey;
      items.push({
        type: "date",
        id: `date-${currentDayKey}`,
        label: formatDateDivider(message.createdAt),
      });
    }

    items.push({
      type: "message",
      message,
    });
  }

  return items;
};

export default function ChatBox() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = `${INPUT_MIN_HEIGHT}px`;
    textarea.style.height = `${Math.min(textarea.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  }, [input]);

  useEffect(() => {
    if (!copiedMessageId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedMessageId(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copiedMessageId]);

  const openConversation = async (conversationId) => {
    try {
      setError("");
      setActiveConversationId(conversationId);
      const data = await conversationApi.get(conversationId);
      setMessages(data.conversation.messages || []);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: data.conversation.title,
                createdAt: data.conversation.createdAt,
                updatedAt: data.conversation.updatedAt,
              }
            : conversation
        )
      );
    } catch (err) {
      setError(err.message || "Không thể mở cuộc trò chuyện.");
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await conversationApi.list();
        const items = data.conversations || [];
        setConversations(items);

        if (items.length > 0) {
          await openConversation(items[0].id);
        } else {
          const created = await conversationApi.create();
          const conversation = created.conversation;
          setConversations([conversation]);
          setActiveConversationId(conversation.id);
          setMessages([]);
        }
      } catch (err) {
        setError(err.message || "Không thể tải dữ liệu hội thoại.");
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const handleCreateConversation = async () => {
    if (loading) {
      return;
    }

    try {
      setError("");
      const data = await conversationApi.create();
      const conversation = data.conversation;
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages([]);
    } catch (err) {
      setError(err.message || "Không thể tạo cuộc trò chuyện mới.");
    }
  };

  const handleRenameConversation = async (conversation) => {
    const nextTitle = window.prompt("Nhập tên mới cho cuộc trò chuyện", conversation.title);

    if (!nextTitle || nextTitle.trim() === conversation.title) {
      return;
    }

    try {
      setError("");
      const data = await conversationApi.update(conversation.id, nextTitle.trim());
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                title: data.conversation.title,
                updatedAt: data.conversation.updatedAt,
              }
            : item
        )
      );

      if (activeConversationId === conversation.id) {
        setMessages(data.conversation.messages || []);
      }
    } catch (err) {
      setError(err.message || "Không thể đổi tên cuộc trò chuyện.");
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (loading || !window.confirm("Xóa cuộc trò chuyện này?")) {
      return;
    }

    try {
      setError("");
      await conversationApi.remove(conversationId);
      const remaining = conversations.filter(
        (conversation) => conversation.id !== conversationId
      );
      setConversations(remaining);

      if (activeConversationId === conversationId) {
        if (remaining.length > 0) {
          await openConversation(remaining[0].id);
        } else {
          const created = await conversationApi.create();
          const conversation = created.conversation;
          setConversations([conversation]);
          setActiveConversationId(conversation.id);
          setMessages([]);
        }
      }
    } catch (err) {
      setError(err.message || "Không thể xóa cuộc trò chuyện.");
    }
  };

  const handleCopyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
    } catch {
      setError("Không thể sao chép nội dung tin nhắn.");
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();

    if (!trimmed || loading || !activeConversationId) {
      return;
    }

    setError("");
    setLoading(true);
    setInput("");

    const optimisticUserMessage = createTemporaryMessage("user", trimmed);
    const thinkingMessage = createTemporaryMessage("ai", "Đang suy nghĩ...");

    setMessages((prev) => [...prev, optimisticUserMessage, thinkingMessage]);

    try {
      const data = await conversationApi.sendMessage(activeConversationId, trimmed);
      setMessages(data.conversation.messages || []);
      setConversations((prev) => {
        const withoutActive = prev.filter(
          (conversation) => conversation.id !== data.conversation.id
        );

        return [
          {
            id: data.conversation.id,
            title: data.conversation.title,
            createdAt: data.conversation.createdAt,
            updatedAt: data.conversation.updatedAt,
            lastMessage: data.aiMessage.content,
          },
          ...withoutActive,
        ];
      });
    } catch (err) {
      const message = err.message || "Không thể gửi tin nhắn.";
      setError(message);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === thinkingMessage.id
            ? {
                ...item,
                content: message,
                error: true,
              }
            : item
        )
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const messageItems = buildMessageItems(messages);

  return (
    <div className={`chat-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-heading">
            <p className="sidebar-eyebrow">Trợ lý AI</p>
            <h1>{sidebarCollapsed ? "Chat" : "Đoạn chat"}</h1>
          </div>
          <div className="sidebar-top-actions">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
            <button type="button" className="new-chat-btn" onClick={handleCreateConversation}>
              {sidebarCollapsed ? "+" : "Cuộc trò chuyện mới"}
            </button>
          </div>
        </div>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                conversation.id === activeConversationId ? "active" : ""
              }`}
            >
              <button
                type="button"
                className="conversation-main"
                onClick={() => openConversation(conversation.id)}
                title={conversation.title}
              >
                <span className="conversation-title">{conversation.title}</span>
                {!sidebarCollapsed && (
                  <span className="conversation-preview">
                    {conversation.lastMessage || "Chưa có tin nhắn"}
                  </span>
                )}
              </button>
              {!sidebarCollapsed && (
                <div className="conversation-actions">
                  <button
                    type="button"
                    className="conversation-action"
                    onClick={() => handleRenameConversation(conversation)}
                    disabled={loading}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="conversation-action danger"
                    onClick={() => handleDeleteConversation(conversation.id)}
                    disabled={loading}
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="sidebar-eyebrow">Không gian chat</p>
            <h2>{activeConversation?.title || "Đang tải..."}</h2>
          </div>
          <div className="chat-meta">
            <span>{loading ? "AI đang phản hồi" : "Sẵn sàng"}</span>
            <span>Enter để gửi • Shift+Enter xuống dòng</span>
          </div>
        </header>

        <div className="chat-body">
          {bootstrapping ? (
            <div className="message-group">
              <div className="message ai message-loading">Đang tải cuộc trò chuyện...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="message-group">
              <div className="message ai">
                Bắt đầu một câu hỏi mới để tạo lịch sử như ChatGPT.
              </div>
            </div>
          ) : (
            messageItems.map((item) => {
              if (item.type === "date") {
                return (
                  <div key={item.id} className="date-divider">
                    <span>{item.label}</span>
                  </div>
                );
              }

              const { message } = item;

              return (
                <div
                  key={message.id}
                  className={`message-group ${message.role === "user" ? "user" : "ai"}`}
                >
                  <div className="message-stack">
                    <div
                      className={`message ${message.role} ${message.error ? "error" : ""} ${
                        message.isTemporary ? "message-loading" : ""
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === "ai" && !message.isTemporary && (
                      <button
                        type="button"
                        className="copy-message-btn"
                        onClick={() => handleCopyMessage(message)}
                      >
                        {copiedMessageId === message.id ? "Đã chép" : "Sao chép"}
                      </button>
                    )}
                  </div>
                  <div className="message-time">{formatMessageTime(message.createdAt)}</div>
                </div>
              );
            })
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-shell">
          <div className="chat-input">
            <textarea
              ref={textareaRef}
              value={input}
              placeholder="Nhập câu hỏi..."
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !activeConversationId}
              type="button"
            >
              {loading ? "Đang gửi..." : "Gửi"}
            </button>
          </div>

          {error && <div className="chat-error">{error}</div>}
        </div>
      </section>
    </div>
  );
}
