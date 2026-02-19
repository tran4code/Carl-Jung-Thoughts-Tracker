import { useState } from 'react';
import { useDreams } from '../hooks/useFirestore';
import DreamEntry from './DreamEntry';
import ConceptHighlighter from './ConceptHighlighter';
import chaptersMeta from '../data/chapters-meta.json';
import { analyzeDream } from '../services/claude';

export default function DreamJournal({ reader, onShowConcept, showToast }) {
  const { dreams, loading, addDream } = useDreams();
  const [text, setText] = useState('');
  const [chapterId, setChapterId] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);

    let detectedSymbols = [];
    let connections = [];

    // Try Claude dream analysis
    try {
      const chapterData = await fetch(
        `${import.meta.env.BASE_URL}book/chapter-${chapterId}.json`
      ).then((r) => r.json());

      const analysis = await analyzeDream(text.trim(), chapterData);
      detectedSymbols = analysis.detectedSymbols || [];
      connections = analysis.connections || [];
    } catch {
      showToast('Dream analysis unavailable — saving dream without connections');
    }

    try {
      await addDream({
        reader,
        text: text.trim(),
        chapterId,
        detectedSymbols,
        connections,
      });
      setText('');
    } catch {
      showToast('Failed to save dream', true);
    }
    setSubmitting(false);
  };

  return (
    <div className="dream-journal">
      <h2 style={{
        fontFamily: 'var(--font-display)', color: 'var(--gold)',
        textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem',
      }}>
        Dream Journal
      </h2>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <textarea
          placeholder="Describe your dream..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            Currently reading:
          </label>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(Number(e.target.value))}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.4rem 0.6rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            {chaptersMeta.map((ch) => (
              <option key={ch.id} value={ch.id}>Ch. {ch.id}: {ch.title}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: '0.75rem' }}
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
        >
          {submitting ? 'Analyzing...' : 'Log Dream'}
        </button>
      </div>

      {loading && <div className="spinner" />}

      {dreams.map((dream) => (
        <DreamEntry key={dream.id} dream={dream} onShowConcept={onShowConcept} />
      ))}

      {!loading && dreams.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '2rem' }}>
          No dreams logged yet. Jung believed dreams are the most common and accessible
          expression of the unconscious. What did you dream last night?
        </p>
      )}
    </div>
  );
}
