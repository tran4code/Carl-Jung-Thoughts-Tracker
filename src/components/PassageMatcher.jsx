import { useMemo, useState } from 'react';
import { buildCorpusIndex, findTopMatches } from '../utils/textSimilarity';
import PassageHighlight from './PassageHighlight';

export default function PassageMatcher({ chapterData, reactionText, onSelect, selectedPassage, onPassageExpand }) {
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);

  const corpusIndex = useMemo(() => buildCorpusIndex(chapterData), [chapterData]);

  const handleSearch = () => {
    if (!corpusIndex || !reactionText?.trim()) return;
    const results = findTopMatches(reactionText, corpusIndex, 3);
    setMatches(results);
    setSearched(true);
  };

  const handleSelect = (match) => {
    onSelect({ start: match.id, end: match.id });
    setMatches([]);
    setSearched(false);
  };

  const handleClear = () => {
    onSelect(null);
    setMatches([]);
    setSearched(false);
  };

  // Show selected passage with expand buttons
  if (selectedPassage) {
    return (
      <div className="passage-matcher">
        <PassageHighlight
          chapterData={chapterData}
          passageStart={selectedPassage.start}
          passageEnd={selectedPassage.end}
          onUpdate={(_, updates) => {
            if (updates.passageStart) onPassageExpand({ ...selectedPassage, start: updates.passageStart });
            if (updates.passageEnd) onPassageExpand({ ...selectedPassage, end: updates.passageEnd });
          }}
          reactionId="preview"
        />
        <button className="btn btn-secondary btn-small" style={{ marginTop: '0.5rem' }} onClick={handleClear}>
          Clear Passage
        </button>
      </div>
    );
  }

  return (
    <div className="passage-matcher">
      <button
        className="btn btn-secondary btn-small"
        onClick={handleSearch}
        disabled={!reactionText?.trim()}
      >
        Find Passage
      </button>

      {searched && matches.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
          No matching passages found
        </p>
      )}

      {matches.length > 0 && (
        <div className="passage-match-results">
          {matches.map((m) => (
            <div
              key={m.id}
              className="passage-match-item"
              onClick={() => handleSelect(m)}
            >
              <div className="passage-match-text">{m.text}</div>
              <div className="passage-match-page">p. {m.page}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
