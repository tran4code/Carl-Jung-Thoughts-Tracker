import conceptsData from '../data/concepts.json';

export default function ConceptCard({ conceptKey, onClose }) {
  const concept = conceptsData[conceptKey];
  if (!concept) return null;

  return (
    <div className="concept-overlay" onClick={onClose}>
      <div className="concept-card" onClick={(e) => e.stopPropagation()}>
        <div className="concept-title">{concept.title}</div>
        <div className="concept-definition">{concept.definition}</div>
        <div className="concept-example">{concept.example}</div>
        <div className="concept-chapter-ref">
          Introduced in Chapter {concept.chapter}
        </div>
        <button
          className="btn btn-secondary btn-small"
          style={{ marginTop: '1rem' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
