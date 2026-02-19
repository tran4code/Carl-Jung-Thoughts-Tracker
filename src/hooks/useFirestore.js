import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs,
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

  return { reactions, loading, addReaction, updateReaction };
}

export function useBlindReactions(chapterId) {
  const { reactions, loading, addReaction } = useReactions(chapterId);
  const blindReactions = reactions.filter((r) => r.isBlindReaction);

  const keithReaction = blindReactions.find((r) => r.reader === 'Keith');
  const danielleReaction = blindReactions.find((r) => r.reader === 'Danielle');
  const bothSubmitted = !!keithReaction && !!danielleReaction;

  return {
    blindReactions,
    keithReaction,
    danielleReaction,
    bothSubmitted,
    loading,
    addReaction,
    allReactions: reactions,
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
