import { useMemo } from 'react';
import { useAllReactions } from '../hooks/useFirestore';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));
const SYMBOL_NAMES = symbolsData.map((s) => s.name);

export default function Constellation() {
  const reactions = useAllReactions();

  const { nodes, edges, keithCounts, danielleCounts, maxCount } = useMemo(() => {
    const counts = {};
    const coOccurrences = {};
    const kCounts = {};
    const dCounts = {};

    for (const r of reactions) {
      const tags = r.tags || [];
      for (const tag of tags) {
        counts[tag] = (counts[tag] || 0) + 1;
        if (r.reader === 'Keith') kCounts[tag] = (kCounts[tag] || 0) + 1;
        else dCounts[tag] = (dCounts[tag] || 0) + 1;
      }
      // Co-occurrences
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [tags[i], tags[j]].sort().join('|');
          coOccurrences[key] = (coOccurrences[key] || 0) + 1;
        }
      }
    }

    // Only include symbols that have at least one occurrence
    const activeSymbols = SYMBOL_NAMES.filter((s) => counts[s]);
    const max = Math.max(1, ...Object.values(counts));

    // Position nodes in a circle, Self at center
    const cx = 250, cy = 250, radius = 180;
    const selfIndex = activeSymbols.indexOf('Self');
    const others = activeSymbols.filter((s) => s !== 'Self');
    const nodePositions = {};

    if (selfIndex !== -1) {
      nodePositions['Self'] = { x: cx, y: cy };
    }

    others.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
      nodePositions[s] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    const nodeList = activeSymbols.map((s) => ({
      name: s,
      count: counts[s] || 0,
      ...nodePositions[s],
      keith: !!kCounts[s],
      danielle: !!dCounts[s],
    }));

    const edgeList = Object.entries(coOccurrences).map(([key, weight]) => {
      const [a, b] = key.split('|');
      return { from: a, to: b, weight, ...getEdgePositions(nodePositions, a, b) };
    });

    return { nodes: nodeList, edges: edgeList, keithCounts: kCounts, danielleCounts: dCounts, maxCount: max };
  }, [reactions]);

  if (nodes.length === 0) {
    return (
      <div className="constellation-container">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', textAlign: 'center' }}>
          Archetype Constellation
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '2rem' }}>
          No symbols tagged yet. Start annotating chapters to build the constellation.
        </p>
      </div>
    );
  }

  return (
    <div className="constellation-container">
      <h2 style={{
        fontFamily: 'var(--font-display)', color: 'var(--gold)',
        textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem',
      }}>
        Archetype Constellation
      </h2>

      <svg className="constellation-svg" viewBox="0 0 500 500">
        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="rgba(212, 168, 67, 0.15)"
            strokeWidth={Math.min(e.weight, 4)}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node) => {
          const r = 8 + (node.count / maxCount) * 16;
          return (
            <g key={node.name} className="constellation-node">
              <circle
                cx={node.x} cy={node.y} r={r}
                fill={`${symbolColorMap[node.name] || '#666'}44`}
                stroke={symbolColorMap[node.name] || '#666'}
                strokeWidth={1.5}
              />
              {/* Reader dots */}
              {node.keith && (
                <circle cx={node.x - 4} cy={node.y + r + 8} r={3} fill="var(--keith)" />
              )}
              {node.danielle && (
                <circle cx={node.x + 4} cy={node.y + r + 8} r={3} fill="var(--danielle)" />
              )}
              <text
                x={node.x} y={node.y - r - 6}
                className="constellation-label"
                style={{ fontSize: node.name === 'Self' ? '12px' : '10px' }}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Per-reader breakdowns */}
      <div className="constellation-breakdowns">
        <ReaderBreakdown name="Keith" counts={keithCounts} maxCount={maxCount} />
        <ReaderBreakdown name="Danielle" counts={danielleCounts} maxCount={maxCount} />
      </div>
    </div>
  );
}

function ReaderBreakdown({ name, counts, maxCount }) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const color = name === 'Keith' ? 'var(--keith)' : 'var(--danielle)';

  if (sorted.length === 0) return null;

  return (
    <div>
      <div className={`breakdown-title ${name.toLowerCase()}`}>{name}</div>
      {sorted.map(([symbol, count]) => (
        <div key={symbol} className="bar-row">
          <span className="bar-label">{symbol}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(count / maxCount) * 100}%`,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function getEdgePositions(positions, a, b) {
  const pa = positions[a];
  const pb = positions[b];
  if (!pa || !pb) return { x1: 0, y1: 0, x2: 0, y2: 0 };
  return { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y };
}
