import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';

export default function ReplySection({ replies = [], reactionId, reader, onAddReply, onDeleteReply, chapterId }) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');
  const [audioClips, setAudioClips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleVoiceComplete = (result) => {
    if (!result) return;
    setText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${result.transcription}` : result.transcription;
    });
    if (result.audioBase64) {
      setAudioClips((prev) => [
        ...prev,
        { audioBase64: result.audioBase64, audioMimeType: result.audioMimeType },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAddReply(reactionId, {
        reader,
        text: text.trim(),
        audioClips: audioClips.length > 0 ? audioClips : null,
      });
      setText('');
      setAudioClips([]);
      setShowInput(false);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedReplies = [...replies].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="reply-section">
      {sortedReplies.map((reply) => (
        <div key={reply.id} className={`reply-item ${reply.reader.toLowerCase()}`}>
          <div className="reply-header">
            <span className={`reply-reader ${reply.reader.toLowerCase()}`}>
              {reply.reader}
            </span>
            {onDeleteReply && reply.reader === reader && (
              confirmDeleteId === reply.id ? (
                <span className="reply-confirm-delete">
                  <button
                    className="reply-confirm-yes"
                    onClick={() => { onDeleteReply(reactionId, reply.id); setConfirmDeleteId(null); }}
                  >
                    Delete
                  </button>
                  <button
                    className="reply-confirm-no"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  className="reply-delete-btn"
                  onClick={() => setConfirmDeleteId(reply.id)}
                  title="Delete reply"
                >
                  &times;
                </button>
              )
            )}
          </div>
          <span className="reply-text">{reply.text}</span>
          {reply.audioClips && reply.audioClips.map((clip, i) => (
            <AudioPlayer key={i} audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
          ))}
        </div>
      ))}

      {showInput ? (
        <div className="reply-input">
          <textarea
            placeholder="Write a reply..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
          />

          {audioClips.length > 0 && (
            <div style={{ marginTop: '0.25rem' }}>
              {audioClips.map((clip, i) => (
                <AudioPlayer key={i} audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
              ))}
            </div>
          )}

          <VoiceRecorder
            reader={reader}
            chapterId={chapterId}
            onComplete={handleVoiceComplete}
            showToast={() => {}}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              className="btn btn-primary btn-small"
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
            >
              {submitting ? 'Sending...' : 'Reply'}
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => { setShowInput(false); setText(''); setAudioClips([]); }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="reply-toggle-btn"
          onClick={() => setShowInput(true)}
        >
          Reply
        </button>
      )}
    </div>
  );
}
