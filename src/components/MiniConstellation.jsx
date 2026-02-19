import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function MiniConstellation({ chapterId }) {
  const [symbols, setSymbols] = useState([]);

  useEffect(() => {
    if (chapterId == null) return;
    const q = query(
      collection(db, 'reactions'),
      where('chapterId', '==', chapterId)
    );
    getDocs(q).then((snap) => {
      const tagSet = new Set();
      snap.docs.forEach((d) => {
        const tags = d.data().tags || [];
        tags.forEach((t) => tagSet.add(t));
      });
      setSymbols([...tagSet]);
    }).catch(() => {});
  }, [chapterId]);

  if (symbols.length === 0) return null;

  return (
    <div className="mini-constellation">
      {symbols.map((s) => (
        <div
          key={s}
          className="mini-node"
          title={s}
          style={{ background: symbolColorMap[s] || '#666' }}
        />
      ))}
    </div>
  );
}
