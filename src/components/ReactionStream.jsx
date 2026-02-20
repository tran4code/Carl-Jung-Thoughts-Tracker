import ReactionCard from './ReactionCard';

export default function ReactionStream({ reactions, chapterData, onShowConcept, onUpdateReaction }) {
  if (reactions.length === 0) {
    return (
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
        No reactions yet. Add your thoughts as you read.
      </p>
    );
  }

  return (
    <div className="reaction-stream">
      {reactions.map((r) => (
        <ReactionCard
          key={r.id}
          reaction={r}
          chapterData={chapterData}
          onShowConcept={onShowConcept}
          onUpdate={onUpdateReaction}
        />
      ))}
    </div>
  );
}
