import symbolsData from '../data/symbols.json';

export default function TagPicker({ selected, onChange }) {
  const toggle = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter((t) => t !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
        Tag symbols (optional)
      </div>
      <div className="tag-picker">
        {symbolsData.map((sym) => (
          <button
            key={sym.name}
            className={`tag-option ${selected.includes(sym.name) ? 'selected' : ''}`}
            style={{
              color: selected.includes(sym.name) ? sym.color : undefined,
              borderColor: selected.includes(sym.name) ? sym.color : undefined,
              background: selected.includes(sym.name) ? `${sym.color}15` : undefined,
            }}
            onClick={() => toggle(sym.name)}
          >
            {sym.name}
          </button>
        ))}
      </div>
    </div>
  );
}
