import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

export default function VoiceInputButton({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  );

  useEffect(() => {
    if (!SpeechRecognition) return;

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      onTranscript(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [SpeechRecognition, onTranscript]);

  function toggleListening() {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.start();
    setIsListening(true);
  }

  return (
    <button
      className={`voice-button ${isListening ? "listening" : ""}`}
      type="button"
      onClick={toggleListening}
      disabled={!isSupported}
      title={isSupported ? "Start or stop voice input" : "Speech recognition is not supported in this browser"}
      aria-label={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      {isListening ? <span className="waveform" aria-hidden="true"><i /><i /><i /></span> : null}
    </button>
  );
}
