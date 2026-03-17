import { useState, useMemo } from 'react';
import ReactionCard from './ReactionCard';

export default function ReactionStream({ reactions, chapterData, onShowConcept, onUpdateReaction, reader, onAddReply, onDeleteReaction, onDeleteReply, revealed }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return reactions;
    return reactions.filter((r) => r.reader === filter);
  }, [reactions, filter]);

  // If not revealed, only show the current reader's reactions
  const visible = revealed ? filtered : filtered.filter((r) => r.reader === reader);

  return (
    <div className="reactions-section">
      <div className="reactions-header">
        <h2 className="reactions-title">Reactions</h2>
        {revealed && (
          <div className="filter-pills">
            <button
              className={`filter-pill${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-pill${filter === 'Keith' ? ' active' : ''}`}
              onClick={() => setFilter('Keith')}
            >
              Keith
            </button>
            <button
              className={`filter-pill${filter === 'Danielle' ? ' active' : ''}`}
              onClick={() => setFilter('Danielle')}
            >
              Danielle
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <p>No reactions yet. Add your thoughts as you read.</p>
        </div>
      ) : (
        <div className="reaction-stream">
          {visible.map((r) => (
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
      )}
    </div>
  );
}
