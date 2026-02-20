export default function TopBar({ meta }) {
  return (
    <div className="reading-top-bar">
      <span className="top-bar-title">
        Man &amp; His Symbols — Ch. {meta?.id ? ['', 'I', 'II', 'III', 'IV', 'V'][meta.id] || meta.id : ''}
      </span>
    </div>
  );
}
