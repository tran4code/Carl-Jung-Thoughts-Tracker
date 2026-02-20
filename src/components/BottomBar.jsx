import { useState, useCallback, useMemo } from 'react';
import { REACTION_TAGS } from './TagPicker';

const tagMap = Object.fromEntries(REACTION_TAGS.map((t) => [t.key, t]));

function dotColorClass(reader) {
  if (reader === 'Keith') return 'gold';
  if (reader === 'Danielle') return 'rose';
  return 'gold';
}

export default function BottomBar({
  sectionMetrics, currentSectionIndex, scrollProgress,
  reactionPositions, goToSection, reader,
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetView, setSheetView] = useState('map');
  const [expandedSheetSection, setExpandedSheetSection] = useState(null);

  const toggleSheet = useCallback(() => {
    setIsSheetOpen((prev) => !prev);
  }, []);

  const handleSheetSectionClick = useCallback((index) => {
    setExpandedSheetSection((prev) => prev === index ? null : index);
    goToSection(index);
  }, [goToSection]);

  // Current section label
  const currentLabel = sectionMetrics[currentSectionIndex]?.section?.title || '';

  // Build cumulative positions for section segments
  const segmentPositions = useMemo(() => {
    let offset = 0;
    return sectionMetrics.map((m) => {
      const pos = { left: offset * 100, width: m.fraction * 100 };
      offset += m.fraction;
      return pos;
    });
  }, [sectionMetrics]);

  // Reactions grouped by section for the sheet
  const reactionsBySection = useMemo(() => {
    const map = {};
    for (const rp of reactionPositions) {
      if (!map[rp.sectionIndex]) map[rp.sectionIndex] = [];
      map[rp.sectionIndex].push(rp.reaction);
    }
    return map;
  }, [reactionPositions]);

  // Viewport fraction for minimap
  const viewportFraction = useMemo(() => {
    if (typeof window === 'undefined') return 0.2;
    return Math.min(0.5, window.innerHeight / (document.documentElement.scrollHeight || 1));
  }, [scrollProgress]);

  if (!sectionMetrics.length) return null;

  return (
    <div className="mobile-nav">
      {/* Bottom sheet (slides up above the bar) */}
      <div className={`bb-bottom-sheet${isSheetOpen ? ' open' : ''}`}>
        <div className="bb-sheet-handle" />

        <div className="bb-sheet-zoom-row">
          <span className="bb-sheet-zoom-label">View</span>
          <div className="bb-zoom-toggle">
            <button
              className={`bb-zt-btn${sheetView === 'sections' ? ' active' : ''}`}
              onClick={() => setSheetView('sections')}
            >
              Sections
            </button>
            <button
              className={`bb-zt-btn${sheetView === 'map' ? ' active' : ''}`}
              onClick={() => setSheetView('map')}
            >
              Map
            </button>
          </div>
        </div>

        {sheetView === 'map' ? (
          <div className="bb-sheet-minimap">
            <div className="bb-minimap-rail">
              <div
                className="bb-mm-viewport"
                style={{
                  top: `${scrollProgress * 100}%`,
                  height: `${viewportFraction * 100}%`,
                }}
              />
              {sectionMetrics.map((m, i) => {
                const top = segmentPositions[i]?.left || 0;
                const height = segmentPositions[i]?.width || 0;
                const sectionReactions = reactionsBySection[i] || [];
                return (
                  <div
                    key={m.section.id}
                    className={`bb-mm-section${i === currentSectionIndex ? ' current' : ''}`}
                    style={{ top: `${top}%`, height: `${height}%` }}
                    onClick={() => goToSection(i)}
                  >
                    <div className="bb-mm-section-name">{m.section.title}</div>
                    <div className="bb-mm-dots">
                      {sectionReactions.slice(0, 5).map((r) => (
                        <div key={r.id} className={`bb-mm-dot ${dotColorClass(r.reader)}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bb-sheet-list">
            {sectionMetrics.map((m, i) => {
              const sectionReactions = reactionsBySection[i] || [];
              const isExpanded = expandedSheetSection === i;
              return (
                <div
                  key={m.section.id}
                  className={`bb-sheet-section${i === currentSectionIndex ? ' current' : ''}${isExpanded ? ' expanded' : ''}`}
                  onClick={() => handleSheetSectionClick(i)}
                >
                  <div className="bb-ss-top">
                    <div className="bb-ss-name">{m.section.title}</div>
                  </div>
                  <div className="bb-ss-meta">
                    <div className="bb-ss-dots">
                      {sectionReactions.slice(0, 8).map((r) => (
                        <div key={r.id} className={`bb-ss-dot ${dotColorClass(r.reader)}`} />
                      ))}
                    </div>
                    <span className="bb-ss-count">
                      {sectionReactions.length ? `${sectionReactions.length} reactions` : 'No reactions'}
                    </span>
                  </div>
                  <div className="bb-ss-reactions">
                    {sectionReactions.slice(0, 4).map((r) => {
                      const tag = r.tags?.[0] && tagMap[r.tags[0]];
                      return (
                        <div key={r.id} className="bb-ss-reaction">
                          <div
                            className="bb-ss-r-dot"
                            style={{ background: r.reader === 'Keith' ? 'var(--accent-gold)' : 'var(--accent-rose)' }}
                          />
                          <div className="bb-ss-r-text">
                            {tag && <span className="bb-ss-r-tag">{tag.emoji}</span>}
                            &ldquo;{(r.text || '').slice(0, 80)}{(r.text || '').length > 80 ? '...' : ''}&rdquo;
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent bottom bar */}
      <div className="bb-bottom-bar">
        <div className="bb-mini-track">
          <div className="bb-mini-track-line">
            <div className="bb-mini-track-fill" style={{ width: `${scrollProgress * 100}%` }} />

            {/* Section dividers */}
            {segmentPositions.slice(1).map((pos, i) => (
              <div
                key={`div-${i}`}
                className="bb-mini-div"
                style={{ left: `${pos.left}%` }}
              />
            ))}

            {/* Reaction dots */}
            {reactionPositions.map((rp) => (
              <div
                key={rp.reaction.id}
                className={`bb-mini-dot ${dotColorClass(rp.reaction.reader)}`}
                style={{ left: `${rp.posInChapter * 100}%` }}
              />
            ))}
          </div>
          <div className="bb-mini-section-label">{currentLabel}</div>
        </div>

        <button
          className={`bb-expand-btn${isSheetOpen ? ' open' : ''}`}
          onClick={toggleSheet}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 5L7 1L13 5" /><path d="M1 9L7 13L13 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
