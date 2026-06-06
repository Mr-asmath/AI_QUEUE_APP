import { useEffect, useRef, useState } from "react";
import { Bot, Settings } from "lucide-react";
import { fetchSuggestions, sendMessage } from "../api.js";
import ChatInput from "./ChatInput.jsx";
import MessageBubble from "./MessageBubble.jsx";
import SuggestionChips from "./SuggestionChips.jsx";
import TypingAnimation from "./TypingAnimation.jsx";
import SettingsPanel from "./SettingsPanel.jsx";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi, I'm AI Queue Assistant.\nHow can I assist you today?",
  timestamp: new Date().toISOString(),
  followUps: []
};

const defaultSuggestions = [
  "Create Token",
  "Check Queue",
  "Call Next Token",
  "Counter Management",
  "Branch Management",
  "Analytics Help",
  "TV Display Setup",
  "Login Help",
  "Contact Support"
];

export default function ChatWindow({ sessionId }) {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [suggestions, setSuggestions] = useState(defaultSuggestions.map((label) => ({ label })));
  const [isTyping, setIsTyping] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ ttsEnabled: false, darkMode: false });
  const scrollerRef = useRef(null);

  useEffect(() => {
    fetchSuggestions()
      .then((data) => setSuggestions(data.suggestions))
      .catch(() => setSuggestions(defaultSuggestions.map((label) => ({ label }))));
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isTyping]);

  useEffect(() => {
    document.documentElement.dataset.aiQueueTheme = settings.darkMode ? "dark" : "light";
  }, [settings.darkMode]);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\n/g, " "));
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function handleSend(message) {
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: message,
      timestamp: new Date().toISOString()
    };

    setMessages((current) => [...current, userMessage]);
    setIsTyping(true);

    try {
      const data = await sendMessage({ message, sessionId });
      const botMessage = {
        id: data.messageId,
        role: "assistant",
        text: data.response.text,
        timestamp: data.timestamp,
        intent: data.response.intent,
        followUps: data.response.followUps || []
      };

      setMessages((current) => [...current, botMessage]);
      if (settings.ttsEnabled) speak(botMessage.text);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: "I couldn't reach the assistant service. Please check that the backend is running.",
          timestamp: new Date().toISOString(),
          followUps: ["Contact Support"]
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <section className="chat-window" aria-label="AI Queue Guide Assistant">
      <header className="chat-header">
        <div className="assistant-avatar">
          <Bot size={22} />
        </div>
        <div>
          <h2>AI Queue Assistant</h2>
          <p>Online guide service</p>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Open assistant settings"
          onClick={() => setSettingsOpen((value) => !value)}
        >
          <Settings size={19} />
        </button>
      </header>

      {settingsOpen ? (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      ) : null}

      <div className="message-list" ref={scrollerRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onSpeak={speak} onAction={handleSend} />
        ))}
        {isTyping ? <TypingAnimation /> : null}
      </div>

      <SuggestionChips suggestions={suggestions} onSelect={handleSend} />
      <ChatInput onSend={handleSend} />
    </section>
  );
}
