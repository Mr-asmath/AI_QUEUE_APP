const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

export async function sendMessage({ message, sessionId }) {
  const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId })
  });

  if (!response.ok) {
    throw new Error("Unable to send message");
  }

  return response.json();
}

export async function fetchSuggestions() {
  const response = await fetch(`${API_BASE_URL}/api/chat/suggestions`);
  if (!response.ok) throw new Error("Unable to load suggestions");
  return response.json();
}

export async function sendFeedback(payload) {
  const response = await fetch(`${API_BASE_URL}/api/chat/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("Unable to send feedback");
  return response.json();
}
