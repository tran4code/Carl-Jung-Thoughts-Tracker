import { useState, useMemo } from 'react';

export default function SectionChecklist({
  sections, chapterData, sectionProgress, reader, otherReactions,
}) {
  const [confirming, setConfirming] = useState(null);
  const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';

  // Count other reader's reactions per section
  const otherCountBySection = useMemo(() => {
    if (!chapterData?.paragraphs || !otherReactions?.length) return {};
    const { paragraphs } = chapterData;
    const map = {};

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const startIdx = paragraphs.findIndex((p) => p.id === sec.startParagraph);
      const nextSec = sections[i + 1];
      const endParaId = nextSec?.startParagraph;
      let endIdx = endParaId ? paragraphs.findIndex((p) => p.id === endParaId) : paragraphs.length;
      if (startIdx === -1) continue;
      if (endIdx === -1) endIdx = paragraphs.length;

      const sentIds = new Set();
      for (let j = startIdx; j < endIdx; j++) {
        for (const s of (paragraphs[j].sentences || [])) {
          sentIds.add(s.id);
        }
      }

      // Count reactions with passages in this section, plus page-only reactions
      const pageRange = [];
      for (let j = startIdx; j < endIdx; j++) {
        if (paragraphs[j].page) pageRange.push(paragraphs[j].page);
      }
      const pages = new Set(pageRange);

      map[sec.id] = otherReactions.filter((r) => {
        if (r.passageStart && sentIds.has(r.passageStart)) return true;
        if (r.page && pages.has(r.page)) return true;
        return false;
      }).length;
    }
    return map;
  }, [sections, chapterData, otherReactions]);

  const handleFinish = async (sectionId) => {
    try {
      await sectionProgress.markSectionFinished(sectionId, reader);
      setConfirming(null);
    } catch {
      // silently handled
    }
  };

  return (
    <div className="section-checklist">
      <h4 className="section-checklist-title">Section Progress</h4>
      {sections.map((sec) => {
        const sp = sectionProgress.getSectionProgress(sec.id);
        const iDone = reader === 'Keith' ? sp.keith : sp.danielle;
        const otherDone = reader === 'Keith' ? sp.danielle : sp.keith;
        const isConfirming = confirming === sec.id;
        const otherCount = otherCountBySection[sec.id] || 0;

        return (
          <div key={sec.id} className={`sc-row${iDone ? ' done' : ''}`}>
            {isConfirming ? (
              <div className="sc-confirm">
                <span className="sc-confirm-text">Done with "{sec.title}"?</span>
                <div className="sc-confirm-btns">
                  <button className="sc-yes" onClick={() => handleFinish(sec.id)}>Yes</button>
                  <button className="sc-no" onClick={() => setConfirming(null)}>No</button>
                </div>
              </div>
            ) : (
              <button
                className="sc-item"
                onClick={() => !iDone && setConfirming(sec.id)}
                disabled={iDone}
              >
                <span className={`sc-check${iDone ? ' checked' : ''}`}>
                  {iDone ? '\u2713' : '\u25CB'}
                </span>
                <span className="sc-label">{sec.title}</span>
                {iDone && otherDone && (
                  <span className="sc-both">both done</span>
                )}
                {iDone && !otherDone && (
                  <span className="sc-waiting">waiting...</span>
                )}
                {!iDone && otherDone && otherCount > 0 && (
                  <span className="sc-teaser">
                    {otherName} left {otherCount}
                  </span>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
