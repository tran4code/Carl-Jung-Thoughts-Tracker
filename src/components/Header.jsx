import PresenceIndicator from './PresenceIndicator';

export default function Header({ reader, otherReader, otherName, onChangeReader }) {
  return (
    <header className="header">
      <div className="header-title">Man & His Symbols</div>
      <div className="header-right">
        <PresenceIndicator otherReader={otherReader} otherName={otherName} />
        <span className={`reader-badge ${reader.toLowerCase()}`}>{reader}</span>
        <button
          onClick={onChangeReader}
          style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}
        >
          switch
        </button>
      </div>
    </header>
  );
}
