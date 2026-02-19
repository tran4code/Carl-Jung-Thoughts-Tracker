import { useState, useCallback } from 'react';
import Header from './components/Header';
import ChapterList from './components/ChapterList';
import ChapterDetail from './components/ChapterDetail';
import Constellation from './components/Constellation';
import DreamJournal from './components/DreamJournal';
import ConceptCard from './components/ConceptCard';
import { usePresence } from './hooks/usePresence';

function App() {
  const [reader, setReader] = useState(() => localStorage.getItem('jung-reader'));
  const [tab, setTab] = useState('read');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeConcept, setActiveConcept] = useState(null);
  const [toast, setToast] = useState(null);

  const { otherReader, otherName } = usePresence(reader, selectedChapter);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const selectReader = (name) => {
    localStorage.setItem('jung-reader', name);
    setReader(name);
  };

  if (!reader) {
    return (
      <div className="reader-selection">
        <h1>Man and His Symbols</h1>
        <p>A shared reading companion for exploring Jung's final masterwork together.</p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Who are you?</p>
        <div className="reader-buttons">
          <button className="reader-select-btn keith" onClick={() => selectReader('Keith')}>
            Keith
          </button>
          <button className="reader-select-btn danielle" onClick={() => selectReader('Danielle')}>
            Danielle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        reader={reader}
        otherReader={otherReader}
        otherName={otherName}
        onChangeReader={() => {
          localStorage.removeItem('jung-reader');
          setReader(null);
        }}
      />

      <div className="app-content">
        {tab === 'read' && !selectedChapter && (
          <ChapterList onSelect={setSelectedChapter} />
        )}
        {tab === 'read' && selectedChapter && (
          <ChapterDetail
            chapterId={selectedChapter}
            reader={reader}
            onBack={() => setSelectedChapter(null)}
            onShowConcept={setActiveConcept}
            showToast={showToast}
          />
        )}
        {tab === 'constellation' && (
          <Constellation onShowConcept={setActiveConcept} />
        )}
        {tab === 'dreams' && (
          <DreamJournal
            reader={reader}
            onShowConcept={setActiveConcept}
            showToast={showToast}
          />
        )}
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${tab === 'read' ? 'active' : ''}`}
          onClick={() => { setTab('read'); setSelectedChapter(null); }}
        >
          Read
        </button>
        <button
          className={`nav-tab ${tab === 'constellation' ? 'active' : ''}`}
          onClick={() => setTab('constellation')}
        >
          Constellation
        </button>
        <button
          className={`nav-tab ${tab === 'dreams' ? 'active' : ''}`}
          onClick={() => setTab('dreams')}
        >
          Dreams
        </button>
      </nav>

      {activeConcept && (
        <ConceptCard
          conceptKey={activeConcept}
          onClose={() => setActiveConcept(null)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.isError ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
