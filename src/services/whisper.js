import { WHISPER_API_URL } from '../config';

export async function transcribeAudio(audioBlob) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}
