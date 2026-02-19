import { useAudio } from '../hooks/useAudio';

export default function VoiceRecorder({ reader, chapterId, onComplete, showToast }) {
  const {
    recording, audioBlob, transcribing, transcription, error,
    startRecording, stopRecording, uploadAndTranscribe, reset,
  } = useAudio();

  const handleStop = async () => {
    stopRecording();
  };

  const handleProcess = async () => {
    const result = await uploadAndTranscribe(reader, chapterId);
    if (result) {
      onComplete(result);
    } else if (error) {
      showToast(error, true);
    }
  };

  return (
    <div className="voice-recorder">
      <button
        className={`record-btn ${recording ? 'recording' : ''}`}
        onClick={recording ? handleStop : startRecording}
      >
        <div className="record-dot" />
      </button>
      <span className="record-label">
        {recording ? 'Recording... tap to stop' :
         audioBlob ? 'Recording ready' :
         'Tap to record'}
      </span>

      {transcribing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="spinner" style={{ width: 16, height: 16, margin: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Transcribing...</span>
        </div>
      )}

      {transcription && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          width: '100%',
          textAlign: 'left',
        }}>
          {transcription}
        </div>
      )}

      {error && (
        <span style={{ fontSize: '0.8rem', color: '#e07070' }}>{error}</span>
      )}

      {audioBlob && !transcribing && !transcription && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-small" onClick={handleProcess}>
            Transcribe & Submit
          </button>
          <button className="btn btn-secondary btn-small" onClick={reset}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
