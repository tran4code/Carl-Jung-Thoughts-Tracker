import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

export default function CameraScanner({ onResult }) {
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      onResult(text.trim());
    } catch {
      onResult('');
    } finally {
      setScanning(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: 'none' }}
      />
      <button
        className={`passage-search-btn${scanning ? ' scanning' : ''}`}
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        title="Photograph a page to find the passage"
      >
        <span className="passage-search-icon">{scanning ? '⏳' : '📷'}</span>
        {scanning ? 'Reading...' : 'Scan'}
      </button>
    </>
  );
}
