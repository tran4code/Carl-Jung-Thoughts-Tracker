import { useState, useEffect } from 'react';
import ReactionCard from './ReactionCard';
import { sortByPassagePosition } from '../utils/sortReactions';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function ChapterReveal({
  reader, chapterId, myReactions, otherReactions,
  bothFinished, keithFinished, danielleFinished,
  onMarkFinished, onReveal, revealed,
  chapterData, onShowConcept, onAddReply, onUpdateReaction, onDeleteReaction, onDeleteReply,
}) {
  const [confirming, setConfirming] = useState(false);
  const iFinished = reader === 'Keith' ? keithFinished : danielleFinished;
  const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';

  // Auto-reveal if previously revealed (localStorage)
  useEffect(() => {
    if (bothFinished && localStorage.getItem(`jung-revealed-${chapterId}`)) {
      onReveal();
    }
  }, [bothFinished, chapterId, onReveal]);

  // Revealed state: show interleaved timeline
  if (revealed && bothFinished) {
    const allReactions = sortByPassagePosition([...myReactions, ...otherReactions]);

    // Find shared tags
    const myTags = new Set();
    const otherTags = new Set();
    myReactions.forEach((r) => (r.tags || []).forEach((t) => myTags.add(t)));
    otherReactions.forEach((r) => (r.tags || []).forEach((t) => otherTags.add(t)));
    const shared = [...myTags].filter((t) => otherTags.has(t));

    return (
      <div>
        <h3 className="section-heading">All Reactions</h3>
        <div className="reveal-timeline">
          {allReactions.map((r) => (
            <div
              key={r.id}
              className={r.reader === 'Keith' ? 'reveal-keith' : 'reveal-danielle'}
            >
              <ReactionCard
                reaction={r}
                chapterData={chapterData}
                onShowConcept={onShowConcept}
                onUpdate={r.reader === reader ? onUpdateReaction : undefined}
                reader={reader}
                onAddReply={onAddReply}
                onDeleteReaction={r.reader === reader ? onDeleteReaction : undefined}
                onDeleteReply={onDeleteReply}
              />
            </div>
          ))}
        </div>
        {shared.length > 0 && (
          <div style={{
            textAlign: 'center',
            margin: '1rem 0',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            Shared symbols: {shared.map((s) => (
              <span
                key={s}
                className="tag-chip shared-symbol"
                style={{ marginLeft: '0.3rem' }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Both finished but not yet revealed
  if (bothFinished && !revealed) {
    return (
      <div className="chapter-progress-card">
        <div className="chapter-progress">
          <ProgressDot name="Keith" finished={keithFinished} />
          <ProgressDot name="Danielle" finished={danielleFinished} />
        </div>
        <p style={{
          color: 'var(--gold)',
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 600,
          textAlign: 'center',
          margin: '1rem 0',
        }}>
          Both readers have finished
        </p>
        <button
          className="btn btn-primary"
          style={{ display: 'block', margin: '0 auto' }}
          onClick={() => {
            localStorage.setItem(`jung-revealed-${chapterId}`, 'true');
            onReveal();
          }}
        >
          Reveal All Reactions
        </button>
      </div>
    );
  }

  // I finished, waiting for other
  if (iFinished) {
    return (
      <div className="chapter-progress-card">
        <div className="chapter-progress">
          <ProgressDot name="Keith" finished={keithFinished} />
          <ProgressDot name="Danielle" finished={danielleFinished} />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Waiting for {otherName} to finish reading...
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          You submitted {myReactions.length} reaction{myReactions.length !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  // Not finished yet — show mark as finished
  return (
    <div className="chapter-progress-card">
      <div className="chapter-progress">
        <ProgressDot name="Keith" finished={keithFinished} />
        <ProgressDot name="Danielle" finished={danielleFinished} />
      </div>
      {confirming ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Done reading this chapter? You won't be able to add more reactions after finishing.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={onMarkFinished}>
              Yes, I'm Finished
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
              Keep Reading
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-secondary mark-finished-btn"
          onClick={() => setConfirming(true)}
        >
          Mark as Finished ({myReactions.length} reaction{myReactions.length !== 1 ? 's' : ''})
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
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{name}</span>
    </div>
  );
}
