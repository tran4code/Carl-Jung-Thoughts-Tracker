import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { REACTION_TAGS } from './TagPicker';

const tagMap = Object.fromEntries(REACTION_TAGS.map((t) => [t.key, t]));

// How much the zoom track content is stretched relative to the track height
const ZOOM_SCALE = 6;

function dotColorClass(reader) {
  if (reader === 'Keith') return 'gold';
  if (reader === 'Danielle') return 'rose';
  return 'gold';
}

export default function DesktopRail({
  sectionMetrics, currentSectionIndex, scrollProgress,
  reactionPositions, goToSection, goToPosition, pagePositions, reader,
}) {
  const [focusedSection, setFocusedSection] = useState(null);
  const [dotsVisible, setDotsVisible] = useState(true);
  const [hoverPos, setHoverPos] = useState(null);
  const [zoomHoverPos, setZoomHoverPos] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [pageProgress, setPageProgress] = useState(0);
  const trackRef = useRef(null);

  // Clicking a section on the main track toggles the zoom track for that section
  const handleSectionClick = useCallback((index) => {
    setFocusedSection((prev) => prev === index ? null : index);
    goToSection(index);
  }, [goToSection]);

  // Always show all sections on the main track
  const visibleSections = useMemo(() => {
    return sectionMetrics.map((_, i) => i);
  }, [sectionMetrics]);

  // Cumulative positions
  const segmentPositions = useMemo(() => {
    let offset = 0;
    return sectionMetrics.map((m) => {
      const pos = { top: offset, height: m.fraction };
      offset += m.fraction;
      return pos;
    });
  }, [sectionMetrics]);

  // The section currently shown in the zoom track:
  // Derive from currentPage (DOM-based) so it only switches when you're
  // actually reading a page that belongs to the next section
  const zoomIndex = useMemo(() => {
    if (focusedSection === null || !currentPage) return focusedSection;
    for (let i = sectionMetrics.length - 1; i >= 0; i--) {
      if (sectionMetrics[i].startPage && currentPage >= sectionMetrics[i].startPage) {
        return i;
      }
    }
    return 0;
  }, [focusedSection, currentPage, sectionMetrics]);
  const isZoomed = zoomIndex !== null && sectionMetrics[zoomIndex];

  // Viewport indicator
  const viewportFraction = useMemo(() => {
    if (typeof window === 'undefined') return 0.2;
    return Math.min(0.5, window.innerHeight / (document.documentElement.scrollHeight || 1));
  }, [scrollProgress]);

  const vpTop = Math.max(0, scrollProgress * 100);
  const vpH = viewportFraction * 100;

  // Current page + fractional progress within it (for smooth yellow bar)
  useEffect(() => {
    const update = () => {
      const els = document.querySelectorAll('[data-page]');
      const threshold = window.innerHeight * 0.4;
      let foundEl = null;
      let nextEl = null;
      for (let i = 0; i < els.length; i++) {
        const rect = els[i].getBoundingClientRect();
        if (rect.top < threshold && rect.bottom > 0) {
          foundEl = els[i];
          // Find the next element with a different page number
          for (let j = i + 1; j < els.length; j++) {
            if (els[j].getAttribute('data-page') !== foundEl.getAttribute('data-page')) {
              nextEl = els[j];
              break;
            }
          }
        }
      }
      if (foundEl) {
        setCurrentPage(Number(foundEl.getAttribute('data-page')));
        if (nextEl) {
          const startY = foundEl.getBoundingClientRect().top;
          const endY = nextEl.getBoundingClientRect().top;
          const range = endY - startY;
          const frac = range > 0 ? Math.max(0, Math.min(1, (threshold - startY) / range)) : 0;
          setPageProgress(frac);
        } else {
          setPageProgress(0);
        }
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  // Main track hover
  const handleTrackHover = useCallback((e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setHoverPos(y);
  }, []);

  const handleTrackLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  // Find the page number at the main track hover position
  const hoverPage = useMemo(() => {
    if (hoverPos === null || !pagePositions?.length) return null;
    return pagePositions.find((pp) => hoverPos >= pp.posStart && hoverPos < pp.posEnd) || null;
  }, [hoverPos, pagePositions]);

  // Main track click → scroll to page
  const handleTrackClick = useCallback((e) => {
    if (!hoverPage) return;
    e.stopPropagation();
    const el = document.querySelector(`[data-page="${hoverPage.page}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [hoverPage]);

  // Zoom track: all pages in the chapter (continuous numberline)
  const zoomPages = useMemo(() => {
    if (!isZoomed || !pagePositions?.length) return [];
    return pagePositions;
  }, [isZoomed, pagePositions]);

  // Zoom track: all reactions (continuous)
  const zoomReactions = useMemo(() => {
    if (!isZoomed || !dotsVisible) return [];
    return reactionPositions;
  }, [isZoomed, dotsVisible, reactionPositions]);

  // Section header positions on the numberline (for pinned labels)
  const sectionMarkers = useMemo(() => {
    if (!isZoomed || !pagePositions?.length) return [];
    return sectionMetrics.map((m, i) => {
      const sp = segmentPositions[i];
      return {
        index: i,
        title: m.section.title,
        pos: sp.top, // 0-1 position in chapter
      };
    });
  }, [isZoomed, sectionMetrics, segmentPositions, pagePositions]);

  // Yellow position indicator — smoothly interpolates between page midpoints
  // Now uses full chapter range (0-1 → 0-100%)
  const zoomPositionPct = useMemo(() => {
    if (!isZoomed || !currentPage) return null;

    const currIdx = pagePositions.findIndex((pp) => pp.page === currentPage);
    if (currIdx === -1) return null;

    const currMid = pagePositions[currIdx].posMid;
    const nextMid = pagePositions[currIdx + 1]?.posMid ?? 1;
    const pos = currMid + pageProgress * (nextMid - currMid);

    return Math.max(0, Math.min(100, pos * 100));
  }, [isZoomed, currentPage, pageProgress, pagePositions]);

  // Zoom track hover
  const handleZoomHover = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setZoomHoverPos(y);
  }, []);

  const handleZoomLeave = useCallback(() => {
    setZoomHoverPos(null);
  }, []);

  // Find page at zoom hover position (account for content shift + zoom scale)
  const zoomHoverPage = useMemo(() => {
    if (zoomHoverPos === null || !zoomPages.length || !isZoomed) return null;
    const currentPos = (zoomPositionPct ?? 50) / 100;
    const chapterPos = Math.max(0, Math.min(1, currentPos + (zoomHoverPos - 0.5) / ZOOM_SCALE));
    return pagePositions.find((pp) => chapterPos >= pp.posStart && chapterPos < pp.posEnd) || null;
  }, [zoomHoverPos, zoomPages, isZoomed, zoomPositionPct, pagePositions]);

  // Zoom track click → scroll to exact chapter position (continuous)
  const handleZoomClick = useCallback((e) => {
    if (!isZoomed) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const currentPos = (zoomPositionPct ?? 50) / 100;
    const chapterPos = Math.max(0, Math.min(1, currentPos + (y - 0.5) / ZOOM_SCALE));
    goToPosition(chapterPos);
  }, [isZoomed, zoomPositionPct, goToPosition]);

  if (!sectionMetrics.length) return null;

  return (
    <div className="desktop-rail">
      <button
        className={`dr-focus-btn${dotsVisible ? ' active' : ''}`}
        onClick={() => setDotsVisible((prev) => !prev)}
        title={dotsVisible ? 'Hide reaction dots' : 'Show reaction dots'}
      >
        {dotsVisible ? '●' : '○'}
      </button>

      <div className="dr-tracks">
        {/* Zoom track (left) — fixed cursor with scrolling numberline */}
        {isZoomed && (
          <div
            className="dr-zoom-track"
            onMouseMove={handleZoomHover}
            onMouseLeave={handleZoomLeave}
            onClick={handleZoomClick}
          >
            {/* Yellow bar fixed at center */}
            <div className="dr-zoom-pos" />

            {/* Scrolling content — shifted so current position aligns with center */}
            <div
              className="dr-zoom-content"
              style={{
                height: `${ZOOM_SCALE * 100}%`,
                transform: `translateY(${50 / ZOOM_SCALE - (zoomPositionPct ?? 50)}%)`,
              }}
            >
              <div className="dr-track-line" />

              {/* Section header markers pinned on the numberline */}
              {sectionMarkers.map((sm) => (
                <div
                  key={sm.index}
                  className={`dr-zoom-section-marker${sm.index === zoomIndex ? ' current' : ''}`}
                  style={{ top: `${sm.pos * 100}%` }}
                >
                  <span className="dr-zoom-section-label">{sm.title}</span>
                </div>
              ))}

              {/* Page ticks and labels — only every 5th + current page shows a number */}
              {zoomPages.map((pp) => {
                const pos = pp.posMid * 100;
                const isCurrent = pp.page === currentPage;
                const showLabel = isCurrent || pp.page % 5 === 0;
                return (
                  <div key={pp.page}>
                    <div
                      className={`dr-zoom-page-tick${showLabel ? ' major' : ''}`}
                      style={{ top: `${pos}%` }}
                    />
                    {showLabel && (
                      <span
                        className={`dr-zoom-page-num${isCurrent ? ' current' : ''}`}
                        style={{ top: `${pos}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = document.querySelector(`[data-page="${pp.page}"]`);
                          if (el) {
                            const top = el.getBoundingClientRect().top + window.scrollY - 60;
                            window.scrollTo({ top, behavior: 'smooth' });
                          }
                        }}
                      >
                        {pp.page}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Reaction dots — offset into own column */}
              {dotsVisible && zoomReactions.map((rp) => {
                const topPct = rp.posInChapter * 100;
                return (
                  <div
                    key={rp.reaction.id}
                    className={`dr-dot zoom-dot ${dotColorClass(rp.reaction.reader)}`}
                    style={{ top: `calc(${topPct}% - 3.5px)` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPosition(rp.posInChapter);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Main chapter track (right) */}
        <div
          ref={trackRef}
          className={`dr-track${isZoomed ? ' has-zoom' : ''}`}
          onMouseMove={handleTrackHover}
          onMouseLeave={handleTrackLeave}
          onClick={handleTrackClick}
        >
          <div className="dr-track-line" />
          <div
            className="dr-viewport"
            style={{
              top: `${Math.min(vpTop, 100 - vpH)}%`,
              height: `${Math.min(vpH, 100)}%`,
            }}
          />

          {/* Section segments */}
          {visibleSections.map((i) => {
            const pos = segmentPositions[i];
            if (!pos) return null;
            const topPct = pos.top * 100;
            const hPct = pos.height * 100;

            return (
              <div
                key={sectionMetrics[i].section.id}
                className={`dr-section${i === currentSectionIndex ? ' current' : ''}${i === zoomIndex ? ' zoomed' : ''}`}
                style={{ top: `${topPct}%`, height: `${hPct}%` }}
                onClick={(e) => { e.stopPropagation(); handleSectionClick(i); }}
              >
                <div className="dr-section-bg" />
                <span className="dr-section-label">{sectionMetrics[i].section.title}</span>
              </div>
            );
          })}

          {/* Reaction dots */}
          {dotsVisible && reactionPositions
            .map((rp) => {
              const topPct = rp.posInChapter * 100;
              const tag = rp.reaction.tags?.[0] && tagMap[rp.reaction.tags[0]];
              const tipClass = rp.reaction.reader === 'Keith' ? 'keith' : 'danielle';
              const tipName = rp.reaction.reader;

              return (
                <div
                  key={rp.reaction.id}
                  className={`dr-dot ${dotColorClass(rp.reaction.reader)}`}
                  style={{ top: `calc(${topPct}% - 3.5px)` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPosition(rp.posInChapter);
                  }}
                >
                  <div className="dr-tip">
                    <span className={tipClass}>
                      {tag ? `${tag.emoji} ${tag.label}` : ''} · {tipName}
                    </span>
                    <div className="dr-passage-hint">
                      &ldquo;{(rp.reaction.text || '').slice(0, 60)}{(rp.reaction.text || '').length > 60 ? '...' : ''}&rdquo;
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Page number tooltip on hover */}
          {hoverPage && (
            <div className="dr-page-tip" style={{ top: `${hoverPos * 100}%` }}>
              p. {hoverPage.page}
            </div>
          )}
        </div>
      </div>

      <div className="dr-legend">
        <div className="dr-legend-item">
          <div className="dr-legend-dot gold" />
          {reader === 'Keith' ? 'You' : 'Keith'}
        </div>
        <div className="dr-legend-item">
          <div className="dr-legend-dot rose" />
          {reader === 'Danielle' ? 'You' : 'Danielle'}
        </div>
      </div>
    </div>
  );
}
