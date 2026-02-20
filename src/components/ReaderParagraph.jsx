import { memo, useRef, useEffect } from 'react';
import ReactionCard from './ReactionCard';
import { REACTION_TAGS } from './TagPicker';

const tagMap = Object.fromEntries(REACTION_TAGS.map((t) => [t.key, t]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatNoteDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ReaderParagraph({
  paragraph, reactions, selectionStart, selectionEnd,
  onSentenceTap, expandedReaction, onExpandReaction,
  sentencesWithReactions, canTap, isFirst, dimmed,
  // ReactionCard pass-through props
  chapterData, onShowConcept, reader, onAddReply, onDeleteReaction, onDeleteReply, onUpdate,
}) {
  const ref = useRef(null);

  // Fade-in on scroll
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('visible');
          obs.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isInRange = (sentenceId) => {
    if (!selectionStart || !selectionEnd) return false;
    const [normStart, normEnd] = selectionStart.localeCompare(selectionEnd) <= 0
      ? [selectionStart, selectionEnd]
      : [selectionEnd, selectionStart];
    return sentenceId.localeCompare(normStart) >= 0 && sentenceId.localeCompare(normEnd) <= 0;
  };

  const showGrouped = expandedReaction === `group-${paragraph.id}`;
  const hasAnyExpanded = reactions.some(
    (r) => expandedReaction === r.id || showGrouped
  );

  // Figure paragraphs: image + caption (caption is tappable for quoting)
  if (paragraph.type === 'figure') {
    const captionSentence = (paragraph.sentences || [])[0];
    const captionSelected = captionSentence && isInRange(captionSentence.id);
    const captionHasReaction = captionSentence && sentencesWithReactions.has(captionSentence.id);
    return (
      <div
        ref={ref}
        className={`reader-paragraph-wrapper reader-figure fade-in${dimmed ? ' section-dimmed' : ''}`}
        data-page={paragraph.page}
      >
        <figure className="reader-figure-block">
          <img
            src={`${import.meta.env.BASE_URL}book/images/${paragraph.image}`}
            alt={paragraph.caption || ''}
            loading="lazy"
          />
          {captionSentence && (
            <figcaption
              className={`reader-figure-caption reader-sentence${captionSelected ? ' selected' : ''}${captionHasReaction ? ' has-reaction' : ''}${canTap ? '' : ' disabled'}`}
              onClick={canTap ? () => onSentenceTap(captionSentence.id) : undefined}
            >
              {captionSentence.text}
            </figcaption>
          )}
        </figure>

        {/* Margin notes for figures */}
        {reactions.length > 0 && (
          <div className="reader-margin-notes">
            {reactions.length <= 3 ? (
              reactions.map((r) => {
                const isExpanded = expandedReaction === r.id || showGrouped;
                return (
                  <div
                    key={r.id}
                    className={`reader-margin-note ${r.reader.toLowerCase()}${isExpanded ? ' expanded' : ''}`}
                    onClick={() => onExpandReaction(expandedReaction === r.id ? null : r.id)}
                  >
                    {r.tags && r.tags.length > 0 && tagMap[r.tags[0]] && (
                      <div className="margin-note-tag">{tagMap[r.tags[0]].label}</div>
                    )}
                    <div className="margin-note-preview">{r.text}</div>
                    <div className="margin-note-footer">
                      {r.reader === reader ? 'Your note' : r.reader}
                      {r.timestamp && <> &middot; {formatNoteDate(r.timestamp)}</>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="margin-note-count"
                onClick={() => onExpandReaction(showGrouped ? null : `group-${paragraph.id}`)}
              >
                {reactions.length} annotations
              </div>
            )}
          </div>
        )}

        {/* Expanded reaction cards for figures */}
        {hasAnyExpanded && reactions.map((r) => {
          const isExpanded = expandedReaction === r.id || showGrouped;
          if (!isExpanded) return null;
          return (
            <div key={r.id} className="reader-expanded-reaction">
              <ReactionCard
                reaction={r}
                chapterData={chapterData}
                onShowConcept={onShowConcept}
                onUpdate={onUpdate}
                reader={reader}
                onAddReply={onAddReply}
                onDeleteReaction={onDeleteReaction}
                onDeleteReply={onDeleteReply}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`reader-paragraph-wrapper fade-in${isFirst ? ' drop-cap' : ''}${dimmed ? ' section-dimmed' : ''}`}
      data-page={paragraph.page}
    >
      <span className="reader-page-number">p.{paragraph.page}</span>
      <div className="reader-paragraph-text">
        {(paragraph.sentences || []).map((s) => {
          const selected = isInRange(s.id);
          const hasReaction = sentencesWithReactions.has(s.id);
          return (
            <span
              key={s.id}
              className={`reader-sentence${selected ? ' selected' : ''}${hasReaction ? ' has-reaction' : ''}${canTap ? '' : ' disabled'}`}
              onClick={canTap ? () => onSentenceTap(s.id) : undefined}
            >
              {s.text}{' '}
            </span>
          );
        })}
      </div>

      {/* Margin notes */}
      {reactions.length > 0 && (
        <div className="reader-margin-notes">
          {reactions.length <= 3 ? (
            reactions.map((r) => {
              const isExpanded = expandedReaction === r.id || showGrouped;
              return (
                <div
                  key={r.id}
                  className={`reader-margin-note ${r.reader.toLowerCase()}${isExpanded ? ' expanded' : ''}`}
                  onClick={() => onExpandReaction(expandedReaction === r.id ? null : r.id)}
                >
                  {r.tags && r.tags.length > 0 && tagMap[r.tags[0]] && (
                    <div className="margin-note-tag">{tagMap[r.tags[0]].label}</div>
                  )}
                  <div className="margin-note-preview">{r.text}</div>
                  <div className="margin-note-footer">
                    {r.reader === reader ? 'Your note' : r.reader}
                    {r.timestamp && <> &middot; {formatNoteDate(r.timestamp)}</>}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className="margin-note-count"
              onClick={() => onExpandReaction(showGrouped ? null : `group-${paragraph.id}`)}
            >
              {reactions.length} annotations
            </div>
          )}
        </div>
      )}

      {/* Expanded reaction cards */}
      {hasAnyExpanded && reactions.map((r) => {
        const isExpanded = expandedReaction === r.id || showGrouped;
        if (!isExpanded) return null;
        return (
          <div key={r.id} className="reader-expanded-reaction">
            <ReactionCard
              reaction={r}
              chapterData={chapterData}
              onShowConcept={onShowConcept}
              onUpdate={onUpdate}
              reader={reader}
              onAddReply={onAddReply}
              onDeleteReaction={onDeleteReaction}
              onDeleteReply={onDeleteReply}
            />
          </div>
        );
      })}
    </div>
  );
}

export default memo(ReaderParagraph, (prev, next) => {
  return (
    prev.paragraph === next.paragraph &&
    prev.reactions === next.reactions &&
    prev.selectionStart === next.selectionStart &&
    prev.selectionEnd === next.selectionEnd &&
    prev.expandedReaction === next.expandedReaction &&
    prev.sentencesWithReactions === next.sentencesWithReactions &&
    prev.canTap === next.canTap &&
    prev.isFirst === next.isFirst &&
    prev.dimmed === next.dimmed
  );
});
