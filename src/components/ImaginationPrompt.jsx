import { useState } from 'react';
import { useImaginationResponses } from '../hooks/useFirestore';
import promptsData from '../data/prompts.json';
import ConceptHighlighter from './ConceptHighlighter';

export default function ImaginationPrompt({ chapterId, reader, onShowConcept }) {
  const prompts = promptsData[String(chapterId)] || [];
  const { responses, addResponse } = useImaginationResponses(chapterId);

  return (
    <div>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.index}
          prompt={prompt}
          chapterId={chapterId}
          reader={reader}
          responses={responses.filter((r) => r.promptIndex === prompt.index)}
          addResponse={addResponse}
          onShowConcept={onShowConcept}
        />
      ))}
    </div>
  );
}

function PromptCard({ prompt, chapterId, reader, responses, addResponse, onShowConcept }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const myResponse = responses.find((r) => r.reader === reader);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await addResponse({
        reader,
        promptIndex: prompt.index,
        text: text.trim(),
      });
      setText('');
    } catch {
      // silently fail
    }
    setSubmitting(false);
  };

  return (
    <div className="imagination-prompt">
      <div className="prompt-type">{prompt.type}</div>
      <div className="prompt-title">{prompt.title}</div>
      <div className="prompt-text">
        <ConceptHighlighter text={prompt.prompt} onShowConcept={onShowConcept} />
      </div>

      {responses.length > 0 && (
        <div className="prompt-responses">
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem',
            }}
          >
            {expanded ? 'Hide' : 'Show'} {responses.length} response{responses.length !== 1 ? 's' : ''}
          </button>
          {expanded && responses.map((r) => (
            <div key={r.id} className="reaction-card" style={{
              borderLeftColor: r.reader === 'Keith' ? 'var(--keith)' : 'var(--danielle)',
              borderLeftWidth: 3,
            }}>
              <div className={`reaction-reader ${r.reader.toLowerCase()}`}>{r.reader}</div>
              <div className="reaction-text">
                <ConceptHighlighter text={r.text} onShowConcept={onShowConcept} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!myResponse && (
        <div style={{ marginTop: '1rem' }}>
          <textarea
            placeholder="Your response..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <button
            className="btn btn-primary btn-small"
            style={{ marginTop: '0.5rem' }}
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
          >
            {submitting ? 'Saving...' : 'Submit Response'}
          </button>
        </div>
      )}
    </div>
  );
}
