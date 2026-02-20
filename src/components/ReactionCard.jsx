import { useState, useRef, useEffect } from 'react';
import PassageHighlight from './PassageHighlight';
import ConceptHighlighter from './ConceptHighlighter';
import AudioPlayer from './AudioPlayer';
import ReplySection from './ReplySection';
import symbolsData from '../data/symbols.json';

const symbolColorMap = Object.fromEntries(symbolsData.map((s) => [s.name, s.color]));

export default function ReactionCard({ reaction, chapterData, onShowConcept, onUpdate, reader, onAddReply, onDeleteReaction, onDeleteReply }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reaction.text);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const readerClass = reaction.reader.toLowerCase();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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

  const handleDelete = async () => {
    await onDeleteReaction(reaction.id);
  };

  const hasMenu = onUpdate || onDeleteReaction;

  return (
    <div className={`reaction-card ${readerClass}`}>
      <div className="reaction-card-header">
        <div className={`reaction-reader ${readerClass}`}>{reaction.reader}</div>
        {hasMenu && (
          <div className="reaction-menu" ref={menuRef}>
            <button
              className="reaction-menu-btn"
              onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false); }}
            >
              &hellip;
            </button>
            {menuOpen && (
              <div className="reaction-menu-dropdown">
                {onUpdate && (
                  <button
                    className="reaction-menu-item"
                    onClick={() => { setEditing(true); setMenuOpen(false); }}
                  >
                    Edit
                  </button>
                )}
                {onDeleteReaction && !confirmDelete && (
                  <button
                    className="reaction-menu-item delete"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </button>
                )}
                {confirmDelete && (
                  <>
                    <button
                      className="reaction-menu-item confirm-delete"
                      onClick={handleDelete}
                    >
                      Confirm Delete
                    </button>
                    <button
                      className="reaction-menu-item"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      {onAddReply && (
        <ReplySection
          replies={reaction.replies}
          reactionId={reaction.id}
          reader={reader}
          onAddReply={onAddReply}
          onDeleteReply={onDeleteReply}
          chapterId={reaction.chapterId}
        />
      )}
    </div>
  );
}
