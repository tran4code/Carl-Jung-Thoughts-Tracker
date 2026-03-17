import { useState, useRef, useEffect, useMemo } from 'react';
import PassageHighlight from './PassageHighlight';
import PassageSuggestions from './PassageSuggestions';
import PassageMatcher from './PassageMatcher';
import ConceptHighlighter from './ConceptHighlighter';
import AudioPlayer from './AudioPlayer';
import ReplySection from './ReplySection';
import { REACTION_TAGS } from './TagPicker';
import { buildCorpusIndex, findTopMatches } from '../utils/textSimilarity';

const tagMap = Object.fromEntries(REACTION_TAGS.map((t) => [t.key, t]));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ReactionCard({ reaction, chapterData, onShowConcept, onUpdate, reader, onAddReply, onDeleteReaction, onDeleteReply }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reaction.text || '');
  const [editPassage, setEditPassage] = useState(
    reaction.passageStart ? { start: reaction.passageStart, end: reaction.passageEnd || reaction.passageStart } : null
  );
  const [editTags, setEditTags] = useState(reaction.tags || []);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const debounceRef = useRef(null);
  const readerClass = reaction.reader.toLowerCase();
  const initial = reaction.reader.charAt(0).toUpperCase();

  const corpusIndex = useMemo(
    () => (editing && chapterData ? buildCorpusIndex(chapterData) : null),
    [editing, chapterData]
  );

  // Debounced passage search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!quoteSearch.trim() || quoteSearch.trim().length < 8 || !corpusIndex) {
      setSearchMatches([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearchMatches(findTopMatches(quoteSearch, corpusIndex, 3));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [quoteSearch, corpusIndex]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const startEditing = () => {
    setEditText(reaction.text || '');
    setEditPassage(
      reaction.passageStart ? { start: reaction.passageStart, end: reaction.passageEnd || reaction.passageStart } : null
    );
    setEditTags(reaction.tags || []);
    setQuoteSearch('');
    setSearchMatches([]);
    setShowManualSearch(false);
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditText(reaction.text || '');
    setEditPassage(
      reaction.passageStart ? { start: reaction.passageStart, end: reaction.passageEnd || reaction.passageStart } : null
    );
    setEditTags(reaction.tags || []);
    setQuoteSearch('');
    setSearchMatches([]);
    setShowManualSearch(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      text: editText.trim() || null,
      passageStart: editPassage?.start || null,
      passageEnd: editPassage?.end || null,
      tags: editTags,
    };
    await onUpdate(reaction.id, updates);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await onDeleteReaction(reaction.id);
  };

  const toggleTag = (key) => {
    setEditTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const hasMenu = onUpdate || onDeleteReaction;
  const firstTag = reaction.tags?.[0];
  const tagInfo = firstTag ? tagMap[firstTag] : null;

  const showQuoteSuggestions = !editPassage && !showManualSearch && quoteSearch.trim().length > 0;

  return (
    <div className={`reaction-card ${readerClass}`}>
      {/* Card top — avatar, name, tag, date, menu */}
      <div className="reaction-card-header">
        <div className="card-identity">
          <div className={`card-avatar ${readerClass}`}>{initial}</div>
          <span className={`card-user-name ${readerClass}`}>{reaction.reader}</span>
          <div className="card-meta">
            {!editing && tagInfo && (
              <span className="card-tag">
                <span className="tag-emoji">{tagInfo.emoji}</span> {tagInfo.label}
              </span>
            )}
            {reaction.timestamp && (
              <span className="card-date">{formatDate(reaction.timestamp)}</span>
            )}
          </div>
        </div>
        {hasMenu && !editing && (
          <div className="reaction-menu" ref={menuRef}>
            <button
              className="reaction-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              &middot;&middot;&middot;
            </button>
            {menuOpen && (
              <div className="reaction-menu-dropdown">
                {onUpdate && (
                  <button className="reaction-menu-item" onClick={startEditing}>
                    Edit
                  </button>
                )}
                {onDeleteReaction && (
                  <button
                    className="reaction-menu-item delete"
                    onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── EDIT MODE ── */}
      {editing ? (
        <div className="rc-edit-mode">
          {/* Passage editing */}
          <div className="rc-edit-section">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Passage
            </label>

            {editPassage ? (
              <div className="ri-selected-passage">
                <PassageHighlight
                  chapterData={chapterData}
                  passageStart={editPassage.start}
                  passageEnd={editPassage.end}
                  onUpdate={(_, updates) => {
                    if (updates.passageStart) setEditPassage((p) => ({ ...p, start: updates.passageStart }));
                    if (updates.passageEnd) setEditPassage((p) => ({ ...p, end: updates.passageEnd }));
                  }}
                  reactionId="edit-preview"
                />
                <button className="ri-clear-passage" onClick={() => { setEditPassage(null); setQuoteSearch(''); }}>
                  Change passage
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  placeholder="Type words from the book to find a passage..."
                  className="rf-textarea rf-quote-textarea"
                />
                {showQuoteSuggestions && (
                  <PassageSuggestions
                    matches={searchMatches}
                    onSelect={(match) => {
                      if (match) {
                        setEditPassage({ start: match.id, end: match.id });
                        setShowManualSearch(false);
                      }
                    }}
                    onManualSearch={() => setShowManualSearch(true)}
                    idle={searchMatches.length === 0}
                  />
                )}
                {showManualSearch && chapterData && (
                  <PassageMatcher
                    chapterData={chapterData}
                    reactionText={quoteSearch}
                    onSelect={(p) => {
                      setEditPassage(p);
                      setShowManualSearch(false);
                    }}
                    selectedPassage={editPassage}
                    onPassageExpand={setEditPassage}
                  />
                )}
                {!showManualSearch && (
                  <button className="rf-manual-search-link" onClick={() => setShowManualSearch(true)}>
                    Browse passages manually
                  </button>
                )}
                {reaction.passageStart && (
                  <button
                    className="rf-manual-search-link"
                    style={{ marginTop: '0.25rem' }}
                    onClick={() => setEditPassage({ start: reaction.passageStart, end: reaction.passageEnd || reaction.passageStart })}
                  >
                    Keep original passage
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tag editing */}
          <div className="rc-edit-section">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Tags
            </label>
            <div className="rc-edit-tags">
              {REACTION_TAGS.map((t) => (
                <button
                  key={t.key}
                  className={`rc-edit-tag${editTags.includes(t.key) ? ' active' : ''}`}
                  onClick={() => toggleTag(t.key)}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text editing */}
          <div className="rc-edit-section">
            <label className="rf-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              Reaction text
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Your reaction..."
              className="rf-textarea"
              rows={3}
            />
          </div>

          {/* Save / Cancel */}
          <div className="rc-edit-actions">
            <button className="rf-submit-btn enabled" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button className="rc-edit-cancel" onClick={cancelEditing}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
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
          {reaction.text ? (
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
        </>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {confirmDelete && (
        <div className="rc-delete-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="rc-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rc-delete-title">Delete this reaction?</div>
            <div className="rc-delete-desc">This can&rsquo;t be undone.</div>
            <div className="rc-delete-actions">
              <button className="rc-delete-cancel" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button className="rc-delete-confirm" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
