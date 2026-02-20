import { useState } from 'react';
import PassageHighlight from './PassageHighlight';
import ConceptHighlighter from './ConceptHighlighter';
import AudioPlayer from './AudioPlayer';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function ReactionCard({ reaction, chapterData, onShowConcept, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reaction.text);
  const [saving, setSaving] = useState(false);
  const readerClass = reaction.reader.toLowerCase();

  const handleSave = async () => {
    if (!editText.trim() || editText.trim() === reaction.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onUpdate(reaction.id, { text: editText.trim() });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`reaction-card ${readerClass}`}>
      <div className={`reaction-reader ${readerClass}`}>{reaction.reader}</div>

      {reaction.passageStart && chapterData && (
        <PassageHighlight
          chapterData={chapterData}
          passageStart={reaction.passageStart}
          passageEnd={reaction.passageEnd}
          reactionId={reaction.id}
          onUpdate={onUpdate}
        />
      )}

      {/* Multiple audio clips (new format) */}
      {reaction.audioClips && reaction.audioClips.length > 0 ? (
        reaction.audioClips.map((clip, i) => (
          <AudioPlayer key={i} audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
        ))
      ) : reaction.audioBase64 ? (
        <AudioPlayer audioBase64={reaction.audioBase64} audioMimeType={reaction.audioMimeType} />
      ) : null}

      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary btn-small" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => { setEditing(false); setEditText(reaction.text); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="reaction-text">
          <ConceptHighlighter text={reaction.text} onShowConcept={onShowConcept} />
          {onUpdate && (
            <button
              className="btn btn-secondary btn-small"
              style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
        </div>
      )}

      {reaction.rawTranscription && reaction.rawTranscription !== reaction.text && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ fontSize: '0.75rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            Original transcription
          </summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem', lineHeight: 1.6 }}>
            {reaction.rawTranscription}
          </p>
        </details>
      )}

      {reaction.tags && reaction.tags.length > 0 && (
        <div className="reaction-tags">
          {reaction.tags.map((tag) => (
            <span
              key={tag}
              className="tag-chip"
              style={{
                background: `${symbolColorMap[tag] || '#666'}22`,
                color: symbolColorMap[tag] || '#999',
                border: `1px solid ${symbolColorMap[tag] || '#666'}44`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
