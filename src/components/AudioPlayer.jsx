import { useMemo } from 'react';

export default function AudioPlayer({ audioBase64, audioMimeType }) {
  // Use a data URI instead of blob URL — no revocation needed,
  // survives re-renders and component remounts without ERR_FILE_NOT_FOUND
  const dataUri = useMemo(() => {
    if (!audioBase64) return null;
    return `data:${audioMimeType || 'audio/webm'};base64,${audioBase64}`;
  }, [audioBase64, audioMimeType]);

  if (!dataUri) return null;

  return (
    <div className="audio-player">
      <audio controls src={dataUri} preload="none" />
    </div>
  );
}
