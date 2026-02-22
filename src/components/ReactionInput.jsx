import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VoiceRecorder from './VoiceRecorder';
import TagPicker from './TagPicker';
import PassageMatcher from './PassageMatcher';
import PassageSuggestions from './PassageSuggestions';
import PassageHighlight from './PassageHighlight';
import AudioPlayer from './AudioPlayer';
import { buildCorpusIndex, findTopMatches } from '../utils/textSimilarity';

export default function ReactionInput({ reader, chapterId, chapterData, addReaction, showToast }) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [rawTranscription, setRawTranscription] = useState(null);
  const [audioClips, setAudioClips] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [savedText, setSavedText] = useState('');
  const debounceRef = useRef(null);

  const corpusIndex = useMemo(() => buildCorpusIndex(chapterData), [chapterData]);

  // Auto-suggest passages as user types (debounced 400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim() || text.trim().length < 15 || !corpusIndex) {
      setSuggestedMatches([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const matches = findTopMatches(text, corpusIndex, 3);
      setSuggestedMatches(matches);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, corpusIndex]);

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

  const handleSelectSuggestion = useCallback((match) => {
    if (!match) {
      setSelectedPassage(null);
      return;
    }
    setSelectedPassage({ start: match.id, end: match.id });
    setShowManualSearch(false);
  }, []);

  const handleManualSearch = () => {
    setShowManualSearch(true);
  };

  const canSubmit = text.trim() || tags.length > 0 || selectedPassage;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSavedText('');

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
      setSavedText('Saved');
      setText('');
      setTags([]);
      setRawTranscription(null);
      setAudioClips([]);
      setSelectedPassage(null);
      setSuggestedMatches([]);
      setShowManualSearch(false);
      setTimeout(() => setSavedText(''), 2000);
    } catch {
      showToast('Failed to save reaction', true);
    } finally {
      setSubmitting(false);
    }
  };

  // If a passage is selected (from suggestion or manual), show it as a highlight preview
  const showSuggestions = suggestedMatches.length > 0 && !selectedPassage && !showManualSearch;
  const showSelectedPreview = selectedPassage && !showManualSearch;

  return (
    <div className="reaction-input">
      {/* 1. Tags — set the intention */}
      <TagPicker selected={tags} onChange={setTags} />

      {/* 2. Reflection textarea */}
      <textarea
        placeholder="What's on your mind? (optional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ textAlign: 'left' }}
      />

      {rawTranscription && (
        <div className="ri-transcription-label">
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

      {/* 3. Auto-suggested passages */}
      {showSuggestions && (
        <PassageSuggestions
          matches={suggestedMatches}
          onSelect={handleSelectSuggestion}
          onManualSearch={handleManualSearch}
        />
      )}

      {/* Selected passage preview with expand controls */}
      {showSelectedPreview && chapterData && (
        <div className="ri-selected-passage">
          <PassageHighlight
            chapterData={chapterData}
            passageStart={selectedPassage.start}
            passageEnd={selectedPassage.end}
            onUpdate={(_, updates) => {
              if (updates.passageStart) setSelectedPassage((p) => ({ ...p, start: updates.passageStart }));
              if (updates.passageEnd) setSelectedPassage((p) => ({ ...p, end: updates.passageEnd }));
            }}
            reactionId="preview"
          />
          <button
            className="ri-clear-passage"
            onClick={() => { setSelectedPassage(null); setShowManualSearch(false); }}
          >
            Clear passage
          </button>
        </div>
      )}

      {/* Manual search fallback */}
      {showManualSearch && !selectedPassage && chapterData && (
        <PassageMatcher
          chapterData={chapterData}
          reactionText={text}
          onSelect={(p) => { setSelectedPassage(p); setShowManualSearch(false); }}
          selectedPassage={selectedPassage}
          onPassageExpand={setSelectedPassage}
        />
      )}

      {/* Submit */}
      <button
        className={`btn btn-primary${savedText ? ' saved' : ''}`}
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
      >
        {savedText || (submitting ? 'Saving...' : 'Save')}
      </button>
    </div>
  );
}
