import { useState, useRef, useCallback } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function VoiceSearch({ onResult }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(!!SpeechRecognition);
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  if (!supported) return null;

  return (
    <button
      className={`passage-search-btn${listening ? ' listening' : ''}`}
      onClick={listening ? stop : start}
      title={listening ? 'Stop listening' : 'Speak to search'}
    >
      <span className="passage-search-icon">{listening ? '...' : '🎙'}</span>
      {listening ? 'Listening...' : 'Speak'}
    </button>
  );
}
