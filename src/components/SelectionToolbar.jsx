export default function SelectionToolbar({ sentenceCount, onReact, onClear }) {
  return (
    <div className="selection-toolbar">
      <span className="selection-count">
        {sentenceCount} sentence{sentenceCount !== 1 ? 's' : ''}
      </span>
      <button className="btn btn-primary btn-small" onClick={onReact}>
        React
      </button>
      <button className="btn btn-secondary btn-small" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
