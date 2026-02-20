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

    // Heartbeat — keep lastSeen fresh so the other client can detect staleness
    const heartbeat = setInterval(setOnline, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') setOffline();
      else setOnline();
    };

    window.addEventListener('beforeunload', setOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      setOffline();
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', setOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
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
