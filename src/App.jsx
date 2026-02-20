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
  const [tab, setTab] = useState(() => sessionStorage.getItem('jung-tab') || 'read');
  const [selectedChapter, setSelectedChapter] = useState(() => {
    const saved = sessionStorage.getItem('jung-chapter');
    return saved ? Number(saved) : null;
  });
  const [activeConcept, setActiveConcept] = useState(null);
  const [toast, setToast] = useState(null);

  const changeTab = (t) => {
    setTab(t);
    sessionStorage.setItem('jung-tab', t);
  };

  const changeChapter = (id) => {
    setSelectedChapter(id);
    if (id != null) sessionStorage.setItem('jung-chapter', id);
    else sessionStorage.removeItem('jung-chapter');
  };

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
        <div className="title-page">
          <div className="title-dots">
            <span /><span /><span />
          </div>
          <h1 className="title-main">
            Man <span className="title-ampersand">&amp;</span> His Symbols
          </h1>
          <div className="title-author">Carl Gustav Jung</div>
          <div className="title-rule" />
          <div className="title-contributors">
            <span>Conceived and edited by Carl G. Jung</span>
            <span>with M.-L. von Franz, Joseph L. Henderson,</span>
            <span>Jolande Jacobi, Aniela Jaff&eacute;</span>
          </div>
        </div>

        <div className="reader-prompt">Who are you?</div>
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
          <ChapterList onSelect={changeChapter} />
        )}
        {tab === 'read' && selectedChapter && (
          <ChapterDetail
            chapterId={selectedChapter}
            reader={reader}
            onBack={() => changeChapter(null)}
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
          onClick={() => { changeTab('read'); changeChapter(null); }}
        >
          Read
        </button>
        <button
          className={`nav-tab ${tab === 'constellation' ? 'active' : ''}`}
          onClick={() => changeTab('constellation')}
        >
          Constellation
        </button>
        <button
          className={`nav-tab ${tab === 'dreams' ? 'active' : ''}`}
          onClick={() => changeTab('dreams')}
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
