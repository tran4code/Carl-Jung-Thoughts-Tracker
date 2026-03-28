import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { REACTION_TAGS } from './TagPicker';
import PassageSuggestions from './PassageSuggestions';
import PassageMatcher from './PassageMatcher';
import PassageHighlight from './PassageHighlight';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';
import ReactionCard from './ReactionCard';
import { buildCorpusIndex, findTopMatches } from '../utils/textSimilarity';
import { sortByPassagePosition } from '../utils/sortReactions';

const TAG_DESCRIPTIONS = {
  wow: 'A passage that stopped you — something profound, beautiful, or unexpected.',
  resonates: 'This felt personally true — it echoed something in your own life or beliefs.',
  connection: 'You saw a link to something else — another book, conversation, or idea.',
  confused: "Something didn't click. You want to revisit or discuss this part.",
  disagree: "You push back on this — it doesn't match your experience or reasoning.",
  question: 'This raised a question — something you want to explore further together.',
  return: 'Worth coming back to — mark this for re-reading or future discussion.',
};

export default function ReactionFlow({
  reader,
  chapterId,
  chapterData,
  meta,
  sections,
  myReactions,
  otherReactions,
  allReactions,
  addReaction,
  updateReaction,
  addReply,
  deleteReaction,
  deleteReply,
  sectionProgress,
  onShowConcept,
  showToast,
  revealed,
  onBack,
  onRead,
}) {
  const [screen, setScreen] = useState('sections');
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [inputText, setInputText] = useState('');
  const [quoteSearchText, setQuoteSearchText] = useState('');
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [inputMode, setInputMode] = useState('type');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [revealSection, setRevealSection] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(null);
  const [partialReveal, setPartialReveal] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredTag, setHoveredTag] = useState(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [rawTranscription, setRawTranscription] = useState(null);
  const [audioClips, setAudioClips] = useState([]);
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);

  const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';

  // Build section-scoped chapter data (current section only — used for manual browse)
  const sectionChapterData = useMemo(() => {
    if (!chapterData?.paragraphs || !chapterData?.sections || !selectedSection) return chapterData;
    const { paragraphs, sections: chapSections } = chapterData;
    const secIdx = chapSections.findIndex((s) => s.id === selectedSection.id);
    if (secIdx === -1) return chapterData;
    const sec = chapSections[secIdx];
    const startIdx = paragraphs.findIndex((p) => p.id === sec.startParagraph);
    if (startIdx === -1) return chapterData;
    const nextSec = chapSections[secIdx + 1];
    const endIdx = nextSec
      ? paragraphs.findIndex((p) => p.id === nextSec.startParagraph)
      : paragraphs.length;
    return {
      ...chapterData,
      paragraphs: paragraphs.slice(startIdx, endIdx === -1 ? undefined : endIdx),
    };
  }, [chapterData, selectedSection]);

  // Build search data: current section + all prior sections (everything up to end of current)
  const searchableChapterData = useMemo(() => {
    if (!chapterData?.paragraphs || !chapterData?.sections || !selectedSection) return chapterData;
    const { paragraphs, sections: chapSections } = chapterData;
    const secIdx = chapSections.findIndex((s) => s.id === selectedSection.id);
    if (secIdx === -1) return chapterData;
    const nextSec = chapSections[secIdx + 1];
    const endIdx = nextSec
      ? paragraphs.findIndex((p) => p.id === nextSec.startParagraph)
      : paragraphs.length;
    return {
      ...chapterData,
      paragraphs: paragraphs.slice(0, endIdx === -1 ? undefined : endIdx),
    };
  }, [chapterData, selectedSection]);

  const corpusIndex = useMemo(
    () => (searchableChapterData ? buildCorpusIndex(searchableChapterData) : null),
    [searchableChapterData]
  );

  // All sections for the flow
  const flowSections = useMemo(() => {
    if (!sections) return [];
    return sections;
  }, [sections]);

  // Find current section (first unfinished by me)
  const currentSection = useMemo(() => {
    return flowSections.find((sec) => {
      const sp = sectionProgress.getSectionProgress(sec.id);
      const iDone = reader === 'Keith' ? sp.keith : sp.danielle;
      return !iDone;
    });
  }, [flowSections, sectionProgress, reader]);

  // Compute page ranges per section
  const sectionPageRanges = useMemo(() => {
    if (!chapterData?.paragraphs || !chapterData?.sections) return {};
    const { paragraphs, sections: chapSections } = chapterData;
    const ranges = {};
    for (let i = 0; i < chapSections.length; i++) {
      const sec = chapSections[i];
      const startIdx = paragraphs.findIndex((p) => p.id === sec.startParagraph);
      if (startIdx === -1) continue;
      const nextSec = chapSections[i + 1];
      const endIdx = nextSec
        ? paragraphs.findIndex((p) => p.id === nextSec.startParagraph)
        : paragraphs.length;
      const sectionParas = paragraphs.slice(
        startIdx,
        endIdx === -1 ? undefined : endIdx
      );
      const pages = sectionParas.map((p) => p.page).filter(Boolean);
      if (pages.length) {
        ranges[sec.id] = {
          start: Math.min(...pages),
          end: Math.max(...pages),
        };
      }
    }
    return ranges;
  }, [chapterData]);

  // Map a sentence ID to the section it belongs to
  const getSectionForSentence = useCallback((sentenceId) => {
    if (!chapterData?.paragraphs || !chapterData?.sections) return null;
    const { paragraphs, sections: chapSections } = chapterData;
    // Find which paragraph contains the sentence
    let paraIdx = -1;
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].sentences?.some((s) => s.id === sentenceId)) {
        paraIdx = i;
        break;
      }
    }
    if (paraIdx === -1) return null;
    // Find which section contains that paragraph
    for (let i = chapSections.length - 1; i >= 0; i--) {
      const secStartIdx = paragraphs.findIndex((p) => p.id === chapSections[i].startParagraph);
      if (secStartIdx !== -1 && paraIdx >= secStartIdx) {
        // Match to flowSections
        return flowSections.find((fs) => fs.id === chapSections[i].id) || null;
      }
    }
    return null;
  }, [chapterData, flowSections]);

  // Count reactions per section
  const reactionsBySection = useMemo(() => {
    if (!chapterData?.paragraphs || !allReactions?.length) return {};
    const { paragraphs } = chapterData;
    const map = {};

    for (let i = 0; i < (chapterData.sections || []).length; i++) {
      const sec = chapterData.sections[i];
      const startIdx = paragraphs.findIndex((p) => p.id === sec.startParagraph);
      const nextSec = chapterData.sections[i + 1];
      const endParaId = nextSec?.startParagraph;
      let endIdx = endParaId
        ? paragraphs.findIndex((p) => p.id === endParaId)
        : paragraphs.length;
      if (startIdx === -1) continue;
      if (endIdx === -1) endIdx = paragraphs.length;

      const sentIds = new Set();
      for (let j = startIdx; j < endIdx; j++) {
        for (const s of paragraphs[j].sentences || []) {
          sentIds.add(s.id);
        }
      }

      const mine = myReactions.filter(
        (r) => r.passageStart ? sentIds.has(r.passageStart) : r.section === sec.id
      );
      const others = otherReactions.filter(
        (r) => r.passageStart ? sentIds.has(r.passageStart) : r.section === sec.id
      );

      map[sec.id] = {
        mine,
        others,
        myCount: mine.length,
        otherCount: others.length,
        total: mine.length + others.length,
      };
    }

    // Orphan reactions (no passageStart, no section) → assign to first section
    const firstSecId = (chapterData.sections || [])[0]?.id;
    if (firstSecId && map[firstSecId]) {
      const claimed = new Set();
      for (const secId in map) {
        for (const r of [...map[secId].mine, ...map[secId].others]) claimed.add(r.id);
      }
      const orphanMine = myReactions.filter((r) => !claimed.has(r.id));
      const orphanOthers = otherReactions.filter((r) => !claimed.has(r.id));
      if (orphanMine.length || orphanOthers.length) {
        map[firstSecId] = {
          mine: [...map[firstSecId].mine, ...orphanMine],
          others: [...map[firstSecId].others, ...orphanOthers],
          myCount: map[firstSecId].myCount + orphanMine.length,
          otherCount: map[firstSecId].otherCount + orphanOthers.length,
          total: map[firstSecId].total + orphanMine.length + orphanOthers.length,
        };
      }
    }

    return map;
  }, [chapterData, allReactions, myReactions, otherReactions]);

  // Get a representative passage for the selected section (for pull quote)
  const sectionPullQuote = useMemo(() => {
    if (!selectedSection || !chapterData?.paragraphs || !chapterData?.sections)
      return null;
    const { paragraphs, sections: chapSections } = chapterData;
    const secIdx = chapSections.findIndex((s) => s.id === selectedSection.id);
    if (secIdx === -1) return null;
    const sec = chapSections[secIdx];
    const startIdx = paragraphs.findIndex(
      (p) => p.id === sec.startParagraph
    );
    if (startIdx === -1) return null;
    const nextSec = chapSections[secIdx + 1];
    const endIdx = nextSec
      ? paragraphs.findIndex((p) => p.id === nextSec.startParagraph)
      : paragraphs.length;
    for (
      let i = startIdx;
      i < (endIdx === -1 ? paragraphs.length : endIdx);
      i++
    ) {
      const p = paragraphs[i];
      if (p.sentences?.length > 0) {
        const text = p.sentences[0].text;
        return { text, page: p.page };
      }
    }
    return null;
  }, [selectedSection, chapterData]);

  // Passage matching as user types in quote search box
  // Searches current section + all prior sections, ranked purely by similarity
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!quoteSearchText.trim() || quoteSearchText.trim().length < 8 || !corpusIndex) {
      setSuggestedMatches([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const matches = findTopMatches(quoteSearchText, corpusIndex, 3);
      setSuggestedMatches(matches);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [quoteSearchText, corpusIndex]);

  // Clean up recording interval on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  // ── Handlers ──
  const handleSectionTap = (section) => {
    const sp = sectionProgress.getSectionProgress(section.id);
    const iDone = reader === 'Keith' ? sp.keith : sp.danielle;
    const otherDone = reader === 'Keith' ? sp.danielle : sp.keith;
    const bothDone = iDone && otherDone;

    if (bothDone) {
      setPartialReveal(false);
      setRevealSection(section);
    } else if (iDone) {
      setPartialReveal(true);
      setRevealSection(section);
    } else {
      // Not finished yet — show own reactions if any exist
      const sectionReactions = reactionsBySection[section.id];
      const myCount = sectionReactions?.myCount || 0;
      if (myCount > 0) {
        setPartialReveal(true);
        setRevealSection(section);
      }
    }
  };

  const handleReact = (section) => {
    setSelectedSection(section);
    setScreen('tags');
  };

  const handleTagSelect = (tagId) => {
    setSelectedTag(tagId);
    setTags(tagId ? [tagId] : []);
    setTimeout(() => setScreen('compose'), 200);
  };

  const handleBack = () => {
    if (screen === 'compose') {
      setScreen('tags');
      setInputText('');
      setQuoteSearchText('');
      setSelectedPassage(null);
      setSelectedTag(null);
      setTags([]);
      setSuggestedMatches([]);
      setShowManualSearch(false);
      setRawTranscription(null);
      setAudioClips([]);
    } else if (screen === 'tags') {
      setScreen('sections');
      setSelectedTag(null);
      setTags([]);
      setSelectedSection(null);
      setLegendOpen(false);
      setHoveredTag(null);
    }
  };

  const handleVoiceComplete = (result) => {
    if (!result) return;
    setInputText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${result.transcription}` : result.transcription;
    });
    setRawTranscription((prev) => {
      const trimmed = prev?.trim();
      return trimmed ? `${trimmed} ${result.transcription}` : result.transcription;
    });
    if (result.audioBase64) {
      setAudioClips((prev) => [
        ...prev,
        { audioBase64: result.audioBase64, audioMimeType: result.audioMimeType },
      ]);
    }
  };

  const removeClip = (index) => {
    setAudioClips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectSuggestion = useCallback((match) => {
    if (!match) {
      setSelectedPassage(null);
      return;
    }
    setSelectedPassage({ start: match.id, end: match.id });
    setShowManualSearch(false);
    // Auto-detect which section this passage belongs to
    const matchedSection = getSectionForSentence(match.id);
    if (matchedSection) {
      setSelectedSection(matchedSection);
    }
  }, [getSectionForSentence]);

  const canSubmit = inputText.trim() || tags.length > 0 || selectedPassage;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await addReaction({
        reader,
        text: inputText.trim() || null,
        rawTranscription,
        audioClips: audioClips.length > 0 ? audioClips : null,
        audioBase64: audioClips[0]?.audioBase64 || null,
        audioMimeType: audioClips[0]?.audioMimeType || null,
        passageStart: selectedPassage?.start || null,
        passageEnd: selectedPassage?.end || null,
        tags,
        isBlindReaction: false,
        page: null,
        section: selectedSection?.id || null,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setScreen('sections');
        setInputText('');
        setQuoteSearchText('');
        setSelectedPassage(null);
        setSelectedTag(null);
        setTags([]);
        setSelectedSection(null);
        setSuggestedMatches([]);
        setShowManualSearch(false);
        setRawTranscription(null);
        setAudioClips([]);
      }, 1800);
    } catch {
      showToast('Failed to save reaction', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = (section) => setConfirmFinish(section);

  const confirmFinishSection = async () => {
    const sec = confirmFinish;
    try {
      await sectionProgress.markSectionFinished(sec.id, reader);
      const sp = sectionProgress.getSectionProgress(sec.id);
      const otherDone = reader === 'Keith' ? sp.danielle : sp.keith;

      if (otherDone) {
        setConfirmFinish(null);
        setPartialReveal(false);
        setTimeout(() => setRevealSection(sec), 400);
      } else {
        setConfirmFinish(null);
      }
    } catch {
      showToast('Failed to mark section as finished', true);
      setConfirmFinish(null);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(intervalRef.current);
      setIsRecording(false);
      setRecordTime(0);
    } else {
      setIsRecording(true);
      intervalRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    }
  };

  const activeTag = REACTION_TAGS.find((t) => t.key === selectedTag);

  // Show passage suggestions or selected preview
  const showSuggestionsPanel =
    !selectedPassage && !showManualSearch && chapterData && quoteSearchText.trim().length > 0;
  const showSelectedPreview = selectedPassage && !showManualSearch;

  // ── Render ──
  return (
    <div className="rf">
      {/* ══ HEADER ══ */}
      <div className="rf-header">
        {screen !== 'sections' ? (
          <button className="rf-back-btn" onClick={handleBack}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        ) : (
          <button className="rf-back-btn" onClick={onBack}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Part {['', 'I', 'II', 'III', 'IV', 'V'][chapterId] || chapterId}
          </button>
        )}

        <div className="rf-header-title">
          {screen === 'sections'
            ? 'Reactions'
            : screen === 'tags'
              ? selectedSection?.title?.length > 26
                ? selectedSection.title.slice(0, 26) + '\u2026'
                : selectedSection?.title
              : activeTag
                ? `${activeTag.emoji} ${activeTag.label}`
                : 'React'}
        </div>

        {screen === 'sections' && onRead ? (
          <button className="rf-read-btn" onClick={onRead}>
            Read
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>

      {/* ══ CHAPTER HEADER ══ */}
      {screen === 'sections' && meta && (
        <div className="rf-chapter-header">
          <div className="rf-chapter-card">
            <div className="rf-chapter-title">{meta.title}</div>
            <div className="rf-chapter-meta">
              <span className="rf-mono">
                {meta.author} &middot; Pages {meta.pageRange}
              </span>
              <div className="rf-avatars">
                <div className="rf-avatar keith">K</div>
                <div className="rf-avatar danielle">D</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTIONS LIST ══ */}
      {screen === 'sections' && (
        <div className="rf-sections">
          <div className="rf-mono rf-sections-label">Subsections</div>

          <div className="rf-sections-list">
            {flowSections.map((section) => {
              const sp = sectionProgress.getSectionProgress(section.id);
              const iDone = reader === 'Keith' ? sp.keith : sp.danielle;
              const otherDone = reader === 'Keith' ? sp.danielle : sp.keith;
              const bothDone = iDone && otherDone;
              const sectionReactions = reactionsBySection[section.id];
              const total = sectionReactions?.total || 0;
              const myCount = sectionReactions?.myCount || 0;
              const unlocked = bothDone && total > 0;
              const isCurrent = currentSection?.id === section.id;

              const sectionRevealed =
                bothDone &&
                localStorage.getItem(
                  `jung-revealed-${chapterId}-${section.id}`
                );

              return (
                <div
                  key={section.id}
                  className={`rf-section-card${unlocked ? ' unlocked' : ''}${isCurrent ? ' current' : ''}`}
                >
                  <div
                    onClick={() => handleSectionTap(section)}
                    className={`rf-section-info${bothDone || iDone || myCount > 0 ? ' tappable' : ''}`}
                  >
                    <div className="rf-section-main">
                      <div className="rf-section-title-row">
                        <div className={`rf-current-dot${bothDone ? ' done' : isCurrent ? ' active' : iDone ? ' waiting' : ' unread'}`} />
                        <div
                          className={`rf-section-title${bothDone ? ' done' : isCurrent ? ' active' : iDone ? ' waiting' : ' future'}`}
                        >
                          {section.title}
                        </div>
                      </div>

                      {/* Page range */}
                      {sectionPageRanges[section.id] && (
                        <div className="rf-mono rf-section-pages indented">
                          Pages {sectionPageRanges[section.id].start}–{sectionPageRanges[section.id].end}
                        </div>
                      )}

                      {/* Status line */}
                      {!bothDone && (
                        <div className="rf-section-status indented">
                          {iDone && !otherDone && (
                            <>
                              <div className="rf-status-dot waiting" />
                              <span>Waiting for {otherName} to finish</span>
                            </>
                          )}
                          {!iDone && otherDone && (
                            <>
                              <div className="rf-status-dot ready" />
                              <span>Finish reading to unlock reactions</span>
                            </>
                          )}
                          {!iDone && !otherDone && (
                            <>
                              <div className="rf-status-dot idle" />
                              <span>Neither has finished yet</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side badges */}
                    {unlocked && (
                      <div className="rf-badge unlocked">
                        <span>{total}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                    )}
                    {!bothDone && iDone && (
                      <div className="rf-badge locked">
                        <span>{myCount}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    )}
                    {!iDone && myCount > 0 && (
                      <div className="rf-badge my-reactions">
                        <span>{myCount}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Finish button */}
                  {!iDone && (
                    <div className="rf-section-finish-area">
                      <button
                        className="rf-finish-btn"
                        onClick={() => handleFinish(section)}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Mark as finished
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="rf-how-it-works">
            <div className="rf-mono rf-how-title">How it works</div>
            {[
              {
                icon: '\u270F\uFE0F',
                text: 'Tap the React button to react to passages as you read',
              },
              {
                icon: '\u2713',
                text: 'Mark a section as finished when you\u2019re done',
              },
              {
                icon: '\uD83D\uDD12',
                text: "Reactions stay hidden until you've both finished",
              },
              {
                icon: '\u2728',
                text: 'Then all reactions are revealed together',
              },
            ].map((item, i) => (
              <div key={i} className="rf-how-item">
                <span className="rf-how-icon">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ FLOATING ACTION BUTTON ══ */}
      {screen === 'sections' && currentSection && (
        <div className="rf-fab-container">
          <button
            className="rf-fab"
            onClick={() => handleReact(currentSection)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>React</span>
          </button>
          <div className="rf-mono rf-fab-label">{currentSection.title}</div>
        </div>
      )}

      {/* ══ TAG SELECTION ══ */}
      {screen === 'tags' && (
        <div className="rf-tags-screen">
          <div className="rf-tags-top">
            <div className="rf-tags-heading">
              What's your
              <br />
              reaction?
            </div>
            <div className="rf-tags-section-name">
              {selectedSection?.title}
            </div>

            {/* Pull quote from section */}
            {sectionPullQuote && (
              <div className="rf-pull-quote">
                <div className="rf-pull-quote-text">
                  &ldquo;{sectionPullQuote.text.length > 120
                    ? sectionPullQuote.text.slice(0, 120) + '\u2026'
                    : sectionPullQuote.text}&rdquo;
                </div>
                <div className="rf-mono rf-pull-quote-meta">
                  Page {sectionPullQuote.page} &middot; From this section
                </div>
              </div>
            )}

            {/* Reaction count */}
            {(() => {
              const sectionReactions = reactionsBySection[selectedSection?.id];
              const count = sectionReactions?.myCount || 0;
              return (
                <div className="rf-tags-count">
                  <span className="rf-tags-count-num">{count}</span>
                  <span className="rf-mono">
                    {count === 1 ? 'reaction' : 'reactions'} so far
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="rf-tags-bottom">
            {/* All reactions grid: 3-3-1 layout */}
            <div className="rf-tags-grid">
              {REACTION_TAGS.map((t) => {
                const active = selectedTag === t.key;
                return (
                  <button
                    key={t.key}
                    className={`rf-tag-grid-item${active ? ' active' : ''}`}
                    onClick={() => {
                      setHoveredTag(t);
                      handleTagSelect(t.key);
                    }}
                  >
                    <span className="rf-tag-grid-emoji">{t.emoji}</span>
                    <span className="rf-tag-grid-label">{t.label}</span>
                    <span className="rf-tag-grid-desc">
                      {TAG_DESCRIPTIONS[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rf-divider" />

            <button
              className="rf-bookmark-btn"
              onClick={() => {
                setSelectedTag(null);
                setTags([]);
                setScreen('compose');
              }}
            >
              Just bookmark a passage
            </button>
          </div>
        </div>
      )}

      {/* ══ COMPOSE ══ */}
      {screen === 'compose' && !submitted && (
        <div className="rf-compose">
          {/* ── Quote finder section ── */}
          <div className="rf-quote-finder">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Find a passage
            </label>

            {!selectedPassage && (
              <textarea
                value={quoteSearchText}
                onChange={(e) => setQuoteSearchText(e.target.value)}
                placeholder="Type words from the book to find the passage..."
                className="rf-textarea rf-quote-textarea"
              />
            )}

            {/* Passage suggestions */}
            {showSuggestionsPanel && (
              <PassageSuggestions
                matches={suggestedMatches}
                onSelect={handleSelectSuggestion}
                onManualSearch={() => setShowManualSearch(true)}
                idle={suggestedMatches.length === 0}
              />
            )}

            {/* Selected passage preview */}
            {showSelectedPreview && chapterData && (
              <div className="ri-selected-passage">
                <PassageHighlight
                  chapterData={chapterData}
                  passageStart={selectedPassage.start}
                  passageEnd={selectedPassage.end}
                  onUpdate={(_, updates) => {
                    if (updates.passageStart)
                      setSelectedPassage((p) => ({
                        ...p,
                        start: updates.passageStart,
                      }));
                    if (updates.passageEnd)
                      setSelectedPassage((p) => ({
                        ...p,
                        end: updates.passageEnd,
                      }));
                  }}
                  reactionId="preview"
                />
                <button
                  className="ri-clear-passage"
                  onClick={() => {
                    setSelectedPassage(null);
                    setShowManualSearch(false);
                    setQuoteSearchText('');
                  }}
                >
                  Clear passage
                </button>
              </div>
            )}

            {/* Manual search */}
            {showManualSearch && !selectedPassage && chapterData && (
              <PassageMatcher
                chapterData={sectionChapterData}
                reactionText={quoteSearchText}
                onSelect={(p) => {
                  setSelectedPassage(p);
                  setShowManualSearch(false);
                  const matchedSec = getSectionForSentence(p.start);
                  if (matchedSec) setSelectedSection(matchedSec);
                }}
                selectedPassage={selectedPassage}
                onPassageExpand={setSelectedPassage}
              />
            )}

            {!selectedPassage && !showManualSearch && (
              <button
                className="rf-manual-search-link"
                onClick={() => setShowManualSearch(true)}
              >
                Browse passages manually
              </button>
            )}
          </div>

          <div className="rf-compose-divider" />

          {/* ── Section selector ── */}
          <div className="rf-section-selector">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              Section
            </label>
            <select
              className="rf-section-select"
              value={selectedSection?.id || ''}
              onChange={(e) => {
                const sec = flowSections.find((s) => s.id === e.target.value);
                if (sec) setSelectedSection(sec);
              }}
            >
              {flowSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          <div className="rf-compose-divider" />

          {/* ── Reaction section ── */}
          <div className="rf-compose-input">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              Your reaction
            </label>

            {/* Mode toggle */}
            <div className="rf-mode-toggle">
              {['type', 'voice'].map((mode) => (
                <button
                  key={mode}
                  className={`rf-mode-btn${inputMode === mode ? ' active' : ''}`}
                  onClick={() => setInputMode(mode)}
                >
                  {mode === 'type' ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  )}
                  {mode === 'type' ? 'Type' : 'Voice'}
                </button>
              ))}
            </div>

            {inputMode === 'type' && (
              <>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="What's on your mind..."
                  className="rf-textarea"
                />
                <div className="rf-mono rf-optional-hint">
                  Optional — submit just a tag + passage
                </div>
              </>
            )}

            {inputMode === 'voice' && (
              <div className="rf-voice-area">
                <VoiceRecorder
                  reader={reader}
                  chapterId={chapterId}
                  onComplete={handleVoiceComplete}
                  showToast={showToast}
                />
                {rawTranscription && (
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Edit transcription..."
                    className="rf-textarea"
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
              </div>
            )}

            {/* Audio clips */}
            {audioClips.length > 0 && (
              <div className="audio-clips-list">
                {audioClips.map((clip, i) => (
                  <div key={i} className="audio-clip-row">
                    <AudioPlayer
                      audioBase64={clip.audioBase64}
                      audioMimeType={clip.audioMimeType}
                    />
                    <button
                      className="audio-clip-remove"
                      onClick={() => removeClip(i)}
                      title="Remove recording"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {rawTranscription && inputMode === 'type' && (
              <div className="rf-mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Transcription loaded — edit above if needed
              </div>
            )}
          </div>

          {/* ── Save button ── */}
          <button
            className={`rf-submit-btn rf-submit-inline${canSubmit ? ' enabled' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? 'Saving...'
              : canSubmit
                ? 'Save reaction'
                : 'Select a passage or type'}
          </button>
        </div>
      )}

      {/* ══ SUCCESS ══ */}
      {submitted && (
        <div className="rf-success">
          <div className="rf-success-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-gold)"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="rf-success-title">Reaction saved</div>
          <div className="rf-success-text">
            Hidden until {otherName} also finishes
            <br />
            <em>{selectedSection?.title || 'this section'}</em>
          </div>
        </div>
      )}

      {/* ══ FINISH CONFIRMATION ══ */}
      {confirmFinish && (
        <div
          className="rf-overlay"
          onClick={() => setConfirmFinish(null)}
        >
          <div
            className="rf-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rf-confirm-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-primary)"
                strokeWidth="1.5"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="rf-confirm-title">Finish this section?</div>
            <div className="rf-confirm-section">{confirmFinish.title}</div>
            <div className="rf-confirm-desc">
              {(() => {
                const sp = sectionProgress.getSectionProgress(
                  confirmFinish.id
                );
                const otherDone =
                  reader === 'Keith' ? sp.danielle : sp.keith;
                return otherDone
                  ? `${otherName} has already finished — reactions will be revealed!`
                  : `Your reactions will stay hidden until ${otherName} also finishes.`;
              })()}
            </div>
            <div className="rf-confirm-btns">
              <button
                className="rf-confirm-cancel"
                onClick={() => setConfirmFinish(null)}
              >
                Not yet
              </button>
              <button
                className={`rf-confirm-ok${(() => {
                  const sp = sectionProgress.getSectionProgress(
                    confirmFinish.id
                  );
                  return (reader === 'Keith' ? sp.danielle : sp.keith)
                    ? ' reveal'
                    : '';
                })()}`}
                onClick={confirmFinishSection}
              >
                {(() => {
                  const sp = sectionProgress.getSectionProgress(
                    confirmFinish.id
                  );
                  return (reader === 'Keith' ? sp.danielle : sp.keith)
                    ? 'Finish & reveal'
                    : "I'm done";
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ REVEAL OVERLAY ══ */}
      {revealSection && (
        <RevealOverlay
          section={revealSection}
          reader={reader}
          otherName={otherName}
          chapterId={chapterId}
          reactionsBySection={reactionsBySection}
          chapterData={chapterData}
          onDismiss={() => {
            setRevealSection(null);
            setPartialReveal(false);
          }}
          partialReveal={partialReveal}
          onShowConcept={onShowConcept}
          onAddReply={addReply}
          onUpdateReaction={updateReaction}
          onDeleteReaction={deleteReaction}
          onDeleteReply={deleteReply}
        />
      )}
    </div>
  );
}

// ── Reveal Overlay ──
function RevealOverlay({
  section,
  reader,
  otherName,
  chapterId,
  reactionsBySection,
  chapterData,
  onDismiss,
  partialReveal,
  onShowConcept,
  onAddReply,
  onUpdateReaction,
  onDeleteReaction,
  onDeleteReply,
}) {
  const sectionData = reactionsBySection[section.id];
  const myReactions = sectionData?.mine || [];
  const otherReactionsList = sectionData?.others || [];

  // Mark as revealed in localStorage
  useEffect(() => {
    if (!partialReveal) {
      localStorage.setItem(`jung-revealed-${chapterId}-${section.id}`, 'true');
    }
  }, [partialReveal, chapterId, section.id]);

  const visibleReactions = partialReveal
    ? sortByPassagePosition(myReactions)
    : sortByPassagePosition([...myReactions, ...otherReactionsList]);

  return (
    <div className="rf-reveal-overlay">
      <div className="rf-reveal-header">
        <button className="rf-back-btn" onClick={onDismiss}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="rf-reveal-content">
        <div className="rf-reveal-top">
          <div className="rf-reveal-icon-container">
            {partialReveal ? (
              <div className="rf-avatar keith" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                {reader[0]}
              </div>
            ) : (
              <div className="rf-reveal-avatars">
                <div className="rf-avatar keith">K</div>
                <div className="rf-avatar danielle overlap">D</div>
              </div>
            )}
          </div>
          <div className="rf-reveal-title">
            {partialReveal ? 'Your reactions' : 'Reactions unlocked'}
          </div>
          <div className="rf-reveal-section">{section.title}</div>
          {partialReveal ? (
            <div className="rf-mono rf-reveal-count">
              {myReactions.length} reaction
              {myReactions.length !== 1 ? 's' : ''} &middot; {otherName}'s
              will appear when they finish
            </div>
          ) : (
            <div className="rf-mono rf-reveal-count">
              {myReactions.length} from you &middot;{' '}
              {otherReactionsList.length} from {otherName}
            </div>
          )}
        </div>

        {/* Other's hidden teaser */}
        {partialReveal && otherReactionsList.length > 0 && (
          <div className="rf-reveal-teaser">
            <div className={`rf-avatar ${otherName.toLowerCase()}`} style={{ width: 22, height: 22, fontSize: '0.6rem' }}>
              {otherName[0]}
            </div>
            <div className="rf-reveal-teaser-text">
              {otherName} has {otherReactionsList.length} reaction
              {otherReactionsList.length !== 1 ? 's' : ''} waiting
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-dim)"
              strokeWidth="1.5"
              style={{ marginLeft: 'auto' }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}

        <div className="rf-reveal-reactions">
          {visibleReactions.map((r) => (
            <ReactionCard
              key={r.id}
              reaction={r}
              chapterData={chapterData}
              onShowConcept={onShowConcept}
              onUpdate={onUpdateReaction}
              reader={reader}
              onAddReply={onAddReply}
              onDeleteReaction={r.reader === reader ? onDeleteReaction : undefined}
              onDeleteReply={onDeleteReply}
            />
          ))}
          {visibleReactions.length === 0 && (
            <div className="rf-reveal-empty">
              {partialReveal
                ? "You haven't reacted to this section yet"
                : 'No reactions for this section yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
