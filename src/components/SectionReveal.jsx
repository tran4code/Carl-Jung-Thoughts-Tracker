import { useState, useEffect, useCallback } from 'react';
import ReactionCard from './ReactionCard';
import { sortByPassagePosition } from '../utils/sortReactions';

export default function SectionReveal({
  reader, chapterId, sectionId, sectionTitle,
  myReactions, otherReactions,
  sectionProgress, markSectionFinished,
  chapterData, onShowConcept, onAddReply, onUpdateReaction, onDeleteReaction, onDeleteReply,
}) {
  const [confirming, setConfirming] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const keithFinished = sectionProgress.keith;
  const danielleFinished = sectionProgress.danielle;
  const bothFinished = keithFinished && danielleFinished;
  const iFinished = reader === 'Keith' ? keithFinished : danielleFinished;
  const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';

  // Auto-reveal if previously revealed
  useEffect(() => {
    if (bothFinished && localStorage.getItem(`jung-revealed-${chapterId}-${sectionId}`)) {
      setRevealed(true);
    }
  }, [bothFinished, chapterId, sectionId]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    localStorage.setItem(`jung-revealed-${chapterId}-${sectionId}`, 'true');
  }, [chapterId, sectionId]);

  const handleMarkFinished = async () => {
    try {
      await markSectionFinished(sectionId, reader);
    } catch {
      // Error handled by caller
    }
  };

  // No reactions for this section from either reader → skip
  if (myReactions.length === 0 && otherReactions.length === 0 && !iFinished) {
    return (
      <div className="section-reveal-card">
        <button
          className="btn btn-secondary section-finish-btn"
          onClick={() => setConfirming(true)}
        >
          {confirming ? null : `Finished "${sectionTitle}"?`}
        </button>
        {confirming && (
          <div className="section-confirm">
            <p className="section-confirm-text">
              Done with this section? You can still add reactions later.
            </p>
            <div className="section-confirm-btns">
              <button className="btn btn-primary" onClick={handleMarkFinished}>
                Yes, Done
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
                Keep Reading
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Revealed state: show other reader's reactions
  if (revealed && bothFinished && otherReactions.length > 0) {
    const allReactions = sortByPassagePosition([...myReactions, ...otherReactions]);
    return (
      <div className="section-reveal-card section-revealed">
        <div className="section-reveal-header">
          <span className="section-reveal-label">{otherName}'s reactions</span>
          <span className="section-reveal-count">{otherReactions.length}</span>
        </div>
        <div className="section-reveal-reactions">
          {allReactions.filter(r => r.reader !== reader).map((r) => (
            <ReactionCard
              key={r.id}
              reaction={r}
              chapterData={chapterData}
              onShowConcept={onShowConcept}
              onUpdate={onUpdateReaction}
              reader={reader}
              onAddReply={onAddReply}
              onDeleteReaction={r.reader === reader ? onDeleteReaction : undefined}
              onDeleteReply={onDeleteReply}
            />
          ))}
        </div>
      </div>
    );
  }

  // Both finished but not yet revealed
  if (bothFinished && !revealed) {
    return (
      <div className="section-reveal-card">
        <div className="section-progress-dots">
          <ProgressDot name="Keith" finished={keithFinished} />
          <ProgressDot name="Danielle" finished={danielleFinished} />
        </div>
        <button className="btn btn-primary section-reveal-btn" onClick={handleReveal}>
          Reveal {otherName}'s Reactions
        </button>
      </div>
    );
  }

  // I finished, waiting for other
  if (iFinished) {
    return (
      <div className="section-reveal-card">
        <div className="section-progress-dots">
          <ProgressDot name="Keith" finished={keithFinished} />
          <ProgressDot name="Danielle" finished={danielleFinished} />
        </div>
        <p className="section-waiting-text">
          Waiting for {otherName}...
        </p>
      </div>
    );
  }

  // Not finished — show mark as finished
  return (
    <div className="section-reveal-card">
      {confirming ? (
        <div className="section-confirm">
          <p className="section-confirm-text">
            Done with this section? You can still add reactions later.
          </p>
          <div className="section-confirm-btns">
            <button className="btn btn-primary" onClick={handleMarkFinished}>
              Yes, Done
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
              Keep Reading
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-secondary section-finish-btn"
          onClick={() => setConfirming(true)}
        >
          Finished "{sectionTitle}"? ({myReactions.length} reaction{myReactions.length !== 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}

function ProgressDot({ name, finished }) {
  const color = name === 'Keith' ? 'var(--keith)' : 'var(--danielle)';
  return (
    <div className="progress-reader">
      <div
        className={`progress-dot ${finished ? 'finished' : ''}`}
        style={{ borderColor: color, color }}
      />
      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{name}</span>
    </div>
  );
}
