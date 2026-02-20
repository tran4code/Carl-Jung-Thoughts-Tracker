import { useState } from 'react';

export default function SectionChecklist({ sections, sectionProgress, reader }) {
  const [confirming, setConfirming] = useState(null);

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
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
