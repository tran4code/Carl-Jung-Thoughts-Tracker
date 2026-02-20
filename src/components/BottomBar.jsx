import { useCallback, useRef, useState } from 'react';

export default function BottomBar({
  sectionMetrics, currentSectionIndex, scrollProgress, sectionScrollPositions,
  goToSection, goToPosition, sectionProgress, reader,
}) {
  const progressRef = useRef(null);
  const pageInputRef = useRef(null);
  const [showFinish, setShowFinish] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [pageInput, setPageInput] = useState('');

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

  const handlePageJump = useCallback(() => {
    const page = parseInt(pageInput, 10);
    if (!page || isNaN(page)) return;
    const el = document.querySelector(`[data-page="${page}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setShowPageJump(false);
    setPageInput('');
  }, [pageInput]);

  const handlePageKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handlePageJump();
    if (e.key === 'Escape') { setShowPageJump(false); setPageInput(''); }
  }, [handlePageJump]);

  const togglePageJump = useCallback(() => {
    setShowPageJump((v) => {
      if (!v) setTimeout(() => pageInputRef.current?.focus(), 50);
      return !v;
    });
    setShowFinish(false);
    setPageInput('');
  }, []);

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
            onClick={() => { setShowFinish((v) => !v); setShowPageJump(false); }}
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

          <button className="bb-page-btn" onClick={togglePageJump} title="Jump to page">
            p.
          </button>
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

        {/* Page jump input */}
        {showPageJump && (
          <div className="bb-page-jump">
            <span className="bb-page-label">p.</span>
            <input
              ref={pageInputRef}
              className="bb-page-input"
              type="number"
              inputMode="numeric"
              placeholder="Page #"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={handlePageKeyDown}
            />
            <button className="bb-page-go" onClick={handlePageJump}>Go</button>
          </div>
        )}
      </div>
    </div>
  );
}
