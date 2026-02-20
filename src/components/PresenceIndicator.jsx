import { useState, useEffect } from 'react';

const STALE_MS = 60000; // treat as offline if lastSeen > 1 minute ago

export default function PresenceIndicator({ otherReader, otherName }) {
  const [now, setNow] = useState(Date.now());

  // Re-check staleness every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  if (!otherReader) return null;

  const lastSeen = otherReader.lastSeen?.toMillis?.() ?? otherReader.lastSeen?.seconds * 1000;
  const isStale = lastSeen && (now - lastSeen > STALE_MS);
  const isOnline = otherReader.online && !isStale;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div className={`presence-dot ${isOnline ? 'online' : ''}`} />
      {isOnline && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          {otherName}
          {otherReader.currentChapter && ` · Ch. ${otherReader.currentChapter}`}
        </span>
      )}
    </div>
  );
}
