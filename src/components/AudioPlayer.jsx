import { useMemo, useState, useRef, useEffect, useCallback } from 'react';

const BAR_COUNT = 35;

// Generate deterministic waveform heights from audio data
function generateBars(seed) {
  const bars = [];
  let x = seed;
  for (let i = 0; i < BAR_COUNT; i++) {
    x = ((x * 9301 + 49297) % 233280);
    const h = (x / 233280) * 14 + 3;
    bars.push(h);
  }
  return bars;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ audioBase64, audioMimeType }) {
  const dataUri = useMemo(() => {
    if (!audioBase64) return null;
    return `data:${audioMimeType || 'audio/webm'};base64,${audioBase64}`;
  }, [audioBase64, audioMimeType]);

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Deterministic bar heights based on base64 length as seed
  const bars = useMemo(() => generateBars(audioBase64?.length || 0), [audioBase64]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progress * BAR_COUNT);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [dataUri]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  const waveformRef = useRef(null);

  const seekTo = useCallback((e) => {
    const audio = audioRef.current;
    const waveform = waveformRef.current;
    if (!audio || !duration || !waveform) return;
    // Use the waveform container's scrollWidth (actual bar content width)
    // but getBoundingClientRect for position relative to viewport
    const rect = waveform.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newTime = pct * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  if (!dataUri) return null;

  return (
    <div className="audio-player-custom">
      <audio ref={audioRef} src={dataUri} preload="metadata" />

      <button className={`audio-play-btn${playing ? ' playing' : ''}`} onClick={togglePlay}>
        {playing ? (
          <svg viewBox="0 0 10 12" width="8" height="8">
            <rect x="1" y="0" width="3" height="12" fill="currentColor" />
            <rect x="6" y="0" width="3" height="12" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 10 12" width="8" height="8">
            <polygon points="1,0 10,6 1,12" fill="currentColor" />
          </svg>
        )}
      </button>

      <div className="audio-waveform" ref={waveformRef} onClick={seekTo}>
        {bars.map((h, i) => (
          <div
            key={i}
            className={`audio-wave-bar${i <= activeBarIndex && (playing || currentTime > 0) ? ' active' : ''}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      <span className="audio-duration">
        {playing ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : '0:00')}
      </span>
    </div>
  );
}
