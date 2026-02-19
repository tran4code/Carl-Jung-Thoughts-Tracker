import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function usePresence(currentReader, currentChapter) {
  const [otherReader, setOtherReader] = useState(null);
  const otherName = currentReader === 'Keith' ? 'Danielle' : 'Keith';

  useEffect(() => {
    if (!currentReader) return;

    const myRef = doc(db, 'presence', currentReader);

    const setOnline = () => {
      setDoc(myRef, {
        online: true,
        lastSeen: serverTimestamp(),
        currentChapter: currentChapter ?? null,
      }, { merge: true }).catch(() => {});
    };

    const setOffline = () => {
      setDoc(myRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    };

    setOnline();

    window.addEventListener('beforeunload', setOffline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') setOffline();
      else setOnline();
    });

    return () => {
      setOffline();
      window.removeEventListener('beforeunload', setOffline);
    };
  }, [currentReader, currentChapter]);

  useEffect(() => {
    if (!otherName) return;
    const unsub = onSnapshot(doc(db, 'presence', otherName), (snap) => {
      if (snap.exists()) {
        setOtherReader(snap.data());
      }
    });
    return unsub;
  }, [otherName]);

  return { otherReader, otherName };
}
