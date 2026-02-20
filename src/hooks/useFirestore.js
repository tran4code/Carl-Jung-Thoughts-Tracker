import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, arrayUnion, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useReactions(chapterId) {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chapterId == null) return;
    const q = query(
      collection(db, 'reactions'),
      where('chapterId', '==', chapterId),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [chapterId]);

  const addReaction = useCallback(async (data) => {
    return addDoc(collection(db, 'reactions'), {
      ...data,
      chapterId,
      timestamp: serverTimestamp(),
    });
  }, [chapterId]);

  const updateReaction = useCallback(async (id, data) => {
    return updateDoc(doc(db, 'reactions', id), data);
  }, []);

  const addReply = useCallback(async (reactionId, reply) => {
    const replyData = {
      id: `r_${Date.now()}_${reply.reader.toLowerCase()}`,
      reader: reply.reader,
      text: reply.text,
      timestamp: Date.now(),
    };
    if (reply.audioClips) replyData.audioClips = reply.audioClips;
    return updateDoc(doc(db, 'reactions', reactionId), {
      replies: arrayUnion(replyData),
    });
  }, []);

  const deleteReaction = useCallback(async (id) => {
    return deleteDoc(doc(db, 'reactions', id));
  }, []);

  const deleteReply = useCallback(async (reactionId, replyId) => {
    const snap = await getDoc(doc(db, 'reactions', reactionId));
    if (!snap.exists()) return;
    const replies = (snap.data().replies || []).filter((r) => r.id !== replyId);
    return updateDoc(doc(db, 'reactions', reactionId), { replies });
  }, []);

  return { reactions, loading, addReaction, updateReaction, addReply, deleteReaction, deleteReply };
}

export function useChapterReactions(chapterId, currentReader) {
  const { reactions, loading, addReaction, updateReaction, addReply, deleteReaction, deleteReply } = useReactions(chapterId);

  const myReactions = reactions.filter((r) => r.reader === currentReader);
  const otherReactions = reactions.filter((r) => r.reader !== currentReader);

  return {
    myReactions,
    otherReactions,
    allReactions: reactions,
    loading,
    addReaction,
    updateReaction,
    addReply,
    deleteReaction,
    deleteReply,
  };
}

export function useChapterProgress(chapterId) {
  const [progress, setProgress] = useState({ keith: false, danielle: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chapterId == null) return;
    const q = query(
      collection(db, 'chapterProgress'),
      where('chapterId', '==', chapterId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const state = { keith: false, danielle: false };
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.reader === 'Keith' && data.finished) state.keith = true;
        if (data.reader === 'Danielle' && data.finished) state.danielle = true;
      });
      setProgress(state);
      setLoading(false);
    });
    return unsub;
  }, [chapterId]);

  const markFinished = useCallback(async (reader) => {
    const q = query(
      collection(db, 'chapterProgress'),
      where('chapterId', '==', chapterId),
      where('reader', '==', reader)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'chapterProgress', snap.docs[0].id), {
        finished: true,
        finishedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'chapterProgress'), {
        chapterId,
        reader,
        finished: true,
        finishedAt: serverTimestamp(),
      });
    }
  }, [chapterId]);

  return {
    keithFinished: progress.keith,
    danielleFinished: progress.danielle,
    bothFinished: progress.keith && progress.danielle,
    loading,
    markFinished,
  };
}

export function useDreams(reader) {
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = reader
      ? query(collection(db, 'dreams'), where('reader', '==', reader), orderBy('timestamp', 'desc'))
      : query(collection(db, 'dreams'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDreams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [reader]);

  const addDream = useCallback(async (data) => {
    return addDoc(collection(db, 'dreams'), {
      ...data,
      timestamp: serverTimestamp(),
    });
  }, []);

  return { dreams, loading, addDream };
}

export function useImaginationResponses(chapterId) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    if (chapterId == null) return;
    const q = query(
      collection(db, 'imaginationResponses'),
      where('chapterId', '==', chapterId),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setResponses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [chapterId]);

  const addResponse = useCallback(async (data) => {
    return addDoc(collection(db, 'imaginationResponses'), {
      ...data,
      chapterId,
      timestamp: serverTimestamp(),
    });
  }, [chapterId]);

  return { responses, addResponse };
}

export function useDiscussionQuestions(chapterId) {
  const [questions, setQuestions] = useState(null);

  useEffect(() => {
    if (chapterId == null) return;
    const q = query(
      collection(db, 'discussionQuestions'),
      where('chapterId', '==', chapterId)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setQuestions({ id: d.id, ...d.data() });
      }
    });
    return unsub;
  }, [chapterId]);

  const saveQuestions = useCallback(async (data) => {
    return addDoc(collection(db, 'discussionQuestions'), {
      ...data,
      chapterId,
      timestamp: serverTimestamp(),
    });
  }, [chapterId]);

  return { questions, saveQuestions };
}

export function useAllReactions() {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'reactions'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return reactions;
}
