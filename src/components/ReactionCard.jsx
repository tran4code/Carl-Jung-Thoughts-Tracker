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
  const [passageExpanded, setPassageExpanded] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkPassage, setLinkPassage] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkMatches, setLinkMatches] = useState([]);
  const [showLinkManual, setShowLinkManual] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const menuRef = useRef(null);
  const debounceRef = useRef(null);
  const linkDebounceRef = useRef(null);
  const readerClass = reaction.reader.toLowerCase();
  const initial = reaction.reader.charAt(0).toUpperCase();
  const isOwn = reaction.reader === reader;

  // Keith can link passages to Danielle's reactions that don't have one
  const canLinkPassage = reader === 'Keith' && reaction.reader === 'Danielle' && !reaction.passageStart && onUpdate;

  const corpusIndex = useMemo(
    () => ((editing || linking) && chapterData ? buildCorpusIndex(chapterData) : null),
    [editing, linking, chapterData]
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

  // Debounced passage search for link mode
  useEffect(() => {
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    if (!linkSearch.trim() || linkSearch.trim().length < 8 || !corpusIndex) {
      setLinkMatches([]);
      return;
    }
    linkDebounceRef.current = setTimeout(() => {
      setLinkMatches(findTopMatches(linkSearch, corpusIndex, 3));
    }, 400);
    return () => { if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current); };
  }, [linkSearch, corpusIndex]);

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

  const startLinking = () => {
    setLinkPassage(null);
    setLinkSearch('');
    setLinkMatches([]);
    setShowLinkManual(false);
    setLinking(true);
  };

  const cancelLinking = () => {
    setLinking(false);
    setLinkPassage(null);
    setLinkSearch('');
    setLinkMatches([]);
    setShowLinkManual(false);
  };

  const handleLinkSave = async () => {
    if (!linkPassage) return;
    setLinkSaving(true);
    await onUpdate(reaction.id, {
      passageStart: linkPassage.start,
      passageEnd: linkPassage.end,
    });
    setLinkSaving(false);
    setLinking(false);
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

  const hasMenu = isOwn && (onUpdate || onDeleteReaction);
  const firstTag = reaction.tags?.[0];
  const tagInfo = firstTag ? tagMap[firstTag] : null;

  const showQuoteSuggestions = !editPassage && !showManualSearch && quoteSearch.trim().length > 0;

  return (
    <div className={`reaction-card ${readerClass}`}>
      <div className={`rc-bubble-align ${readerClass}`}>
        <div className={`rc-bubble ${readerClass}`}>
          {/* Header — avatar + tag pill + date + menu */}
          <div className="rc-header">
            <div className="rc-identity">
              <div className={`card-avatar ${readerClass}`}>{initial}</div>
              {!editing && tagInfo && (
                <span className={`rc-tag-pill ${readerClass}`}>
                  <span className="tag-emoji">{tagInfo.emoji}</span> {tagInfo.label}
                </span>
              )}
            </div>
            <div className="rc-header-right">
              {reaction.timestamp && (
                <span className="rc-date">{formatDate(reaction.timestamp)}</span>
              )}
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
          </div>

          {/* ── LINK PASSAGE MODE (Keith linking a quote to Danielle's reaction) ── */}
          {linking ? (
            <div className="rc-edit-mode">
              <div className="rc-link-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link a passage to Danielle's reaction
              </div>

              {linkPassage ? (
                <div className="ri-selected-passage">
                  <PassageHighlight
                    chapterData={chapterData}
                    passageStart={linkPassage.start}
                    passageEnd={linkPassage.end}
                    onUpdate={(_, updates) => {
                      if (updates.passageStart) setLinkPassage((p) => ({ ...p, start: updates.passageStart }));
                      if (updates.passageEnd) setLinkPassage((p) => ({ ...p, end: updates.passageEnd }));
                    }}
                    reactionId="link-preview"
                  />
                  <button className="ri-clear-passage" onClick={() => { setLinkPassage(null); setLinkSearch(''); }}>
                    Change passage
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder="Type words from the book to find the passage..."
                    className="rf-textarea rf-quote-textarea"
                  />
                  {!linkPassage && !showLinkManual && linkSearch.trim().length > 0 && (
                    <PassageSuggestions
                      matches={linkMatches}
                      onSelect={(match) => {
                        if (match) {
                          setLinkPassage({ start: match.id, end: match.id });
                          setShowLinkManual(false);
                        }
                      }}
                      onManualSearch={() => setShowLinkManual(true)}
                      idle={linkMatches.length === 0}
                    />
                  )}
                  {showLinkManual && chapterData && (
                    <PassageMatcher
                      chapterData={chapterData}
                      reactionText={linkSearch}
                      onSelect={(p) => {
                        setLinkPassage(p);
                        setShowLinkManual(false);
                      }}
                      selectedPassage={linkPassage}
                      onPassageExpand={setLinkPassage}
                    />
                  )}
                  {!showLinkManual && (
                    <button className="rf-manual-search-link" onClick={() => setShowLinkManual(true)}>
                      Browse passages manually
                    </button>
                  )}
                </>
              )}

              <div className="rc-edit-actions">
                <button
                  className={`rf-submit-btn${linkPassage ? ' enabled' : ''}`}
                  onClick={handleLinkSave}
                  disabled={linkSaving || !linkPassage}
                >
                  {linkSaving ? 'Saving...' : 'Link passage'}
                </button>
                <button className="rc-edit-cancel" onClick={cancelLinking}>
                  Cancel
                </button>
              </div>
            </div>
          ) : editing ? (
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
              {/* Reflection text — prominent, shown first */}
              {reaction.text ? (
                <div className="rc-reflection">
                  <ConceptHighlighter text={reaction.text} onShowConcept={onShowConcept} />
                </div>
              ) : (
                <div className="rc-no-reflection">No reflection — just tagged the passage</div>
              )}

              {/* Link passage option for Keith on Danielle's reactions without a passage */}
              {canLinkPassage && !linking && (
                <button className="rc-link-btn" onClick={startLinking}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Link a passage
                </button>
              )}

              {/* Passage quote — compact, collapsible */}
              {reaction.passageStart && chapterData && (
                <button
                  className={`rc-passage-box ${readerClass}`}
                  onClick={() => setPassageExpanded(!passageExpanded)}
                >
                  <div className={`rc-passage-text${passageExpanded ? ' expanded' : ''}`}>
                    <PassageHighlight
                      chapterData={chapterData}
                      passageStart={reaction.passageStart}
                      passageEnd={reaction.passageEnd}
                      reactionId={reaction.id}
                      readOnly
                      compact
                    />
                  </div>
                  <div className="rc-passage-footer">
                    <PassageHighlight
                      chapterData={chapterData}
                      passageStart={reaction.passageStart}
                      passageEnd={reaction.passageEnd}
                      reactionId={reaction.id}
                      readOnly
                      pageOnly
                    />
                    <span className="rc-passage-toggle">
                      {passageExpanded ? '\u25B2 less' : '\u25BC more'}
                    </span>
                  </div>
                </button>
              )}

              {/* Audio clips */}
              {reaction.audioClips && reaction.audioClips.length > 0 ? (
                <div className="rc-audio">
                  {reaction.audioClips.map((clip, i) => (
                    <AudioPlayer key={i} audioBase64={clip.audioBase64} audioMimeType={clip.audioMimeType} />
                  ))}
                </div>
              ) : reaction.audioBase64 ? (
                <div className="rc-audio">
                  <AudioPlayer audioBase64={reaction.audioBase64} audioMimeType={reaction.audioMimeType} />
                </div>
              ) : null}

              {reaction.rawTranscription && reaction.rawTranscription !== reaction.text && (
                <details className="rc-transcription">
                  <summary>Original transcription</summary>
                  <p>{reaction.rawTranscription}</p>
                </details>
              )}

              {/* Replies inside the bubble */}
              {reaction.replies && reaction.replies.length > 0 && (
                <ReplySection
                  replies={reaction.replies}
                  reactionId={reaction.id}
                  reader={reader}
                  onAddReply={onAddReply}
                  onDeleteReply={onDeleteReply}
                  chapterId={reaction.chapterId}
                  insideBubble
                />
              )}
            </>
          )}
        </div>

        {/* Reply CTA — outside the bubble */}
        {!editing && onAddReply && (
          <div className={`rc-reply-cta ${readerClass}`}>
            {(!reaction.replies || reaction.replies.length === 0) ? (
              <ReplySection
                replies={[]}
                reactionId={reaction.id}
                reader={reader}
                onAddReply={onAddReply}
                onDeleteReply={onDeleteReply}
                chapterId={reaction.chapterId}
              />
            ) : (
              <ReplySection
                replies={[]}
                reactionId={reaction.id}
                reader={reader}
                onAddReply={onAddReply}
                onDeleteReply={onDeleteReply}
                chapterId={reaction.chapterId}
                showCountLabel={`${reaction.replies.length} ${reaction.replies.length === 1 ? 'reply' : 'replies'}`}
              />
            )}
          </div>
        )}
      </div>

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
