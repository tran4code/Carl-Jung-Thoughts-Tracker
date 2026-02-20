import { useMemo, useState, useCallback } from 'react';
import { buildCorpusIndex, buildFuseIndex, findPassages } from '../utils/textSimilarity';
import PassageHighlight from './PassageHighlight';
import VoiceSearch from './VoiceSearch';
import CameraScanner from './CameraScanner';

export default function PassageMatcher({ chapterData, reactionText, onSelect, selectedPassage, onPassageExpand }) {
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const corpusIndex = useMemo(() => buildCorpusIndex(chapterData), [chapterData]);
  const fuseIndex = useMemo(() => buildFuseIndex(chapterData), [chapterData]);

  const runSearch = useCallback((text, method = 'auto') => {
    if (!text?.trim()) return;
    const results = findPassages(text, corpusIndex, fuseIndex, method);
    setMatches(results);
    setSearched(true);
  }, [corpusIndex, fuseIndex]);

  // Voice A: Web Speech API result -> cosine similarity
  const handleVoiceResult = useCallback((transcript) => {
    setSearchQuery(transcript);
    runSearch(transcript, 'cosine');
  }, [runSearch]);

  // Camera: OCR result -> fuse.js fuzzy search
  const handleCameraResult = useCallback((text) => {
    if (!text) return;
    setSearchQuery(text);
    runSearch(text, 'fuse');
  }, [runSearch]);

  // Manual search from reaction text
  const handleManualSearch = () => {
    runSearch(reactionText, 'auto');
  };

  // Typed query search
  const handleQuerySearch = () => {
    runSearch(searchQuery, 'auto');
  };

  const handleSelect = (match) => {
    onSelect({ start: match.id, end: match.id });
    setMatches([]);
    setSearched(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setMatches([]);
    setSearched(false);
    setSearchQuery('');
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
      <div className="passage-finder-label">Find Passage</div>

      <div className="passage-finder-tools">
        <VoiceSearch onResult={handleVoiceResult} />
        <CameraScanner onResult={handleCameraResult} />
        <button
          className="passage-search-btn"
          onClick={handleManualSearch}
          disabled={!reactionText?.trim()}
          title="Match from your reaction text"
        >
          <span className="passage-search-icon">🔍</span>
          Auto-match
        </button>
      </div>

      <div className="passage-finder-query">
        <input
          type="text"
          placeholder="Or type a phrase to search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuerySearch()}
        />
      </div>

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
