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
    // Append transcription to existing text
    setText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${result.transcription}` : result.transcription;
    });
    setRawTranscription((prev) => {
      const trimmed = prev?.trim();
      return trimmed ? `${trimmed} ${result.transcription}` : result.transcription;
    });
    // Stack audio clip
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
    if (!text.trim()) return;
    setSubmitting(true);

    try {
      await addReaction({
        reader,
        text: text.trim(),
        rawTranscription,
        audioClips: audioClips.length > 0 ? audioClips : null,
        // Keep single fields for backward compat
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
      <textarea
        placeholder="What stood out to you?"
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

      {/* Stacked audio clips */}
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

      {/* Compact inline voice recorder */}
      <VoiceRecorder
        reader={reader}
        chapterId={chapterId}
        onComplete={handleVoiceComplete}
        showToast={showToast}
      />

      {chapterData && (
        <PassageMatcher
          chapterData={chapterData}
          reactionText={text}
          onSelect={setSelectedPassage}
          selectedPassage={selectedPassage}
          onPassageExpand={setSelectedPassage}
        />
      )}

      <TagPicker selected={tags} onChange={setTags} />

      <button
        className="btn btn-primary"
        style={{ marginTop: '0.75rem', width: '100%' }}
        onClick={handleSubmit}
        disabled={submitting || !text.trim()}
      >
        {submitting ? 'Saving...' : 'Add Reaction'}
      </button>
    </div>
  );
}
