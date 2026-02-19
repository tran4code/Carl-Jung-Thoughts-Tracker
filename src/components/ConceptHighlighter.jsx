import { useMemo } from 'react';
import conceptsData from '../data/concepts.json';

const conceptKeys = Object.keys(conceptsData);

// Build a regex that matches any concept term (case-insensitive, whole words)
const conceptPattern = conceptKeys
  .sort((a, b) => b.length - a.length) // Match longer terms first
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const conceptRegex = conceptPattern ? new RegExp(`\\b(${conceptPattern})\\b`, 'gi') : null;

export default function ConceptHighlighter({ text, onShowConcept }) {
  const parts = useMemo(() => {
    if (!text || !conceptRegex) return [text];

    const result = [];
    let lastIndex = 0;
    let match;

    // Reset regex lastIndex
    const regex = new RegExp(conceptRegex.source, 'gi');

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      }
      result.push({ type: 'concept', value: match[0], key: match[0].toLowerCase() });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.slice(lastIndex) });
    }

    return result;
  }, [text]);

  if (!text) return null;

  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === 'string') return part;
        if (part.type === 'text') return <span key={i}>{part.value}</span>;
        return (
          <span
            key={i}
            className="concept-link"
            onClick={(e) => {
              e.stopPropagation();
              onShowConcept?.(part.key);
            }}
          >
            {part.value}
          </span>
        );
      })}
    </>
  );
}
