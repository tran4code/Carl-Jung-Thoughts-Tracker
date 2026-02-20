import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function transcribeAudio(audioBase64, mimeType) {
  const fn = httpsCallable(functions, 'transcribeAudio');
  const result = await fn({
    audioBase64,
    mimeType: mimeType || 'audio/webm',
  });
  return result.data.text;
}
