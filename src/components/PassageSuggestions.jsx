import { useMemo } from 'react';

function HighlightedText({ text, matchedWords }) {
  if (!matchedWords || matchedWords.length === 0) return text;

  const pattern = matchedWords
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`\\b((?:${pattern})\\w*)\\b`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<mark key={match.index}>{match[0]}</mark>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export default function PassageSuggestions({
  matches,
  onSelect,
  onManualSearch,
}) {
  const visible = matches && matches.length > 0;

  return (
    <div className={`suggestions-panel${visible ? ' visible' : ''}`}>
      <div className="suggestions-header">
        <span className="suggestions-label">Matching passages</span>
        <span className="suggestions-matching">
          {matches?.length || 0} found in this chapter
        </span>
      </div>

      <div className="suggestions-container">
        {(matches || []).map((m) => (
          <div
            key={m.id}
            className="suggestion-card"
            onClick={() => onSelect(m)}
          >
            <div className="suggestion-text">
              <HighlightedText text={m.text} matchedWords={m.matchedWords} />
            </div>

            <div className="suggestion-meta">
              <span className="suggestion-page">p. {m.page}</span>
              <span className="suggestion-confidence">{m.confidence}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="manual-search-link" onClick={onManualSearch}>
        None of these? Search manually &rarr;
      </div>
    </div>
  );
}
