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

  const expandLeft = () => {
    if (startIdx > 0) {
      const newStart = allSentences[startIdx - 1].id;
      setStart(newStart);
      if (onUpdate && reactionId) {
        onUpdate(reactionId, { passageStart: newStart });
      }
    }
  };

  const expandRight = () => {
    if (endIdx < allSentences.length - 1) {
      const newEnd = allSentences[endIdx + 1].id;
      setEnd(newEnd);
      if (onUpdate && reactionId) {
        onUpdate(reactionId, { passageEnd: newEnd });
      }
    }
  };

  return (
    <div className="passage-container">
      {startIdx > 0 && (
        <button className="passage-expand-btn left" onClick={expandLeft}>&lsaquo;</button>
      )}
      <div className="passage-text">
        {passage.map((s, i) => (
          <span key={s.id} style={{
            animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
          }}>
            {s.text}{' '}
          </span>
        ))}
      </div>
      {endIdx < allSentences.length - 1 && (
        <button className="passage-expand-btn right" onClick={expandRight}>&rsaquo;</button>
      )}
      <div className="passage-page">
        {startPage === endPage ? `p. ${startPage}` : `pp. ${startPage}–${endPage}`}
      </div>
    </div>
  );
}
