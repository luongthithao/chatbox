const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Yeu cau that bai voi ma ${response.status}`);
  }

  return data;
};

export const conversationApi = {
  list: async () => request("/api/conversations"),
  create: async (title = "") =>
    request("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  get: async (conversationId) => request(`/api/conversations/${conversationId}`),
  update: async (conversationId, title) =>
    request(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  remove: async (conversationId) =>
    request(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    }),
  sendMessage: async (conversationId, content) =>
    request(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
