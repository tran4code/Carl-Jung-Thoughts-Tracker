import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

/**
 * Shared navigation state for the chapter reader and bottom bar.
 * Computes section metrics, reaction positions, and scroll progress.
 */
export function useReaderNavigation(chapterData, readerRef, myReactions, otherReactions, revealed) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sectionScrollPositions, setSectionScrollPositions] = useState([0]);
  const lastSectionRef = useRef(0);

  // Build section layout with sentence counts for proportional track sizing
  const sectionMetrics = useMemo(() => {
    if (!chapterData?.sections || !chapterData?.paragraphs) return [];
    const { sections, paragraphs } = chapterData;
    const layout = [];
    let totalSentences = 0;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const startParaId = sec.startParagraph;
      const nextSec = sections[i + 1];
      const endParaId = nextSec?.startParagraph;

      const startIdx = paragraphs.findIndex((p) => p.id === startParaId);
      let endIdx;
      if (endParaId) {
        endIdx = paragraphs.findIndex((p) => p.id === endParaId);
      } else {
        endIdx = paragraphs.length;
      }
      if (startIdx === -1) continue;
      if (endIdx === -1) endIdx = paragraphs.length;

      let sentenceCount = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sentenceCount += (paragraphs[j].sentences || []).length;
      }

      layout.push({
        section: sec,
        startIdx,
        endIdx,
        sentenceCount,
        sentenceOffset: totalSentences,
        startPage: paragraphs[startIdx]?.page || null,
      });
      totalSentences += sentenceCount;
    }

    // Compute fraction (proportion of total chapter)
    for (const m of layout) {
      m.fraction = totalSentences > 0 ? m.sentenceCount / totalSentences : 0;
    }
    return layout;
  }, [chapterData]);

  const totalSentences = useMemo(() => {
    return sectionMetrics.reduce((sum, m) => sum + m.sentenceCount, 0);
  }, [sectionMetrics]);

  // Build flat sentence ID list for reaction position lookup
  const sentenceIndex = useMemo(() => {
    if (!chapterData?.paragraphs) return new Map();
    const map = new Map();
    let idx = 0;
    for (const p of chapterData.paragraphs) {
      for (const s of (p.sentences || [])) {
        map.set(s.id, idx);
        idx++;
      }
    }
    return map;
  }, [chapterData]);

  // Compute reaction positions on the track
  const reactionPositions = useMemo(() => {
    const reactions = revealed ? [...myReactions, ...otherReactions] : myReactions;
    const positions = [];

    for (const r of reactions) {
      if (!r.passageStart) continue;
      const sentIdx = sentenceIndex.get(r.passageStart);
      if (sentIdx === undefined) continue;

      // Find which section this reaction belongs to
      let sectionIdx = -1;
      for (let i = 0; i < sectionMetrics.length; i++) {
        const m = sectionMetrics[i];
        if (sentIdx >= m.sentenceOffset && sentIdx < m.sentenceOffset + m.sentenceCount) {
          sectionIdx = i;
          break;
        }
      }
      if (sectionIdx === -1) continue;

      const m = sectionMetrics[sectionIdx];
      const posInSection = m.sentenceCount > 0
        ? (sentIdx - m.sentenceOffset) / m.sentenceCount
        : 0;
      const posInChapter = totalSentences > 0 ? sentIdx / totalSentences : 0;

      positions.push({
        reaction: r,
        sectionIndex: sectionIdx,
        posInSection,
        posInChapter,
      });
    }
    return positions;
  }, [myReactions, otherReactions, revealed, sentenceIndex, sectionMetrics, totalSentences]);

  // Track scroll progress and current section
  // Also record the exact scrollProgress at each section boundary for tick alignment
  useEffect(() => {
    const handleScroll = () => {
      const el = readerRef?.current;
      if (!el) return;

      // Overall scroll progress
      const rect = el.getBoundingClientRect();
      const totalHeight = el.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      const pct = Math.max(0, Math.min(1, totalHeight > 0 ? scrolled / totalHeight : 0));
      setScrollProgress(pct);

      // Determine current section from section header positions
      const headers = el.querySelectorAll('[data-section-id]');
      let currentIdx = 0;
      for (let i = 0; i < headers.length; i++) {
        const headerRect = headers[i].getBoundingClientRect();
        // Section is "current" if its header is above the middle of the viewport
        if (headerRect.top < window.innerHeight * 0.4) {
          currentIdx = i;
        }
      }
      setCurrentSectionIndex(currentIdx);

      // Record the scrollProgress when we first scroll forward into a new section
      // Only record once per section — never overwrite (backward scrolling would give wrong values)
      if (currentIdx !== lastSectionRef.current) {
        const prevIdx = lastSectionRef.current;
        lastSectionRef.current = currentIdx;
        if (currentIdx > prevIdx) {
          setSectionScrollPositions((prev) => {
            if (prev[currentIdx] != null) return prev; // already recorded
            const next = [...prev];
            next[currentIdx] = pct;
            return next;
          });
        }
      }
    };

    // Seed all section boundary positions using the same math as the scroll handler
    // This ensures ticks appear immediately without needing to scroll past each section
    const seedPositions = () => {
      const el = readerRef?.current;
      if (!el) return;
      const headers = el.querySelectorAll('[data-section-id]');
      if (!headers.length) return;
      const totalH = el.scrollHeight - window.innerHeight;
      if (totalH <= 0) return;
      const threshold = window.innerHeight * 0.4;
      const readerAbsTop = el.getBoundingClientRect().top + window.scrollY;
      const positions = Array.from(headers).map((header) => {
        const headerAbsTop = header.getBoundingClientRect().top + window.scrollY;
        // scrollProgress at the moment this header crosses the threshold:
        // headerRect.top < threshold means scrolled = headerAbsTop - readerAbsTop - threshold
        const scrolledAtSwitch = headerAbsTop - readerAbsTop - threshold;
        return Math.max(0, Math.min(1, scrolledAtSwitch / totalH));
      });
      setSectionScrollPositions(positions);
    };
    // Run seed after layout, with retries for lazy-loaded content
    seedPositions();
    requestAnimationFrame(() => requestAnimationFrame(seedPositions));
    const seedTimer = setTimeout(seedPositions, 500);
    const seedTimer2 = setTimeout(seedPositions, 1500);
    window.addEventListener('resize', seedPositions);

    // Also observe DOM changes in case section headers appear later
    let observer;
    const el = readerRef?.current;
    if (el) {
      observer = new MutationObserver(() => {
        const headers = el.querySelectorAll('[data-section-id]');
        if (headers.length > 1) seedPositions();
      });
      observer.observe(el, { childList: true, subtree: true });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', seedPositions);
      clearTimeout(seedTimer);
      clearTimeout(seedTimer2);
      observer?.disconnect();
    };
  }, [readerRef, sectionMetrics]);

  // Section-level scroll progress
  const sectionScrollProgress = useMemo(() => {
    if (!sectionMetrics.length) return 0;
    const m = sectionMetrics[currentSectionIndex];
    if (!m) return 0;

    // Map overall progress to section progress
    const sectionStart = m.sentenceOffset / totalSentences;
    const sectionEnd = (m.sentenceOffset + m.sentenceCount) / totalSentences;
    const range = sectionEnd - sectionStart;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (scrollProgress - sectionStart) / range));
  }, [scrollProgress, currentSectionIndex, sectionMetrics, totalSentences]);

  // Compute page boundary positions on the 0–1 track
  const pagePositions = useMemo(() => {
    if (!chapterData?.paragraphs || totalSentences === 0) return [];
    const pages = new Map();
    let sentIdx = 0;

    for (const p of chapterData.paragraphs) {
      const pageNum = p.page;
      const sentCount = (p.sentences || []).length;
      if (!pageNum || sentCount === 0) { sentIdx += sentCount; continue; }

      if (!pages.has(pageNum)) {
        pages.set(pageNum, { page: pageNum, firstSentIdx: sentIdx, lastSentIdx: sentIdx + sentCount - 1 });
      } else {
        pages.get(pageNum).lastSentIdx = sentIdx + sentCount - 1;
      }
      sentIdx += sentCount;
    }

    return Array.from(pages.values()).map(({ page, firstSentIdx, lastSentIdx }) => ({
      page,
      posStart: firstSentIdx / totalSentences,
      posEnd: (lastSentIdx + 1) / totalSentences,
      posMid: ((firstSentIdx + lastSentIdx) / 2) / totalSentences,
    }));
  }, [chapterData, totalSentences]);

  const goToSection = useCallback((index) => {
    if (!sectionMetrics[index]) return;
    const sectionId = sectionMetrics[index].section.id;
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [sectionMetrics]);

  const goToPosition = useCallback((pos) => {
    const docEl = document.documentElement;
    const targetScroll = pos * (docEl.scrollHeight - docEl.clientHeight);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  return {
    currentSectionIndex,
    scrollProgress,
    sectionScrollProgress,
    sectionMetrics,
    sectionScrollPositions,
    reactionPositions,
    totalSentences,
    pagePositions,
    goToSection,
    goToPosition,
  };
}
