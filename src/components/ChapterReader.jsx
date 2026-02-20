import { useState, useCallback, useMemo, Fragment } from 'react';
import ReaderParagraph from './ReaderParagraph';
import SelectionToolbar from './SelectionToolbar';
import InlineReactionInput from './InlineReactionInput';
import SectionReveal from './SectionReveal';

export default function ChapterReader({
  chapterData, myReactions, otherReactions, revealed,
  reader, chapterId, iFinished,
  addReaction, updateReaction, addReply, deleteReaction, deleteReply,
  onShowConcept, showToast,
  sectionProgress, markSectionFinished,
  readerRef,
}) {
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [activeInputParagraph, setActiveInputParagraph] = useState(null);
  const [expandedReaction, setExpandedReaction] = useState(null);

  const visibleReactions = useMemo(() => {
    return revealed ? [...myReactions, ...otherReactions] : myReactions;
  }, [myReactions, otherReactions, revealed]);

  // Map paragraph ID -> reactions whose passageStart falls within that paragraph
  const reactionsByParagraph = useMemo(() => {
    const map = {};
    if (!chapterData?.paragraphs) return map;

    for (const reaction of visibleReactions) {
      if (!reaction.passageStart) continue;
      for (const para of chapterData.paragraphs) {
        const ids = (para.sentences || []).map((s) => s.id);
        if (ids.includes(reaction.passageStart)) {
          if (!map[para.id]) map[para.id] = [];
          map[para.id].push(reaction);
          break;
        }
      }
    }
    return map;
  }, [chapterData, visibleReactions]);

  // Set of sentence IDs that have linked reactions (for dotted underline)
  const sentencesWithReactions = useMemo(() => {
    const set = new Set();
    if (!chapterData?.paragraphs) return set;

    const allIds = [];
    for (const p of chapterData.paragraphs) {
      for (const s of (p.sentences || [])) {
        allIds.push(s.id);
      }
    }

    for (const reaction of visibleReactions) {
      if (!reaction.passageStart) continue;
      const start = reaction.passageStart;
      const end = reaction.passageEnd || start;
      const startIdx = allIds.indexOf(start);
      const endIdx = allIds.indexOf(end);
      if (startIdx === -1 || endIdx === -1) continue;
      const lo = Math.min(startIdx, endIdx);
      const hi = Math.max(startIdx, endIdx);
      for (let i = lo; i <= hi; i++) {
        set.add(allIds[i]);
      }
    }
    return set;
  }, [chapterData, visibleReactions]);

  // Normalized selection range
  const [normStart, normEnd] = useMemo(() => {
    if (!selectionStart || !selectionEnd) return [null, null];
    if (selectionStart.localeCompare(selectionEnd) <= 0) {
      return [selectionStart, selectionEnd];
    }
    return [selectionEnd, selectionStart];
  }, [selectionStart, selectionEnd]);

  // Count selected sentences
  const selectedCount = useMemo(() => {
    if (!normStart || !normEnd || !chapterData?.paragraphs) return 0;
    let count = 0;
    for (const p of chapterData.paragraphs) {
      for (const s of (p.sentences || [])) {
        if (s.id.localeCompare(normStart) >= 0 && s.id.localeCompare(normEnd) <= 0) {
          count++;
        }
      }
    }
    return count;
  }, [normStart, normEnd, chapterData]);

  // Find which paragraph contains selectionEnd (for inline input placement)
  const inputParagraphId = useMemo(() => {
    if (!selectionEnd || !chapterData?.paragraphs) return null;
    for (const p of chapterData.paragraphs) {
      if ((p.sentences || []).some((s) => s.id === selectionEnd)) {
        return p.id;
      }
    }
    return null;
  }, [selectionEnd, chapterData]);

  // Build section-aware content layout
  // Map sectionId -> { startParagraph, endParagraph (index), section data }
  const sectionLayout = useMemo(() => {
    if (!chapterData?.sections || !chapterData?.paragraphs) return null;
    const sections = chapterData.sections;
    const paragraphs = chapterData.paragraphs;
    const layout = [];

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

      layout.push({
        section: sec,
        startIdx,
        endIdx: endIdx === -1 ? paragraphs.length : endIdx,
      });
    }
    return layout;
  }, [chapterData]);

  // Map sectionId -> reactions in that section
  const reactionsBySection = useMemo(() => {
    const map = {};
    if (!sectionLayout || !chapterData?.paragraphs) return map;

    for (const { section, startIdx, endIdx } of sectionLayout) {
      const paraIds = new Set();
      for (let i = startIdx; i < endIdx; i++) {
        paraIds.add(chapterData.paragraphs[i].id);
      }

      // Get sentence IDs in this section
      const sentIds = new Set();
      for (let i = startIdx; i < endIdx; i++) {
        for (const s of (chapterData.paragraphs[i].sentences || [])) {
          sentIds.add(s.id);
        }
      }

      const sectionMyReactions = myReactions.filter((r) => {
        if (r.passageStart && sentIds.has(r.passageStart)) return true;
        // Reactions without passages — assign to first section
        if (!r.passageStart && section === sectionLayout?.[0]?.section) return true;
        return false;
      });
      const sectionOtherReactions = otherReactions.filter((r) => {
        if (r.passageStart && sentIds.has(r.passageStart)) return true;
        if (!r.passageStart && section === sectionLayout?.[0]?.section) return true;
        return false;
      });

      map[section.id] = { my: sectionMyReactions, other: sectionOtherReactions };
    }
    return map;
  }, [sectionLayout, chapterData, myReactions, otherReactions]);

  const handleSentenceTap = useCallback((sentenceId) => {
    if (activeInputParagraph) return;

    if (!selectionStart) {
      setSelectionStart(sentenceId);
      setSelectionEnd(sentenceId);
    } else if (sentenceId === selectionStart && sentenceId === selectionEnd) {
      setSelectionStart(null);
      setSelectionEnd(null);
    } else {
      const [curStart, curEnd] = selectionStart.localeCompare(selectionEnd) <= 0
        ? [selectionStart, selectionEnd]
        : [selectionEnd, selectionStart];

      const isInRange = sentenceId.localeCompare(curStart) >= 0 && sentenceId.localeCompare(curEnd) <= 0;

      if (isInRange) {
        if (sentenceId === curStart) {
          if (!chapterData?.paragraphs) return;
          let found = false;
          for (const p of chapterData.paragraphs) {
            const sents = p.sentences || [];
            for (let i = 0; i < sents.length; i++) {
              if (sents[i].id === curStart) {
                found = true;
                const next = sents[i + 1];
                if (next) {
                  setSelectionStart(next.id);
                  setSelectionEnd(curEnd);
                  return;
                }
              } else if (found) {
                setSelectionStart(sents[i].id);
                setSelectionEnd(curEnd);
                return;
              }
            }
            if (found) break;
          }
          setSelectionStart(null);
          setSelectionEnd(null);
        } else if (sentenceId === curEnd) {
          if (!chapterData?.paragraphs) return;
          let prevId = null;
          for (const p of chapterData.paragraphs) {
            for (const s of (p.sentences || [])) {
              if (s.id === curEnd) {
                if (prevId) {
                  setSelectionStart(curStart);
                  setSelectionEnd(prevId);
                } else {
                  setSelectionStart(null);
                  setSelectionEnd(null);
                }
                return;
              }
              prevId = s.id;
            }
          }
        } else {
          setSelectionStart(curStart);
          setSelectionEnd(sentenceId);
        }
      } else {
        setSelectionEnd(sentenceId);
      }
    }
  }, [selectionStart, selectionEnd, activeInputParagraph, chapterData]);

  const handleReact = useCallback(() => {
    setActiveInputParagraph(inputParagraphId);
  }, [inputParagraphId]);

  const handleClearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setActiveInputParagraph(null);
  }, []);

  const handleReactionSubmitted = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setActiveInputParagraph(null);
  }, []);

  const handlePassageChange = useCallback((newStart, newEnd) => {
    setSelectionStart(newStart);
    setSelectionEnd(newEnd);
  }, []);

  if (!chapterData?.paragraphs) {
    return <div className="spinner" />;
  }

  const canTap = !iFinished && !activeInputParagraph;
  const showInput = activeInputParagraph != null;

  const reactionInput = showInput && (
    <div className="reader-sidebar-input">
      <InlineReactionInput
        reader={reader}
        chapterId={chapterId}
        chapterData={chapterData}
        passageStart={normStart}
        passageEnd={normEnd}
        addReaction={addReaction}
        showToast={showToast}
        onClose={handleClearSelection}
        onSubmitted={handleReactionSubmitted}
        onPassageChange={handlePassageChange}
      />
    </div>
  );

  // Build section-start map: paragraphIndex -> section
  const sectionStartMap = {};
  const sectionEndMap = {};
  if (sectionLayout) {
    for (const { section, startIdx, endIdx } of sectionLayout) {
      sectionStartMap[startIdx] = section;
      sectionEndMap[endIdx] = section;
    }
  }

  // Determine which paragraphs should be dimmed:
  // Find the first unfinished section (by the current reader).
  // All paragraphs AFTER that section start getting dimmed.
  const dimAfterIdx = useMemo(() => {
    if (!sectionLayout || !sectionProgress) return Infinity;
    for (const { section, endIdx } of sectionLayout) {
      const sp = sectionProgress.getSectionProgress(section.id);
      const iDone = reader === 'Keith' ? sp.keith : sp.danielle;
      if (!iDone) {
        // This section isn't finished — dim everything after it
        return endIdx;
      }
    }
    return Infinity; // all sections finished
  }, [sectionLayout, sectionProgress, reader]);

  return (
    <div className={`chapter-reader${showInput ? ' with-sidebar' : ''}`} ref={readerRef}>
      <div className="content-grid">
        {chapterData.paragraphs.map((para, index) => {
          const sectionStart = sectionStartMap[index];
          const sectionEnd = sectionEndMap[index];
          const isDimmed = index >= dimAfterIdx;

          return (
            <Fragment key={para.id}>
              {/* Section end: reveal widget for the previous section */}
              {sectionEnd && sectionProgress && markSectionFinished && (
                <SectionReveal
                  reader={reader}
                  chapterId={chapterId}
                  sectionId={sectionEnd.id}
                  sectionTitle={sectionEnd.title}
                  myReactions={reactionsBySection[sectionEnd.id]?.my || []}
                  otherReactions={reactionsBySection[sectionEnd.id]?.other || []}
                  sectionProgress={sectionProgress.getSectionProgress(sectionEnd.id)}
                  markSectionFinished={sectionProgress.markSectionFinished}
                  chapterData={chapterData}
                  onShowConcept={onShowConcept}
                  onAddReply={addReply}
                  onDeleteReaction={deleteReaction}
                  onDeleteReply={deleteReply}
                />
              )}

              {/* Section header */}
              {sectionStart && (
                <div
                  className={`section-header level-${sectionStart.level}${isDimmed ? ' dimmed' : ''}`}
                  data-section-id={sectionStart.id}
                >
                  <h3 className="section-title">{sectionStart.title}</h3>
                </div>
              )}

              <ReaderParagraph
                paragraph={para}
                reactions={reactionsByParagraph[para.id] || []}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                onSentenceTap={handleSentenceTap}
                expandedReaction={expandedReaction}
                onExpandReaction={setExpandedReaction}
                sentencesWithReactions={sentencesWithReactions}
                canTap={canTap}
                isFirst={!!sectionStart}
                dimmed={isDimmed}
                chapterData={chapterData}
                onShowConcept={onShowConcept}
                onUpdate={updateReaction}
                reader={reader}
                onAddReply={addReply}
                onDeleteReaction={deleteReaction}
                onDeleteReply={deleteReply}
              />
            </Fragment>
          );
        })}

        {/* Final section reveal widget (for the last section) */}
        {sectionLayout && sectionLayout.length > 0 && sectionProgress && markSectionFinished && (
          <SectionReveal
            reader={reader}
            chapterId={chapterId}
            sectionId={sectionLayout[sectionLayout.length - 1].section.id}
            sectionTitle={sectionLayout[sectionLayout.length - 1].section.title}
            myReactions={reactionsBySection[sectionLayout[sectionLayout.length - 1].section.id]?.my || []}
            otherReactions={reactionsBySection[sectionLayout[sectionLayout.length - 1].section.id]?.other || []}
            sectionProgress={sectionProgress.getSectionProgress(sectionLayout[sectionLayout.length - 1].section.id)}
            markSectionFinished={sectionProgress.markSectionFinished}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
            onAddReply={addReply}
            onDeleteReaction={deleteReaction}
            onDeleteReply={deleteReply}
          />
        )}
      </div>

      {selectionStart && !activeInputParagraph && (
        <SelectionToolbar
          sentenceCount={selectedCount}
          onReact={handleReact}
          onClear={handleClearSelection}
        />
      )}

      {/* Desktop: sidebar input; Mobile: rendered inline via CSS */}
      {reactionInput}
    </div>
  );
}
