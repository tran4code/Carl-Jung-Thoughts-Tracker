import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import chaptersMeta from '../data/chapters-meta.json';
import MiniConstellation from './MiniConstellation';

export default function ChapterList({ onSelect }) {
  const [chapterStatus, setChapterStatus] = useState({});
  const [chapterReactions, setChapterReactions] = useState({});

  useEffect(() => {
    async function fetchStatus() {
      const status = {};
      const reactions = {};
      for (const ch of chaptersMeta) {
        try {
          // Query chapter progress
          const progressSnap = await getDocs(
            query(collection(db, 'chapterProgress'), where('chapterId', '==', ch.id))
          );
          const progressDocs = progressSnap.docs.map((d) => d.data());
          status[ch.id] = {
            keith: progressDocs.some((d) => d.reader === 'Keith' && d.finished),
            danielle: progressDocs.some((d) => d.reader === 'Danielle' && d.finished),
          };

          // Query reactions for constellation
          const reactionsSnap = await getDocs(
            query(collection(db, 'reactions'), where('chapterId', '==', ch.id))
          );
          reactions[ch.id] = reactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          status[ch.id] = { keith: false, danielle: false };
          reactions[ch.id] = [];
        }
      }
      setChapterStatus(status);
      setChapterReactions(reactions);
    }
    fetchStatus();
  }, []);

  const getStatusLabel = (chId) => {
    const s = chapterStatus[chId];
    if (!s) return null;
    if (s.keith && s.danielle) {
      return localStorage.getItem(`jung-revealed-${chId}`) ? 'Revealed' : 'Ready to reveal';
    }
    if (s.keith) return 'Keith has finished';
    if (s.danielle) return 'Danielle has finished';
    const reactions = chapterReactions[chId] || [];
    if (reactions.length > 0) return 'Reading in progress';
    return 'Not started';
  };

  const getStatusIcon = (chId) => {
    const s = chapterStatus[chId];
    if (!s) return '\u{1F4D6}';
    if (s.keith && s.danielle) return '\u{2705}';
    if (s.keith || s.danielle) return '\u{23F3}';
    const reactions = chapterReactions[chId] || [];
    if (reactions.length > 0) return '\u{1F4D6}';
    return '\u{1F4D5}';
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
          <MiniConstellation reactions={chapterReactions[ch.id] || []} />
          <div className="chapter-seal-status">
            <span className="seal-icon">{getStatusIcon(ch.id)}</span>
            <span>{getStatusLabel(ch.id)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
