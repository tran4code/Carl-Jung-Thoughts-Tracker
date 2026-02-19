import { useState, useEffect } from 'react';
import { useBlindReactions } from '../hooks/useFirestore';
import chaptersMeta from '../data/chapters-meta.json';
import BlindReaction from './BlindReaction';
import ReactionCard from './ReactionCard';
import PassageHighlight from './PassageHighlight';
import DiscussionQuestions from './DiscussionQuestions';
import ImaginationPrompt from './ImaginationPrompt';
import ConceptHighlighter from './ConceptHighlighter';
import MiniConstellation from './MiniConstellation';

export default function ChapterDetail({ chapterId, reader, onBack, onShowConcept, showToast }) {
  const [chapterData, setChapterData] = useState(null);
  const meta = chaptersMeta.find((c) => c.id === chapterId);
  const {
    blindReactions, keithReaction, danielleReaction,
    bothSubmitted, loading, addReaction, allReactions,
  } = useBlindReactions(chapterId);

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}book/chapter-${chapterId}.json`)
      .then((r) => r.json())
      .then(setChapterData)
      .catch(() => showToast('Failed to load chapter text', true));
  }, [chapterId, showToast]);

  // Check if this chapter was already revealed previously (both submitted)
  useEffect(() => {
    if (bothSubmitted) {
      // Check localStorage for reveal state
      const key = `jung-revealed-${chapterId}`;
      if (localStorage.getItem(key)) {
        setRevealed(true);
      }
    }
  }, [bothSubmitted, chapterId]);

  const handleReveal = () => {
    setRevealed(true);
    localStorage.setItem(`jung-revealed-${chapterId}`, 'true');
  };

  const myReaction = reader === 'Keith' ? keithReaction : danielleReaction;
  const hasSubmitted = !!myReaction;

  // Non-blind reactions (annotations added after reveal)
  const annotations = allReactions.filter((r) => !r.isBlindReaction);

  return (
    <div className="chapter-detail">
      <button className="back-btn" onClick={onBack}>&larr; All Chapters</button>

      <div className="detail-header">
        <div className="detail-title">{meta?.title}</div>
        <div className="detail-author">{meta?.author}</div>
        <div className="detail-pages">Pages {meta?.pageRange}</div>
        <MiniConstellation chapterId={chapterId} />
      </div>

      {/* Blind Reaction Section */}
      <h3 className="section-heading">Blind Reactions</h3>

      {loading ? (
        <div className="spinner" />
      ) : (
        <BlindReaction
          reader={reader}
          chapterId={chapterId}
          chapterData={chapterData}
          hasSubmitted={hasSubmitted}
          bothSubmitted={bothSubmitted}
          revealed={revealed}
          keithReaction={keithReaction}
          danielleReaction={danielleReaction}
          onSubmit={addReaction}
          onReveal={handleReveal}
          showToast={showToast}
          onShowConcept={onShowConcept}
        />
      )}

      {/* After reveal: show annotations, discussion, and prompts */}
      {revealed && (
        <>
          {/* Additional annotations */}
          <h3 className="section-heading">Annotations</h3>
          {annotations.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              No annotations yet. Add thoughts as you discuss.
            </p>
          )}
          {annotations.map((r) => (
            <ReactionCard
              key={r.id}
              reaction={r}
              chapterData={chapterData}
              onShowConcept={onShowConcept}
              onUpdate={null}
            />
          ))}

          {/* Annotation input */}
          <AnnotationInput
            reader={reader}
            chapterId={chapterId}
            chapterData={chapterData}
            addReaction={addReaction}
            showToast={showToast}
          />

          {/* Discussion Questions */}
          <h3 className="section-heading">Discussion</h3>
          <DiscussionQuestions
            chapterId={chapterId}
            chapterData={chapterData}
            keithReactions={allReactions.filter((r) => r.reader === 'Keith')}
            danielleReactions={allReactions.filter((r) => r.reader === 'Danielle')}
            showToast={showToast}
          />

          {/* Active Imagination */}
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

function AnnotationInput({ reader, chapterId, chapterData, addReaction, showToast }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await addReaction({
        reader,
        text: text.trim(),
        rawTranscription: null,
        audioUrl: null,
        passageStart: null,
        passageEnd: null,
        tags: [],
        isBlindReaction: false,
        page: null,
      });
      setText('');
    } catch {
      showToast('Failed to save annotation', true);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <textarea
        placeholder="Add an annotation..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
      />
      <button
        className="btn btn-primary btn-small"
        style={{ marginTop: '0.5rem' }}
        onClick={handleSubmit}
        disabled={submitting || !text.trim()}
      >
        {submitting ? 'Saving...' : 'Add Note'}
      </button>
    </div>
  );
}
