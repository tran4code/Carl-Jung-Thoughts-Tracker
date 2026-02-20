const REACTION_TAGS = [
  { key: 'wow', label: 'Wow', emoji: '✨' },
  { key: 'resonates', label: 'Resonates', emoji: '💛' },
  { key: 'connection', label: 'Connection', emoji: '🔗' },
  { key: 'confused', label: 'Confused', emoji: '🌀' },
  { key: 'disagree', label: 'Disagree', emoji: '⚡' },
  { key: 'question', label: 'Question', emoji: '❓' },
  { key: 'return', label: 'Return', emoji: '🌑' },
];

export { REACTION_TAGS };

export default function TagPicker({ selected, onChange }) {
  const toggle = (key) => {
    if (selected.includes(key)) {
      onChange(selected.filter((t) => t !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="tag-picker">
      {REACTION_TAGS.map((tag) => (
        <button
          key={tag.key}
          className={`tag-option${selected.includes(tag.key) ? ' selected' : ''}`}
          onClick={() => toggle(tag.key)}
        >
          <span className="tag-emoji">{tag.emoji}</span>
          {tag.label}
        </button>
      ))}
    </div>
  );
}
