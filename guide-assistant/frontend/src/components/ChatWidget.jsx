import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatWindow from "./ChatWindow.jsx";

function createSessionId() {
  const existing = localStorage.getItem("ai-queue-guide-session");
  if (existing) return existing;

  const next = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
  localStorage.setItem("ai-queue-guide-session", next);
  return next;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(1);
  const sessionId = useMemo(createSessionId, []);

  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  return (
    <div className="chat-widget">
      <div className={`chat-panel ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
        {isOpen && <ChatWindow sessionId={sessionId} />}
      </div>

      <button
        className={`floating-button ${isOpen ? "active" : ""}`}
        type="button"
        aria-label={isOpen ? "Close AI Queue Assistant" : "Open AI Queue Assistant"}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={28} />}
        {unread > 0 && !isOpen ? <span className="notification-badge">{unread}</span> : null}
      </button>
    </div>
  );
}
