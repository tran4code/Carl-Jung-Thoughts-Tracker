export default function PresenceIndicator({ otherReader, otherName }) {
  if (!otherReader) return null;

  const isOnline = otherReader.online;

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
