import { useAudio } from '../hooks/useAudio';

export default function VoiceRecorder({ reader, chapterId, onComplete, showToast }) {
  const {
    recording, audioBlob, transcribing, transcription, error, duration, maxDuration,
    startRecording, stopRecording, uploadAndTranscribe, reset,
  } = useAudio();

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleStop = () => {
    stopRecording();
  };

  const handleProcess = async () => {
    const result = await uploadAndTranscribe(reader, chapterId);
    if (result) {
      onComplete(result);
      reset();
    } else if (error) {
      showToast(error, true);
    }
  };

  return (
    <div className="voice-recorder-inline">
      <button
        className={`record-btn-inline ${recording ? 'recording' : ''}`}
        onClick={recording ? handleStop : startRecording}
        title={recording ? 'Stop recording' : 'Start recording'}
      >
        <div className="record-dot-inline" />
      </button>

      {recording && (
        <span className="record-status">
          {formatTime(duration)} / {formatTime(maxDuration)}
        </span>
      )}

      {!recording && !audioBlob && !transcribing && (
        <span className="record-status">Record a voice memo</span>
      )}

      {audioBlob && !transcribing && !transcription && (
        <div className="record-actions">
          <span className="record-status">{formatTime(duration)} recorded</span>
          <button className="btn btn-primary btn-small" onClick={handleProcess}>
            Transcribe
          </button>
          <button className="btn btn-secondary btn-small" onClick={reset}>
            Discard
          </button>
        </div>
      )}

      {transcribing && (
        <div className="record-actions">
          <div className="spinner" style={{ width: 14, height: 14, margin: 0 }} />
          <span className="record-status">Transcribing...</span>
        </div>
      )}

      {error && (
        <span style={{ fontSize: '0.8rem', color: '#e07070' }}>{error}</span>
      )}
    </div>
  );
}
