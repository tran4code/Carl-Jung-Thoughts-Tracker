import ConceptHighlighter from './ConceptHighlighter';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function DreamEntry({ dream, onShowConcept }) {
  const readerColor = dream.reader === 'Keith' ? 'var(--keith)' : 'var(--danielle)';
  const ts = dream.timestamp?.toDate?.();
  const dateStr = ts ? ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="dream-entry">
      <div className="dream-meta">
        <span style={{ color: readerColor, fontWeight: 600 }}>{dream.reader}</span>
        <span>Ch. {dream.chapterId}</span>
        {dateStr && <span>{dateStr}</span>}
      </div>

      <div className="dream-text">
        <ConceptHighlighter text={dream.text} onShowConcept={onShowConcept} />
      </div>

      {dream.detectedSymbols && dream.detectedSymbols.length > 0 && (
        <div className="reaction-tags" style={{ marginTop: '0.75rem' }}>
          {dream.detectedSymbols.map((tag) => (
            <span
              key={tag}
              className="tag-chip"
              style={{
                background: `${symbolColorMap[tag] || '#666'}22`,
                color: symbolColorMap[tag] || '#999',
                border: `1px solid ${symbolColorMap[tag] || '#666'}44`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {dream.connections && dream.connections.length > 0 && (
        <div className="dream-connections">
          {dream.connections.map((conn, i) => (
            <div key={i} className="dream-connection">
              {conn.explanation}
              {conn.sentenceId && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.25rem' }}>
                  Passage: {conn.sentenceId}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
