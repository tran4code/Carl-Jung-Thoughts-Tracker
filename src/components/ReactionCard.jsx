import { useState, useRef, useEffect } from 'react';
import PassageHighlight from './PassageHighlight';
import ConceptHighlighter from './ConceptHighlighter';
import AudioPlayer from './AudioPlayer';
import ReplySection from './ReplySection';
import { REACTION_TAGS } from './TagPicker';

const tagMap = Object.fromEntries(REACTION_TAGS.map((t) => [t.key, t]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ReactionCard({ reaction, chapterData, onShowConcept, onUpdate, reader, onAddReply, onDeleteReaction, onDeleteReply }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reaction.text);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const readerClass = reaction.reader.toLowerCase();
  const initial = reaction.reader.charAt(0).toUpperCase();

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
  const firstTag = reaction.tags?.[0];
  const tagInfo = firstTag ? tagMap[firstTag] : null;

  return (
    <div className={`reaction-card ${readerClass}`}>
      {/* Card top — avatar, name, tag, date, menu */}
      <div className="reaction-card-header">
        <div className="card-identity">
          <div className={`card-avatar ${readerClass}`}>{initial}</div>
          <span className={`card-user-name ${readerClass}`}>{reaction.reader}</span>
          <div className="card-meta">
            {tagInfo && (
              <span className="card-tag">
                <span className="tag-emoji">{tagInfo.emoji}</span> {tagInfo.label}
              </span>
            )}
            {reaction.timestamp && (
              <span className="card-date">{formatDate(reaction.timestamp)}</span>
            )}
          </div>
        </div>
        {hasMenu && (
          <div className="reaction-menu" ref={menuRef}>
            <button
              className="reaction-menu-btn"
              onClick={() => { setMenuOpen(!menuOpen); setConfirmDelete(false); }}
            >
              &middot;&middot;&middot;
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

      {/* Passage quote */}
      {reaction.passageStart && chapterData && (
        <PassageHighlight
          chapterData={chapterData}
          passageStart={reaction.passageStart}
          passageEnd={reaction.passageEnd}
          reactionId={reaction.id}
          onUpdate={onUpdate}
        />
      )}

      {/* Reflection text */}
      {editing ? (
        <div style={{ padding: '0 1.4rem 1.2rem' }}>
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
      ) : reaction.text ? (
        <div className="reaction-text">
          <ConceptHighlighter text={reaction.text} onShowConcept={onShowConcept} />
        </div>
      ) : null}

      {/* Audio clips */}
      {reaction.audioClips && reaction.audioClips.length > 0 ? (
        <div className="card-footer">
          <div style={{ flex: 1 }}>
            {reaction.audioClips.map((clip, i) => (
              <AudioPlayer key={i} audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
            ))}
          </div>
        </div>
      ) : reaction.audioBase64 ? (
        <div className="card-footer">
          <AudioPlayer audioBase64={reaction.audioBase64} audioMimeType={reaction.audioMimeType} />
        </div>
      ) : null}

      {reaction.rawTranscription && reaction.rawTranscription !== reaction.text && (
        <details style={{ padding: '0 1.4rem 0.5rem' }}>
          <summary style={{ fontSize: '0.75rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
            Original transcription
          </summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem', lineHeight: 1.6 }}>
            {reaction.rawTranscription}
          </p>
        </details>
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
