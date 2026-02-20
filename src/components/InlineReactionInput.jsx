import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import TagPicker from './TagPicker';
import PassageHighlight from './PassageHighlight';
import AudioPlayer from './AudioPlayer';

export default function InlineReactionInput({
  reader, chapterId, chapterData,
  passageStart, passageEnd,
  addReaction, showToast, onClose, onSubmitted, onPassageChange,
}) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [rawTranscription, setRawTranscription] = useState(null);
  const [audioClips, setAudioClips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentStart, setCurrentStart] = useState(passageStart);
  const [currentEnd, setCurrentEnd] = useState(passageEnd);

  const handleVoiceComplete = (result) => {
    if (!result) return;
    setText((prev) => {
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

  const handleSubmit = async () => {
    if (!text.trim() && tags.length === 0) return;
    setSubmitting(true);
    try {
      await addReaction({
        reader,
        text: text.trim() || null,
        rawTranscription,
        audioClips: audioClips.length > 0 ? audioClips : null,
        audioBase64: audioClips[0]?.audioBase64 || null,
        audioMimeType: audioClips[0]?.audioMimeType || null,
        passageStart: currentStart,
        passageEnd: currentEnd,
        tags,
        isBlindReaction: false,
        page: null,
      });
      onSubmitted();
    } catch {
      showToast('Failed to save reaction', true);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = text.trim() || tags.length > 0;

  return (
    <div className="inline-reaction-input">
      {/* 1. Passage preview (already selected from text) */}
      <PassageHighlight
        chapterData={chapterData}
        passageStart={currentStart}
        passageEnd={currentEnd}
        onUpdate={(_, updates) => {
          if (updates.passageStart) {
            setCurrentStart(updates.passageStart);
            onPassageChange?.(updates.passageStart, currentEnd);
          }
          if (updates.passageEnd) {
            setCurrentEnd(updates.passageEnd);
            onPassageChange?.(currentStart, updates.passageEnd);
          }
        }}
        reactionId="inline-preview"
      />

      {/* 2. Tags — set the intention */}
      <TagPicker selected={tags} onChange={setTags} />

      {/* 3. Reaction text (optional) */}
      <textarea
        placeholder="What's on your mind? (optional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        autoFocus
      />

      {rawTranscription && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
          Transcription loaded — edit above if needed
        </div>
      )}

      {audioClips.length > 0 && (
        <div className="audio-clips-list">
          {audioClips.map((clip, i) => (
            <div key={i} className="audio-clip-row">
              <AudioPlayer audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
              <button className="audio-clip-remove" onClick={() => removeClip(i)} title="Remove recording">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <VoiceRecorder
        reader={reader}
        chapterId={chapterId}
        onComplete={handleVoiceComplete}
        showToast={showToast}
      />

      {/* 4. Submit */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          className="btn btn-primary btn-small"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          style={{ flex: 1 }}
        >
          {submitting ? 'Saving...' : 'Add Reaction'}
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={onClose}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
