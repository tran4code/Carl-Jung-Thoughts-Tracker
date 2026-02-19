import { useState, useRef, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { transcribeAudio } from '../services/whisper';

export function useAudio() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
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
      };

      mediaRecorder.start();
      setRecording(true);
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
      // Upload to Firebase Storage
      const fileName = `voice-memos/${reader}/${chapterId}/${Date.now()}.webm`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, audioBlob);
      const url = await getDownloadURL(storageRef);
      setAudioUrl(url);

      // Transcribe with Whisper
      const text = await transcribeAudio(audioBlob);
      setTranscription(text);
      setTranscribing(false);

      return { audioUrl: url, transcription: text };
    } catch (err) {
      setError('Transcription failed. You can type your reaction instead.');
      setTranscribing(false);
      return null;
    }
  }, [audioBlob]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription(null);
    setError(null);
  }, []);

  return {
    recording, audioBlob, audioUrl, transcribing, transcription, error,
    startRecording, stopRecording, uploadAndTranscribe, reset,
  };
}
