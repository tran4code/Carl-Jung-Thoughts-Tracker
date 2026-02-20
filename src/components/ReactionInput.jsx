import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import TagPicker from './TagPicker';
import PassageMatcher from './PassageMatcher';
import AudioPlayer from './AudioPlayer';

export default function ReactionInput({ reader, chapterId, chapterData, addReaction, showToast }) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [rawTranscription, setRawTranscription] = useState(null);
  const [audioClips, setAudioClips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState(null);

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

  // Can save if there's text, a tag, or a passage — any combination
  const canSubmit = text.trim() || tags.length > 0 || selectedPassage;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await addReaction({
        reader,
        text: text.trim() || null,
        rawTranscription,
        audioClips: audioClips.length > 0 ? audioClips : null,
        audioBase64: audioClips[0]?.audioBase64 || null,
        audioMimeType: audioClips[0]?.audioMimeType || null,
        passageStart: selectedPassage?.start || null,
        passageEnd: selectedPassage?.end || null,
        tags,
        isBlindReaction: false,
        page: null,
      });
      setText('');
      setTags([]);
      setRawTranscription(null);
      setAudioClips([]);
      setSelectedPassage(null);
    } catch {
      showToast('Failed to save reaction', true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reaction-input">
      {/* 1. Tags first — set the intention */}
      <TagPicker selected={tags} onChange={setTags} />

      {/* 2. Reaction text (optional) */}
      <textarea
        placeholder="What's on your mind? (optional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ textAlign: 'left' }}
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

      <VoiceRecorder
        reader={reader}
        chapterId={chapterId}
        onComplete={handleVoiceComplete}
        showToast={showToast}
      />

      {/* 3. Find Passage (optional) */}
      {chapterData && (
        <PassageMatcher
          chapterData={chapterData}
          reactionText={text}
          onSelect={setSelectedPassage}
          selectedPassage={selectedPassage}
          onPassageExpand={setSelectedPassage}
        />
      )}

      {/* Submit */}
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
      >
        {submitting ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
