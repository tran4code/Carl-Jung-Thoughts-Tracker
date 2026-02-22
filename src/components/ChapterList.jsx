import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import chaptersMeta from '../data/chapters-meta.json';
import MiniConstellation from './MiniConstellation';

// Module-level cache so data survives unmount/remount (e.g. page transitions)
let _cachedStatus = {};
let _cachedReactions = {};

// Jungian symbols mapped to each chapter (from prototype)
const CHAPTER_SYMBOLS = {
  1: `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M8 40 Q40 16 72 40 Q40 64 8 40Z"/>
    <circle cx="40" cy="40" r="10"/>
    <circle cx="40" cy="40" r="4" fill="currentColor"/>
  </svg>`,
  2: `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 12 A28 28 0 1 1 38 12" stroke-linecap="round"/>
    <path d="M38 12 L42 8 L40 14 Z" fill="currentColor" stroke="none"/>
    <circle cx="40" cy="40" r="4"/>
  </svg>`,
  3: `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 40 Q40 36 44 36 Q48 36 48 40 Q48 46 42 48 Q34 50 32 42 Q30 32 38 28 Q48 24 52 34 Q56 48 44 54 Q28 60 24 42 Q20 22 36 18 Q54 14 60 36 Q64 56 42 62" stroke-linecap="round"/>
  </svg>`,
  4: `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 12 L68 64 L12 64 Z"/>
    <circle cx="40" cy="42" r="8"/>
    <circle cx="40" cy="42" r="3" fill="currentColor"/>
  </svg>`,
  5: `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <circle cx="40" cy="40" r="30"/>
    <circle cx="40" cy="40" r="20"/>
    <circle cx="40" cy="40" r="8"/>
    <line x1="40" y1="10" x2="40" y2="70"/>
    <line x1="10" y1="40" x2="70" y2="40"/>
  </svg>`,
};

export default function ChapterList({ onSelect, skipEntry }) {
  const [chapterStatus, setChapterStatus] = useState(_cachedStatus);
  const [chapterReactions, setChapterReactions] = useState(_cachedReactions);
  const [revealed, setRevealed] = useState(skipEntry);
  // Capture whether we mounted during a return transition — never replay entry animations
  const mountedDuringReturn = useRef(skipEntry);
  const rowRefs = useRef([]);

  useEffect(() => {
    if (mountedDuringReturn.current) {
      // Already revealed, never re-animate
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Scroll-based glow illumination: cards near viewport center are bright,
  // cards further away dim — as if the fixed symbol-center-glow is a lamp
  const updateGlow = useCallback(() => {
    const viewportCenter = window.innerHeight / 2;
    rowRefs.current.forEach((el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      const maxDistance = window.innerHeight * 0.4;
      const proximity = Math.max(0, 1 - distance / maxDistance);
      // Opacity fades into background instead of going to black
      const opacity = 0.12 + proximity * 0.88;
      el.style.setProperty('--glow-opacity', opacity);
    });
  }, []);

  useEffect(() => {
    if (!revealed) return;
    // Initial computation after entry animations settle
    const initTimer = setTimeout(updateGlow, 1800);
    window.addEventListener('scroll', updateGlow, { passive: true });
    window.addEventListener('resize', updateGlow, { passive: true });
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', updateGlow);
      window.removeEventListener('resize', updateGlow);
    };
  }, [revealed, updateGlow]);

  useEffect(() => {
    async function fetchStatus() {
      const status = {};
      const reactions = {};
      for (const ch of chaptersMeta) {
        try {
          const progressSnap = await getDocs(
            query(collection(db, 'chapterProgress'), where('chapterId', '==', ch.id))
          );
          const progressDocs = progressSnap.docs.map((d) => d.data());
          status[ch.id] = {
            keith: progressDocs.some((d) => d.reader === 'Keith' && d.finished),
            danielle: progressDocs.some((d) => d.reader === 'Danielle' && d.finished),
          };

          const reactionsSnap = await getDocs(
            query(collection(db, 'reactions'), where('chapterId', '==', ch.id))
          );
          reactions[ch.id] = reactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          status[ch.id] = { keith: false, danielle: false };
          reactions[ch.id] = [];
        }
      }
      _cachedStatus = status;
      _cachedReactions = reactions;
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

  const getChapterTier = (chId) => {
    const s = chapterStatus[chId];
    const reactions = chapterReactions[chId] || [];
    if (!s) return 'dormant';
    if (s.keith && s.danielle) return 'unlocked';
    if (s.keith || s.danielle) return 'active';
    if (reactions.length > 0) return 'active';
    return 'dormant';
  };

  // Compute progress for active chapter (ratio of reactions to a rough estimate)
  const getProgress = (chId) => {
    const reactions = chapterReactions[chId] || [];
    // Simple heuristic: each reaction ≈ 1% toward "reading deeply"
    return Math.min(reactions.length * 0.05, 0.95);
  };

  return (
    <div className={`chapter-list-v2${revealed ? ' revealed' : ''}${mountedDuringReturn.current ? ' skip-entry' : ''}`}>
      {/* SVG filter for underwater distortion on dormant cards */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="underwater-distort" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.025"
              numOctaves="3"
              seed="2"
              result="turbulence"
            >
              <animate
                attributeName="baseFrequency"
                values="0.015 0.025;0.018 0.03;0.012 0.022;0.015 0.025"
                dur="8s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {chaptersMeta.map((ch, i) => {
        const tier = getChapterTier(ch.id);
        const progress = getProgress(ch.id);

        return (
          <div
            key={ch.id}
            className="cl-row"
            ref={(el) => { rowRefs.current[i] = el; }}
            style={{ '--stagger': i }}
          >
            {/* Thread column */}
            <div className="cl-thread-col" aria-hidden="true">
              <div className="cl-thread-seg cl-thread-seg--top" />
              <div className={`cl-node cl-node--${tier}`} />
              <div className="cl-thread-seg cl-thread-seg--bottom" />
            </div>

            {/* Card */}
            <div
              className={`cl-card cl-card--${tier}`}
              onClick={() => onSelect(ch.id)}
            >
              {/* Symbol watermark */}
              <div
                className="cl-symbol-bg"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: CHAPTER_SYMBOLS[ch.id] || '' }}
              />

              {/* Spotlight glow (active only) */}
              {tier === 'active' && <div className="cl-spotlight" />}

              {/* Content */}
              <div className="cl-card-content">
                <div className="cl-chapter-num">Chapter {ch.id}</div>
                <div className="cl-chapter-title">{ch.title}</div>
                <div className="cl-chapter-author">{ch.author}</div>
                <div className="cl-chapter-summary">{ch.summary}</div>

                <div className="cl-card-footer">
                  <MiniConstellation reactions={chapterReactions[ch.id] || []} />
                  <div className="cl-status-label">{getStatusLabel(ch.id)}</div>
                </div>

                {/* Progress flame (active only) */}
                {tier === 'active' && progress > 0 && (
                  <div className="cl-progress">
                    <svg className="cl-flame" width="18" height="22" viewBox="0 0 24 30" fill="none">
                      {/* Wick */}
                      <line x1="12" y1="26" x2="12" y2="20" stroke="rgba(80,70,50,0.7)" strokeWidth="1.2" strokeLinecap="round" />
                      {/* Outer flame glow */}
                      <path
                        className="cl-flame-outer"
                        d="M12 4C12 4 6.5 12 6.5 17C6.5 20.5 9 23 12 23C15 23 17.5 20.5 17.5 17C17.5 12 12 4 12 4Z"
                        fill="rgba(201,168,76,0.2)"
                        stroke="rgba(201,168,76,0.35)"
                        strokeWidth="0.5"
                      />
                      {/* Mid flame */}
                      <path
                        className="cl-flame-mid"
                        d="M12 7C12 7 8.5 13 8.5 17C8.5 19.5 10 21 12 21C14 21 15.5 19.5 15.5 17C15.5 13 12 7 12 7Z"
                        fill="rgba(201,168,76,0.45)"
                      />
                      {/* Inner bright core */}
                      <path
                        className="cl-flame-core"
                        d="M12 12C12 12 10 15.5 10 17.5C10 19 10.8 20 12 20C13.2 20 14 19 14 17.5C14 15.5 12 12 12 12Z"
                        fill="rgba(230,200,100,0.7)"
                      />
                    </svg>
                    <div className="cl-progress-bar">
                      <div
                        className="cl-progress-fill"
                        style={{ width: revealed ? `${Math.round(progress * 100)}%` : '0%' }}
                      />
                    </div>
                    <span className="cl-progress-pct">{Math.round(progress * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Unconscious veil (dormant only) */}
              {tier === 'dormant' && (
                <div className="cl-veil">
                  <svg className="cl-veil-symbol" width="32" height="32" viewBox="0 0 80 80" fill="none" stroke="rgba(140,130,115,0.5)" strokeWidth="1">
                    <path d="M12 40 Q40 56 68 40" strokeLinecap="round" />
                    <path d="M12 40 Q40 52 68 40" strokeLinecap="round" opacity="0.5" />
                    <line x1="28" y1="48" x2="26" y2="54" opacity="0.4" />
                    <line x1="40" y1="50" x2="40" y2="57" opacity="0.4" />
                    <line x1="52" y1="48" x2="54" y2="54" opacity="0.4" />
                  </svg>
                  <span className="cl-veil-text">Not yet begun</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
