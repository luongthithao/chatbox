import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send_message", {
      text: message,
      time: new Date().toLocaleTimeString(),
    });

    setMessage("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        <div style={styles.header}>💬 Chat App</div>

        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={styles.message}>
              <span>{msg.text}</span>
              <small>{msg.time}</small>
            </div>
          ))}
        </div>

        <div style={styles.inputBox}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.button}>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f0f2f5",
  },
  chatBox: {
    width: "400px",
    height: "500px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    borderRadius: "10px",
    boxShadow: "0 0 20px rgba(0,0,0,0.1)",
  },
  header: {
    padding: "15px",
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "1px solid #ddd",
  },
  messages: {
    flex: 1,
    padding: "10px",
    overflowY: "auto",
  },
  message: {
    marginBottom: "10px",
    padding: "8px",
    background: "#e6f3ff",
    borderRadius: "6px",
  },
  inputBox: {
    display: "flex",
    borderTop: "1px solid #ddd",
  },
  input: {
    flex: 1,
    padding: "10px",
    border: "none",
    outline: "none",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    background: "#007bff",
    color: "#fff",
    cursor: "pointer",
  },
};
