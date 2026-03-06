import { useState, useEffect, useRef } from 'react';
import { useChapterReactions, useChapterProgress, useSectionProgress } from '../hooks/useFirestore';
import chaptersMeta from '../data/chapters-meta.json';
import ReactionFlow from './ReactionFlow';
import ChapterReader from './ChapterReader';

export default function ChapterDetail({ chapterId, reader, onBack, onShowConcept, showToast }) {
  const [chapterData, setChapterData] = useState(null);
  const [viewMode, setViewMode] = useState('reactions');
  const meta = chaptersMeta.find((c) => c.id === chapterId);
  const readerRef = useRef(null);

  const {
    myReactions, otherReactions, allReactions,
    loading: reactionsLoading, addReaction, updateReaction, addReply, deleteReaction, deleteReply,
  } = useChapterReactions(chapterId, reader);

  const { loading: progressLoading } = useChapterProgress(chapterId);

  const sectionProgressHook = useSectionProgress(chapterId);

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}book/chapter-${chapterId}.json`)
      .then((r) => r.json())
      .then(setChapterData)
      .catch(() => showToast('Failed to load chapter text', true));
  }, [chapterId, showToast]);

  const loading = reactionsLoading || progressLoading;

  // Check if current reader has finished the chapter (any section)
  const iFinished = false; // simplified — ChapterReader uses this for reveal logic

  return (
    <div className="chapter-detail">
      {loading ? (
        <div className="spinner" />
      ) : viewMode === 'reactions' ? (
        <ReactionFlow
          reader={reader}
          chapterId={chapterId}
          chapterData={chapterData}
          meta={meta}
          sections={chapterData?.sections || meta?.sections || []}
          myReactions={myReactions}
          otherReactions={otherReactions}
          allReactions={allReactions}
          addReaction={addReaction}
          updateReaction={updateReaction}
          addReply={addReply}
          deleteReaction={deleteReaction}
          deleteReply={deleteReply}
          sectionProgress={sectionProgressHook}
          onShowConcept={onShowConcept}
          showToast={showToast}
          revealed={revealed}
          onBack={onBack}
          onRead={() => setViewMode('read')}
        />
      ) : (
        <div className="reader-view">
          <div className="reader-view-header">
            <button className="rf-back-btn" onClick={() => setViewMode('reactions')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Reactions
            </button>
            <div className="rf-header-title">{meta?.title}</div>
            <div style={{ width: 44 }} />
          </div>
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
        </div>
      )}
    </div>
  );
}
