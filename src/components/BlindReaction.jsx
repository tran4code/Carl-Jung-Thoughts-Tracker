import { useState } from 'react';
import SealedEnvelope from './SealedEnvelope';
import ReactionCard from './ReactionCard';
import VoiceRecorder from './VoiceRecorder';
import TagPicker from './TagPicker';
import { matchPassage } from '../services/claude';

export default function BlindReaction({
  reader, chapterId, chapterData,
  hasSubmitted, bothSubmitted, revealed,
  keithReaction, danielleReaction,
  onSubmit, onReveal, showToast, onShowConcept,
}) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState('text'); // 'text' | 'voice'

  // State: Revealed — show both reactions with animation
  if (revealed && keithReaction && danielleReaction) {
    // Find shared tags
    const keithTags = new Set(keithReaction.tags || []);
    const danielleTags = new Set(danielleReaction.tags || []);
    const shared = [...keithTags].filter((t) => danielleTags.has(t));

    return (
      <div>
        <div className="reveal-keith">
          <ReactionCard
            reaction={keithReaction}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
          />
        </div>
        <div className="reveal-danielle">
          <ReactionCard
            reaction={danielleReaction}
            chapterData={chapterData}
            onShowConcept={onShowConcept}
          />
        </div>
        {shared.length > 0 && (
          <div style={{
            textAlign: 'center',
            margin: '1rem 0',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            Shared symbols: {shared.map((s) => (
              <span key={s} className="tag-chip shared-symbol" style={{ marginLeft: '0.3rem' }}>{s}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // State: Both submitted but not revealed yet
  if (bothSubmitted && !revealed) {
    return (
      <SealedEnvelope
        bothSubmitted
        onBreakSeal={onReveal}
        keithSubmitted
        danielleSubmitted
      />
    );
  }

  // State: Already submitted, waiting for the other
  if (hasSubmitted) {
    const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';
    return (
      <SealedEnvelope
        bothSubmitted={false}
        keithSubmitted={!!keithReaction}
        danielleSubmitted={!!danielleReaction}
        waitingFor={otherName}
      />
    );
  }

  // State: Haven't submitted yet — show input
  const handleVoiceComplete = async (result) => {
    if (!result) return;
    setText(result.transcription);

    // Try Claude passage matching
    if (chapterData) {
      try {
        const match = await matchPassage(result.transcription, chapterData);
        setText(match.cleanedAnnotation || result.transcription);
        setTags(match.detectedTags || []);

        if (match.confidence === 'low') {
          showToast('Low confidence match — please review the annotation');
        }

        // Submit with passage info
        await submitReaction(
          match.cleanedAnnotation || result.transcription,
          result.transcription,
          result.audioUrl,
          match.passageStart,
          match.passageEnd,
          match.detectedTags || [],
        );
        return;
      } catch {
        showToast('Passage matching failed — submitting transcription as-is');
      }
    }
  };

  const submitReaction = async (
    cleanText, rawTranscription = null, audioUrl = null,
    passageStart = null, passageEnd = null, reactionTags = tags,
  ) => {
    setSubmitting(true);
    try {
      await onSubmit({
        reader,
        text: cleanText || text.trim(),
        rawTranscription,
        audioUrl,
        passageStart,
        passageEnd,
        tags: reactionTags,
        isBlindReaction: true,
        page: null,
      });
      setText('');
      setTags([]);
    } catch {
      showToast('Failed to submit reaction', true);
    }
    setSubmitting(false);
  };

  const otherName = reader === 'Keith' ? 'Danielle' : 'Keith';
  const otherSubmitted = reader === 'Keith' ? !!danielleReaction : !!keithReaction;

  return (
    <div className="seal-container">
      <div className="seal-visual">
        {'\u{1F512}'}
      </div>

      {otherSubmitted && (
        <p className="seal-waiting">{otherName} has sealed their reaction</p>
      )}

      <div style={{ margin: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            className={`btn btn-small ${mode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('text')}
          >
            Write
          </button>
          <button
            className={`btn btn-small ${mode === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('voice')}
          >
            Speak
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            placeholder="What stood out to you in this chapter?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            style={{ textAlign: 'left' }}
          />
        ) : (
          <VoiceRecorder
            reader={reader}
            chapterId={chapterId}
            onComplete={handleVoiceComplete}
            showToast={showToast}
          />
        )}

        <TagPicker selected={tags} onChange={setTags} />

        {mode === 'text' && (
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => submitReaction(text.trim())}
            disabled={submitting || !text.trim()}
          >
            {submitting ? 'Sealing...' : 'Seal My Reaction'}
          </button>
        )}
      </div>
    </div>
  );
}
