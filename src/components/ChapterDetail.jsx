import { useState, useEffect, useCallback } from 'react';
import { useChapterReactions, useChapterProgress } from '../hooks/useFirestore';
import { sortByPassagePosition } from '../utils/sortReactions';
import chaptersMeta from '../data/chapters-meta.json';
import ReactionStream from './ReactionStream';
import ReactionInput from './ReactionInput';
import ChapterReveal from './ChapterReveal';
import DiscussionQuestions from './DiscussionQuestions';
import ImaginationPrompt from './ImaginationPrompt';
import MiniConstellation from './MiniConstellation';

export default function ChapterDetail({ chapterId, reader, onBack, onShowConcept, showToast }) {
  const [chapterData, setChapterData] = useState(null);
  const meta = chaptersMeta.find((c) => c.id === chapterId);

  const {
    myReactions, otherReactions, allReactions,
    loading: reactionsLoading, addReaction, updateReaction, addReply, deleteReaction, deleteReply,
  } = useChapterReactions(chapterId, reader);

  const {
    keithFinished, danielleFinished, bothFinished,
    loading: progressLoading, markFinished,
  } = useChapterProgress(chapterId);

  const [revealed, setRevealed] = useState(false);

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

  return (
    <div className="chapter-detail">
      <button className="back-btn" onClick={onBack}>&larr; All Chapters</button>

      <div className="detail-header">
        <div className="detail-title">{meta?.title}</div>
        <div className="detail-author">{meta?.author}</div>
        <div className="detail-pages">Pages {meta?.pageRange}</div>
        <MiniConstellation reactions={myReactions} />
      </div>

      {!iFinished && (
        <ReactionInput
          reader={reader}
          chapterId={chapterId}
          chapterData={chapterData}
          addReaction={addReaction}
          showToast={showToast}
        />
      )}

      <h3 className="section-heading">My Reactions</h3>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <ReactionStream
            reactions={sortByPassagePosition(myReactions)}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
            onUpdateReaction={updateReaction}
            reader={reader}
            onAddReply={addReply}
            onDeleteReaction={deleteReaction}
            onDeleteReply={deleteReply}
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
    </div>
  );
}
