import { useState, useEffect, useCallback, useRef } from 'react';
import { useChapterReactions, useChapterProgress, useSectionProgress } from '../hooks/useFirestore';
import { useReaderNavigation } from '../hooks/useReaderNavigation';
import { sortByPassagePosition } from '../utils/sortReactions';
import chaptersMeta from '../data/chapters-meta.json';
import ChapterReader from './ChapterReader';
import ReactionStream from './ReactionStream';
import ReactionInput from './ReactionInput';
import ChapterReveal from './ChapterReveal';
import DiscussionQuestions from './DiscussionQuestions';
import ImaginationPrompt from './ImaginationPrompt';
import MiniConstellation from './MiniConstellation';
import BottomBar from './BottomBar';
import DesktopRail from './DesktopRail';
import TopBar from './TopBar';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const toRoman = (n) => ROMAN[n] || String(n);

export default function ChapterDetail({ chapterId, reader, onBack, onShowConcept, showToast }) {
  const [chapterData, setChapterData] = useState(null);
  const meta = chaptersMeta.find((c) => c.id === chapterId);
  const readerRef = useRef(null);

  const {
    myReactions, otherReactions, allReactions,
    loading: reactionsLoading, addReaction, updateReaction, addReply, deleteReaction, deleteReply,
  } = useChapterReactions(chapterId, reader);

  const {
    keithFinished, danielleFinished, bothFinished,
    loading: progressLoading, markFinished,
  } = useChapterProgress(chapterId);

  const sectionProgressHook = useSectionProgress(chapterId);

  const navState = useReaderNavigation(chapterData, readerRef, myReactions, otherReactions, false);

  const [revealed, setRevealed] = useState(false);
  const [viewMode, setViewMode] = useState('reactions');

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}book/chapter-${chapterId}.json`)
      .then((r) => r.json())
      .then(setChapterData)
      .catch(() => showToast('Failed to load chapter text', true));
  }, [chapterId, showToast]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    localStorage.setItem(`jung-revealed-${chapterId}`, 'true');
  }, [chapterId]);

  const handleMarkFinished = async () => {
    try {
      await markFinished(reader);
    } catch {
      showToast('Failed to mark as finished', true);
    }
  };

  const iFinished = reader === 'Keith' ? keithFinished : danielleFinished;
  const loading = reactionsLoading || progressLoading;
  const showBottomBar = viewMode === 'reader' && chapterData && !loading;

  return (
    <div className="chapter-detail">
      <button className="back-btn" onClick={onBack}>&larr; All Chapters</button>

      {showBottomBar && <TopBar meta={meta} />}

      <div className="detail-header">
        <div className="detail-chapter-num">Part {toRoman(chapterId)}</div>
        <div className="detail-title">{meta?.title}</div>
        <div className="detail-author">{meta?.author}</div>
        <div className="detail-pages">Pages {meta?.pageRange}</div>
        {meta?.sections && (
          <div className="detail-sections-list">
            {meta.sections.filter(s => s.level === 2).map((s, i) => (
              <span key={s.id} className="detail-section-name">
                {i > 0 && <span className="detail-section-sep">&middot;</span>}
                {s.title}
              </span>
            ))}
          </div>
        )}
        <MiniConstellation reactions={myReactions} />
      </div>

      <div className="view-mode-toggle">
        <button
          className={`view-mode-btn${viewMode === 'reader' ? ' active' : ''}`}
          onClick={() => setViewMode('reader')}
        >
          Read
        </button>
        <button
          className={`view-mode-btn${viewMode === 'reactions' ? ' active' : ''}`}
          onClick={() => setViewMode('reactions')}
        >
          Reactions <span className="tab-count">({allReactions.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : viewMode === 'reader' ? (
        <>
          <ChapterReader
            chapterData={chapterData}
            myReactions={myReactions}
            otherReactions={otherReactions}
            revealed={revealed}
            reader={reader}
            chapterId={chapterId}
            iFinished={iFinished}
            addReaction={addReaction}
            updateReaction={updateReaction}
            addReply={addReply}
            deleteReaction={deleteReaction}
            deleteReply={deleteReply}
            onShowConcept={onShowConcept}
            showToast={showToast}
            sectionProgress={sectionProgressHook}
            markSectionFinished={sectionProgressHook.markSectionFinished}
            readerRef={readerRef}
          />

          <ChapterReveal
            reader={reader}
            chapterId={chapterId}
            myReactions={myReactions}
            otherReactions={otherReactions}
            bothFinished={bothFinished}
            keithFinished={keithFinished}
            danielleFinished={danielleFinished}
            onMarkFinished={handleMarkFinished}
            onReveal={handleReveal}
            revealed={revealed}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
            onAddReply={addReply}
            onDeleteReaction={deleteReaction}
            onDeleteReply={deleteReply}
          />
        </>
      ) : (
        <>
          {!iFinished && (
            <ReactionInput
              reader={reader}
              chapterId={chapterId}
              chapterData={chapterData}
              addReaction={addReaction}
              showToast={showToast}
            />
          )}

          <ReactionStream
            reactions={sortByPassagePosition(allReactions)}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
            onUpdateReaction={updateReaction}
            reader={reader}
            onAddReply={addReply}
            onDeleteReaction={deleteReaction}
            onDeleteReply={deleteReply}
            revealed={revealed}
          />

          <ChapterReveal
            reader={reader}
            chapterId={chapterId}
            myReactions={myReactions}
            otherReactions={otherReactions}
            bothFinished={bothFinished}
            keithFinished={keithFinished}
            danielleFinished={danielleFinished}
            onMarkFinished={handleMarkFinished}
            onReveal={handleReveal}
            revealed={revealed}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
            onAddReply={addReply}
            onDeleteReaction={deleteReaction}
            onDeleteReply={deleteReply}
          />
        </>
      )}

      {revealed && (
        <>
          <h3 className="section-heading">Discussion</h3>
          <DiscussionQuestions
            chapterId={chapterId}
            chapterData={chapterData}
            keithReactions={allReactions.filter((r) => r.reader === 'Keith')}
            danielleReactions={allReactions.filter((r) => r.reader === 'Danielle')}
            showToast={showToast}
          />

          <h3 className="section-heading">Active Imagination</h3>
          <ImaginationPrompt
            chapterId={chapterId}
            reader={reader}
            onShowConcept={onShowConcept}
          />
        </>
      )}

      {showBottomBar && (
        <>
          <BottomBar
            sectionMetrics={navState.sectionMetrics}
            currentSectionIndex={navState.currentSectionIndex}
            scrollProgress={navState.scrollProgress}
            reactionPositions={navState.reactionPositions}
            goToSection={navState.goToSection}
            reader={reader}
          />
          <DesktopRail
            sectionMetrics={navState.sectionMetrics}
            currentSectionIndex={navState.currentSectionIndex}
            scrollProgress={navState.scrollProgress}
            reactionPositions={navState.reactionPositions}
            goToSection={navState.goToSection}
            goToPosition={navState.goToPosition}
            pagePositions={navState.pagePositions}
            reader={reader}
          />
        </>
      )}
    </div>
  );
}
