import { useCallback, useRef, useState } from 'react';

export default function BottomBar({
  sectionMetrics, currentSectionIndex, scrollProgress, sectionScrollPositions,
  goToSection, goToPosition, sectionProgress, reader,
}) {
  const progressRef = useRef(null);
  const [showFinish, setShowFinish] = useState(false);

  // Tap on progress bar → jump to that position
  const handleProgressTap = useCallback((e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    goToPosition(x);
  }, [goToPosition]);

  // Back button: go to start of current section first, then previous section
  const handleBack = useCallback(() => {
    const currentStart = sectionScrollPositions[currentSectionIndex] ?? 0;
    const atStart = Math.abs(scrollProgress - currentStart) < 0.02;

    if (atStart && currentSectionIndex > 0) {
      goToSection(currentSectionIndex - 1);
    } else {
      goToSection(currentSectionIndex);
    }
  }, [scrollProgress, currentSectionIndex, sectionScrollPositions, goToSection]);

  const handleFinishSection = useCallback(async () => {
    const sectionId = sectionMetrics[currentSectionIndex]?.section?.id;
    if (!sectionId || !sectionProgress) return;
    try {
      await sectionProgress.markSectionFinished(sectionId, reader);
      setShowFinish(false);
    } catch {
      // Error silently handled
    }
  }, [currentSectionIndex, sectionMetrics, sectionProgress, reader]);

  if (!sectionMetrics.length) return null;

  const current = sectionMetrics[currentSectionIndex]?.section;
  const prev = sectionMetrics[currentSectionIndex - 1]?.section;
  const next = sectionMetrics[currentSectionIndex + 1]?.section;

  // Check if current section is finished by this reader
  const currentSectionId = current?.id;
  const sp = currentSectionId && sectionProgress?.getSectionProgress(currentSectionId);
  const iFinished = sp && (reader === 'Keith' ? sp.keith : sp.danielle);

  return (
    <div className="mobile-nav">
      <div className="bb-bottom-bar">
        {/* Tappable progress bar with section ticks */}
        <div className="bb-progress" ref={progressRef} onClick={handleProgressTap}>
          <div className="bb-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
          {sectionScrollPositions.slice(1).map((pos, i) => (
            pos != null && (
              <div
                key={i}
                className="bb-progress-tick"
                style={{ left: `${pos * 100}%` }}
              />
            )
          ))}
        </div>

        {/* Section navigator */}
        <div className="bb-nav-row">
          {(prev || currentSectionIndex > 0) ? (
            <button className="bb-prev" onClick={handleBack}>
              <span className="bb-chevron">&lsaquo;</span>
              <span className="bb-nav-label">{prev?.title || current?.title}</span>
            </button>
          ) : (
            <div className="bb-nav-spacer" />
          )}

          <button
            className={`bb-current${iFinished ? ' finished' : ''}`}
            onClick={() => setShowFinish((v) => !v)}
          >
            {current?.title || ''}
            {iFinished && <span className="bb-check">&check;</span>}
          </button>

          {next ? (
            <button className="bb-next" onClick={() => goToSection(currentSectionIndex + 1)}>
              <span className="bb-nav-label">{next.title}</span>
              <span className="bb-chevron">&rsaquo;</span>
            </button>
          ) : (
            <div className="bb-nav-spacer" />
          )}
        </div>

        {/* Finish section popover */}
        {showFinish && !iFinished && (
          <div className="bb-finish-popover">
            <button className="bb-finish-btn" onClick={handleFinishSection}>
              Mark "{current?.title}" as finished
            </button>
            <button className="bb-finish-cancel" onClick={() => setShowFinish(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
