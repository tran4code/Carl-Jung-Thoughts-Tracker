import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import chaptersMeta from '../data/chapters-meta.json';
import MiniConstellation from './MiniConstellation';

export default function ChapterList({ onSelect }) {
  const [sealStatus, setSealStatus] = useState({});

  useEffect(() => {
    async function fetchStatus() {
      const status = {};
      for (const ch of chaptersMeta) {
        const q = query(
          collection(db, 'reactions'),
          where('chapterId', '==', ch.id),
          where('isBlindReaction', '==', true)
        );
        try {
          const snap = await getDocs(q);
          const readers = snap.docs.map((d) => d.data().reader);
          status[ch.id] = {
            keith: readers.includes('Keith'),
            danielle: readers.includes('Danielle'),
          };
        } catch {
          status[ch.id] = { keith: false, danielle: false };
        }
      }
      setSealStatus(status);
    }
    fetchStatus();
  }, []);

  const getSealLabel = (chId) => {
    const s = sealStatus[chId];
    if (!s) return null;
    if (s.keith && s.danielle) return 'Ready to reveal';
    if (s.keith) return 'Keith has sealed';
    if (s.danielle) return 'Danielle has sealed';
    return 'Unsealed';
  };

  return (
    <div className="chapter-list">
      {chaptersMeta.map((ch) => (
        <div
          key={ch.id}
          className="chapter-card"
          onClick={() => onSelect(ch.id)}
        >
          <div className="chapter-number">Chapter {ch.id}</div>
          <div className="chapter-title">{ch.title}</div>
          <div className="chapter-author">{ch.author}</div>
          <div className="chapter-summary">{ch.summary}</div>
          <MiniConstellation chapterId={ch.id} />
          <div className="chapter-seal-status">
            <span className="seal-icon">
              {sealStatus[ch.id]?.keith && sealStatus[ch.id]?.danielle ? '\u{1F513}' : '\u{1F512}'}
            </span>
            <span>{getSealLabel(ch.id)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
