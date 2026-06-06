import { Volume2 } from "lucide-react";

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export default function MessageBubble({ message, onSpeak, onAction }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`message-bubble ${isAssistant ? "assistant" : "user"}`}>
      <div className="bubble-content">
        <p>{message.text}</p>
        {isAssistant ? (
          <button className="speak-button" type="button" aria-label="Read response aloud" onClick={() => onSpeak(message.text)}>
            <Volume2 size={16} />
          </button>
        ) : null}
      </div>
      <footer>
        <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
      </footer>
      {isAssistant && message.followUps?.length ? (
        <div className="follow-up-row">
          {message.followUps.map((action) => (
            <button key={action} type="button" onClick={() => onAction(action)}>
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
