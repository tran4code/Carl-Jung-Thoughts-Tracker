import { useState } from 'react';
import { useDiscussionQuestions } from '../hooks/useFirestore';
import { generateDiscussionQuestions } from '../services/claude';

export default function DiscussionQuestions({
  chapterId, chapterData, keithReactions, danielleReactions, showToast,
}) {
  const { questions, saveQuestions } = useDiscussionQuestions(chapterId);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!chapterData) {
      showToast('Chapter data not loaded', true);
      return;
    }
    setGenerating(true);
    try {
      const result = await generateDiscussionQuestions(
        keithReactions, danielleReactions, chapterData
      );
      await saveQuestions({
        questions: result.questions,
        basedOn: [...keithReactions, ...danielleReactions].map((r) => r.id),
      });
    } catch {
      showToast('Failed to generate discussion questions', true);
    }
    setGenerating(false);
  };

  if (questions) {
    return (
      <div className="discussion-questions">
        {questions.questions.map((q, i) => (
          <div key={i} className="question-item">
            <span className="question-number">{i + 1}.</span>
            {q}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
        Generate discussion questions based on both readers' reactions.
      </p>
      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} />
            Generating...
          </>
        ) : (
          'Generate Discussion'
        )}
      </button>
    </div>
  );
}
