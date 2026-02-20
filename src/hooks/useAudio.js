import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/whisper';

const MAX_DURATION_S = 60;

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Strip the data URL prefix (e.g. "data:audio/webm;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export function useAudio() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const maxTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(maxTimerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        clearTimeout(maxTimerRef.current);
      };

      mediaRecorder.start();
      setRecording(true);

      // Duration counter
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Auto-stop at max duration
      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      }, MAX_DURATION_S * 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  const uploadAndTranscribe = useCallback(async (reader, chapterId) => {
    if (!audioBlob) return null;
    setTranscribing(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || 'audio/webm';
      const text = await transcribeAudio(audioBase64, mimeType);
      setTranscription(text);
      setTranscribing(false);

      return { audioBase64, audioMimeType: mimeType, transcription: text };
    } catch (err) {
      setError('Transcription failed. You can type your reaction instead.');
      setTranscribing(false);
      return null;
    }
  }, [audioBlob]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setTranscription(null);
    setError(null);
    setDuration(0);
  }, []);

  return {
    recording, audioBlob, transcribing, transcription, error, duration,
    maxDuration: MAX_DURATION_S,
    startRecording, stopRecording, uploadAndTranscribe, reset,
  };
}
