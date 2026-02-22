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
      for (const s of (p.sentences || [])) {
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
          {/* Top controls — expand/trim above */}
          <div className="passage-edge-controls top">
            {canExpandUp && (
              <button className="passage-edge-btn" onClick={expandUp}>
                <span className="passage-edge-icon">&uarr;</span> Show more above
              </button>
            )}
            {canTrim && (
              <button className="passage-edge-btn trim" onClick={trimTop}>
                <span className="passage-edge-icon">&darr;</span> Show less
              </button>
            )}
          </div>

          {/* Peek above — tappable preview */}
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

          {/* Peek below — tappable preview */}
          {peekBelow && (
            <div className="passage-peek below" onClick={expandDown}>
              {peekBelow.text}
            </div>
          )}

          {/* Bottom controls — expand/trim below */}
          <div className="passage-edge-controls bottom">
            {canTrim && (
              <button className="passage-edge-btn trim" onClick={trimBottom}>
                <span className="passage-edge-icon">&uarr;</span> Show less
              </button>
            )}
            {canExpandDown && (
              <button className="passage-edge-btn" onClick={expandDown}>
                <span className="passage-edge-icon">&darr;</span> Show more below
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="passage-page">
        {startPage === endPage ? `p. ${startPage}` : `pp. ${startPage}–${endPage}`}
      </div>
    </div>
  );
}
