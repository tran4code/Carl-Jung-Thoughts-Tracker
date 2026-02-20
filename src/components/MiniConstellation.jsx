import { useMemo } from 'react';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function MiniConstellation({ reactions = [] }) {
  const symbols = useMemo(() => {
    const tagSet = new Set();
    for (const r of reactions) {
      for (const t of r.tags || []) {
        tagSet.add(t);
      }
    }
    return [...tagSet];
  }, [reactions]);

  if (symbols.length === 0) return null;

  return (
    <div className="mini-constellation">
      {symbols.map((s) => (
        <div
          key={s}
          className="mini-node"
          title={s}
          style={{ background: symbolColorMap[s] || '#666' }}
        />
      ))}
    </div>
  );
}
