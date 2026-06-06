import { useState } from "react";
import { Send } from "lucide-react";
import VoiceInputButton from "./VoiceInputButton.jsx";

export default function ChatInput({ onSend }) {
  const [value, setValue] = useState("");

  function submit(event) {
    event.preventDefault();
    const message = value.trim();
    if (!message) return;
    onSend(message);
    setValue("");
  }

  return (
    <form className="chat-input" onSubmit={submit}>
      <VoiceInputButton onTranscript={(text) => setValue(text)} />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask about tokens, queues, counters..."
        aria-label="Message AI Queue Assistant"
      />
      <button className="send-button" type="submit" aria-label="Send message">
        <Send size={18} />
      </button>
    </form>
  );
}
