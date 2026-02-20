import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function matchPassage(transcription, chapterJson) {
  const fn = httpsCallable(functions, 'matchPassage');
  const result = await fn({ transcription, chapterJson });
  return result.data;
}

export async function analyzeDream(dreamText, chapterJson) {
  const fn = httpsCallable(functions, 'analyzeDream');
  const result = await fn({ dreamText, chapterJson });
  return result.data;
}

export async function generateDiscussionQuestions(keithReactions, danielleReactions, chapterJson) {
  const fn = httpsCallable(functions, 'generateDiscussionQuestions');
  const result = await fn({ keithReactions, danielleReactions, chapterJson });
  return result.data;
}
