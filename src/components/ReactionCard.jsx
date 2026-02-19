import PassageHighlight from './PassageHighlight';
import ConceptHighlighter from './ConceptHighlighter';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function ReactionCard({ reaction, chapterData, onShowConcept, onUpdate }) {
  const readerClass = reaction.reader.toLowerCase();

  return (
    <div className={`reaction-card ${readerClass}`}>
      <div className={`reaction-reader ${readerClass}`}>{reaction.reader}</div>

      {reaction.passageStart && chapterData && (
        <PassageHighlight
          chapterData={chapterData}
          passageStart={reaction.passageStart}
          passageEnd={reaction.passageEnd}
          reactionId={reaction.id}
          onUpdate={onUpdate}
        />
      )}

      <div className="reaction-text">
        <ConceptHighlighter text={reaction.text} onShowConcept={onShowConcept} />
      </div>

      {reaction.rawTranscription && reaction.rawTranscription !== reaction.text && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ fontSize: '0.75rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            Original transcription
          </summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem', lineHeight: 1.6 }}>
            {reaction.rawTranscription}
          </p>
        </details>
      )}

      {reaction.tags && reaction.tags.length > 0 && (
        <div className="reaction-tags">
          {reaction.tags.map((tag) => (
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
    </div>
  );
}
