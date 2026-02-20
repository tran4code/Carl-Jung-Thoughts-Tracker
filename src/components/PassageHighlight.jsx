import { useState, useMemo } from 'react';

export default function PassageHighlight({
  chapterData, passageStart, passageEnd, reactionId, onUpdate,
}) {
  const [start, setStart] = useState(passageStart);
  const [end, setEnd] = useState(passageEnd || passageStart);

  // Build flat list of all sentences
  const allSentences = useMemo(() => {
    if (!chapterData?.paragraphs) return [];
    const sentences = [];
    for (const p of chapterData.paragraphs) {
      for (const s of p.sentences) {
        sentences.push({ ...s, page: p.page });
      }
    }
    return sentences;
  }, [chapterData]);

  const startIdx = allSentences.findIndex((s) => s.id === start);
  const endIdx = allSentences.findIndex((s) => s.id === end);

  if (startIdx === -1 || endIdx === -1 || allSentences.length === 0) return null;

  const passage = allSentences.slice(startIdx, endIdx + 1);
  const startPage = passage[0]?.page;
  const endPage = passage[passage.length - 1]?.page;
  const canTrim = passage.length > 1;

  const canExpandUp = startIdx > 0;
  const canExpandDown = endIdx < allSentences.length - 1;
  const peekAbove = canExpandUp ? allSentences[startIdx - 1] : null;
  const peekBelow = canExpandDown ? allSentences[endIdx + 1] : null;

  const expandUp = () => {
    if (!canExpandUp) return;
    const newStart = allSentences[startIdx - 1].id;
    setStart(newStart);
    if (onUpdate && reactionId) {
      onUpdate(reactionId, { passageStart: newStart });
    }
  };

  const expandDown = () => {
    if (!canExpandDown) return;
    const newEnd = allSentences[endIdx + 1].id;
    setEnd(newEnd);
    if (onUpdate && reactionId) {
      onUpdate(reactionId, { passageEnd: newEnd });
    }
  };

  const trimTop = () => {
    if (!canTrim) return;
    const newStart = allSentences[startIdx + 1].id;
    setStart(newStart);
    if (onUpdate && reactionId) {
      onUpdate(reactionId, { passageStart: newStart });
    }
  };

  const trimBottom = () => {
    if (!canTrim) return;
    const newEnd = allSentences[endIdx - 1].id;
    setEnd(newEnd);
    if (onUpdate && reactionId) {
      onUpdate(reactionId, { passageEnd: newEnd });
    }
  };

  return (
    <div className="passage-container">
      <div className="passage-body">
        <div className="passage-content">
          {/* Peek above — partially readable preview */}
          {peekAbove && (
            <div className="passage-peek above" onClick={expandUp}>
              {peekAbove.text}
            </div>
          )}

          {/* Selected sentences */}
          <div className="passage-text">
            {passage.map((s) => (
              <span key={s.id}>{s.text} </span>
            ))}
          </div>

          {/* Peek below — partially readable preview */}
          {peekBelow && (
            <div className="passage-peek below" onClick={expandDown}>
              {peekBelow.text}
            </div>
          )}
        </div>

        {/* Fixed button stack on the right — always same 4 positions */}
        <div className="passage-controls">
          <button
            className="passage-ctrl-btn"
            onClick={expandUp}
            disabled={!canExpandUp}
            title="Add sentence above"
          >
            +&#x25B2;
          </button>
          <button
            className="passage-ctrl-btn"
            onClick={trimTop}
            disabled={!canTrim}
            title="Remove first sentence"
          >
            &minus;&#x25B2;
          </button>
          <button
            className="passage-ctrl-btn"
            onClick={trimBottom}
            disabled={!canTrim}
            title="Remove last sentence"
          >
            &minus;&#x25BC;
          </button>
          <button
            className="passage-ctrl-btn"
            onClick={expandDown}
            disabled={!canExpandDown}
            title="Add sentence below"
          >
            +&#x25BC;
          </button>
        </div>
      </div>

      <div className="passage-page">
        {startPage === endPage ? `p. ${startPage}` : `pp. ${startPage}–${endPage}`}
      </div>
    </div>
  );
}
