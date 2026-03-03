import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PresenceIndicator from './components/PresenceIndicator';
import ChapterList from './components/ChapterList';
import ChapterDetail from './components/ChapterDetail';
import Constellation from './components/Constellation';
import DreamJournal from './components/DreamJournal';
import ConceptCard from './components/ConceptCard';
import SymbolLayer from './components/SymbolLayer';
import { usePresence } from './hooks/usePresence';

// Renders text with each letter wrapped in a queryable span
function SourceText({ children, className, tag: Tag = 'span' }) {
  const text = typeof children === 'string' ? children : '';
  return (
    <Tag className={className}>
      {text.split('').map((ch, i) => (
        <span key={i} data-source-char={ch.toLowerCase()} className="source-char">
          {ch}
        </span>
      ))}
    </Tag>
  );
}

// Renders letters as spans for a single name button
function NameLetters({ text, btnRef }) {
  return (
    <span ref={btnRef}>
      {text.split('').map((ch, i) => (
        <span key={i} className="fly-in-letter" data-letter-idx={i}>
          {ch}
        </span>
      ))}
    </span>
  );
}

// Choreographs both names: interleaved timing, shared letters finish each other
function useNameChoreography(keithRef, danielleRef, promptRef, keithBtnRef, danielleBtnRef) {
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current) return;
    if (!keithRef.current || !danielleRef.current || !promptRef.current) return;
    animatedRef.current = true;

    const pSpans = promptRef.current.querySelectorAll('.fly-in-letter');
    const kSpans = keithRef.current.querySelectorAll('.fly-in-letter');
    const dSpans = danielleRef.current.querySelectorAll('.fly-in-letter');
    if (kSpans.length === 0 || dSpans.length === 0) return;

    // Build source letter pool from title text
    const allSources = document.querySelectorAll('.source-char');
    const pool = {};
    for (const el of allSources) {
      const ch = el.dataset.sourceChar;
      if (!pool[ch]) pool[ch] = [];
      pool[ch].push(el);
    }

    // --- Button border draw-in animation ---
    // Borders trace in from the corners, starting when letters begin arriving
    const BORDER_DELAY = 2000; // ms — synced with spotlight catching (~60% of 3.2s)
    const keithBtn = keithBtnRef?.current;
    const danielleBtn = danielleBtnRef?.current;

    if (keithBtn) {
      keithBtn.animate([
        { borderColor: 'transparent', boxShadow: 'none' },
        { borderColor: 'rgba(90, 159, 170, 0.08)', boxShadow: 'inset 0 0 12px rgba(90, 159, 170, 0)' },
        { borderColor: 'rgba(90, 159, 170, 0.35)', boxShadow: 'inset 0 0 12px rgba(90, 159, 170, 0.06)' },
        { borderColor: 'rgba(90, 159, 170, 0.25)', boxShadow: 'none' },
      ], { duration: 2000, delay: BORDER_DELAY, easing: 'ease-out', fill: 'forwards' });
    }
    if (danielleBtn) {
      danielleBtn.animate([
        { borderColor: 'transparent', boxShadow: 'none' },
        { borderColor: 'rgba(196, 120, 138, 0.08)', boxShadow: 'inset 0 0 12px rgba(196, 120, 138, 0)' },
        { borderColor: 'rgba(196, 120, 138, 0.35)', boxShadow: 'inset 0 0 12px rgba(196, 120, 138, 0.06)' },
        { borderColor: 'rgba(196, 120, 138, 0.25)', boxShadow: 'none' },
      ], { duration: 2000, delay: BORDER_DELAY + 200, easing: 'ease-out', fill: 'forwards' });
    }

    // --- Prompt: "Who are you?" letters pull from title, staggered ---
    // Spotlight flickers then catches at ~1.4s, text readable by ~1.9s
    const PROMPT_BASE = 2000; // ms — letters begin once light has caught
    const promptText = 'Who are you?';
    for (let i = 0; i < pSpans.length; i++) {
      const span = pSpans[i];
      const ch = promptText[i].toLowerCase();
      const absDelay = PROMPT_BASE + i * 60;

      // Skip spaces and punctuation for source matching
      if (ch === ' ' || ch === '?') {
        span.style.opacity = '0';
        span.animate([
          { opacity: 0 }, { opacity: 1 },
        ], { duration: 400, delay: absDelay, easing: 'ease-out', fill: 'forwards' });
        continue;
      }

      const destRect = span.getBoundingClientRect();
      const sourceEl = pool[ch]?.shift();

      if (sourceEl) {
        const srcRect = sourceEl.getBoundingClientRect();
        const fromX = srcRect.left - destRect.left + (srcRect.width - destRect.width) / 2;
        const fromY = srcRect.top - destRect.top + (srcRect.height - destRect.height) / 2;
        const fromRot = (Math.random() - 0.5) * 30;

        sourceEl.animate([
          { color: 'var(--gold)', fontWeight: '700', opacity: 1, offset: 0 },
          { color: 'var(--text-dim)', fontWeight: 'inherit', opacity: 'inherit', offset: 1 },
        ], { duration: 800, delay: absDelay, easing: 'ease-out', fill: 'none' });

        span.style.opacity = '0';
        span.animate([
          { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0 },
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        ], { duration: 1000, delay: absDelay + 150, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
      } else {
        span.style.opacity = '0';
        span.animate([
          { transform: `translateY(8px)`, opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ], { duration: 600, delay: absDelay, easing: 'ease-out', fill: 'forwards' });
      }
    }

    //  K  e  i  t  h       D  a  n  i  e  l  l  e
    //  0  1  2  3  4       0  1  2  3  4  5  6  7
    //
    // Both names hold back "i" AND "e" — the two letters they share.
    //
    // Beat 1 — Alternating, consonants + unique vowels only:
    //   K, D, a, t, n, h, l, l  (no i or e in either name yet)
    // Beat 2 — Pause. Both names sit with visible gaps:
    //   Keith:    K _ _ t h
    //   Danielle: D a n _ _ l l _
    // Beat 3 — Cross-donation, one at a time:
    //   Danielle's "a" is the only vowel she has. But we need i and e...
    //   First: a source "i" from title lands in Danielle (idx 3).
    //          Then Danielle's "i" glows teal → Keith's "i" (idx 2) flies from it.
    //   Then:  a source "e" from title lands in Keith (idx 1).
    //          Then Keith's "e" glows rose → Danielle's "e" (idx 4) flies from it.
    //   Then:  Keith's "e" glows rose again → Danielle's final "e" (idx 7) flies from it.

    const BASE = 2800; // ms after page load (spotlight + prompt settle, then names begin)

    const timeline = [
      // --- Beat 1: Alternating consonants + "a", building both names ---
      { span: kSpans[0], ch: 'k', delay: 0,    color: 'var(--keith)' },       // K____
      { span: dSpans[0], ch: 'd', delay: 180,  color: 'var(--danielle)' },    // D_______
      { span: dSpans[1], ch: 'a', delay: 360,  color: 'var(--danielle)' },    // Da______
      { span: kSpans[3], ch: 't', delay: 530,  color: 'var(--keith)' },       // K__t_
      { span: dSpans[2], ch: 'n', delay: 700,  color: 'var(--danielle)' },    // Dan_____
      { span: kSpans[4], ch: 'h', delay: 870,  color: 'var(--keith)' },       // K__th
      { span: dSpans[5], ch: 'l', delay: 1030, color: 'var(--danielle)' },    // Dan__l__
      { span: dSpans[6], ch: 'l', delay: 1180, color: 'var(--danielle)' },    // Dan__ll_
      // --- Beat 2: Pause. Both incomplete, missing shared letters i & e ---
      //     Keith:    K _ _ t h
      //     Danielle: D a n _ _ l l _
      // --- Beat 3: Cross-donation sequence ---
      // 3a: "i" from title → lands in Danielle (idx 3)
      { span: dSpans[3], ch: 'i', delay: 1900, color: 'var(--danielle)' },    // Dani__ll_
      // 3b: Danielle's "i" glows teal → Keith's "i" flies from it (Danielle keeps hers)
      { span: kSpans[2], ch: 'i', delay: 2500, color: 'var(--keith)', donor: dSpans[3], refill: true },  // K_ith
      // 3c: "e" from title → lands in Danielle (idx 4) temporarily
      { span: dSpans[4], ch: 'e', delay: 3100, color: 'var(--danielle)' },    // Danie_ll_
      // 3d: Danielle's "e" (idx 4) glows teal → flies UP to Keith's "e" (idx 1)
      { span: kSpans[1], ch: 'e', delay: 3700, color: 'var(--keith)', donor: dSpans[4] },  // Keith! 🎉
      // 3e: Keith's "e" (idx 1) glows rose → flies to Danielle's OTHER "e" spot (idx 7)
      { span: dSpans[7], ch: 'e', delay: 4300, color: 'var(--danielle)', donor: kSpans[1], refill: true }, // Daniell e
      // 3f: Fresh "e" from title → fills Danielle's vacated "e" (idx 4)
      { span: dSpans[4], ch: 'e', delay: 4800, color: 'var(--danielle)' },    // Danielle! 🎉
    ];

    for (const entry of timeline) {
      const { span, ch, delay, color, donor } = entry;
      const absDelay = BASE + delay;
      const destRect = span.getBoundingClientRect();

      let fromX, fromY, fromRot;

      if (donor) {
        // Fly from the other name's already-landed letter position
        const donorRect = donor.getBoundingClientRect();
        fromX = donorRect.left - destRect.left + (donorRect.width - destRect.width) / 2;
        fromY = donorRect.top - destRect.top + (donorRect.height - destRect.height) / 2;
        fromRot = (Math.random() - 0.5) * 20;

        if (entry.refill) {
          // Refill: donor glows, letter flies in, donor stays visible
          donor.animate([
            { color, fontWeight: '700', filter: 'brightness(1.8)', offset: 0 },
            { color, fontWeight: '700', filter: 'brightness(1.5)', offset: 0.5 },
            { color: 'inherit', fontWeight: 'inherit', filter: 'brightness(1)', offset: 1 },
          ], { duration: 800, delay: absDelay, easing: 'ease-out' });
        } else {
          // Normal donation: donor glows, then fades out as its letter departs
          donor.animate([
            { color, fontWeight: '700', filter: 'brightness(1.8)', opacity: 1, offset: 0 },
            { color, fontWeight: '700', filter: 'brightness(1.5)', opacity: 1, offset: 0.5 },
            { color, fontWeight: '700', filter: 'brightness(1.3)', opacity: 0.3, offset: 0.8 },
            { color: 'inherit', fontWeight: 'inherit', filter: 'brightness(1)', opacity: 0, offset: 1 },
          ], { duration: 1000, delay: absDelay, easing: 'ease-out', fill: 'forwards' });
        }

        // Letter appears at donor, holds visibly, then accelerates to its spot
        span.style.opacity = '0';
        span.animate([
          { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0, offset: 0 },
          { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0.9, offset: 0.08 },
          { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0.9, offset: 0.4 },
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: 1 },
        ], {
          duration: 1200,
          delay: absDelay + 200,
          easing: 'cubic-bezier(0.55, 0, 0.15, 1)',
          fill: 'forwards',
        });
      } else {
        // Try to claim a source letter from the title
        const sourceEl = pool[ch]?.shift();

        if (sourceEl) {
          const srcRect = sourceEl.getBoundingClientRect();
          fromX = srcRect.left - destRect.left + (srcRect.width - destRect.width) / 2;
          fromY = srcRect.top - destRect.top + (srcRect.height - destRect.height) / 2;
          fromRot = (Math.random() - 0.5) * 40;

          // Gold flash → bold in reader color, holds
          sourceEl.animate([
            { color: 'var(--gold)', fontWeight: '700', opacity: 1, offset: 0 },
            { color, fontWeight: '700', opacity: 1, offset: 0.25 },
            { color, fontWeight: '700', opacity: 1, offset: 0.75 },
            { color: 'inherit', fontWeight: 'inherit', opacity: 'inherit', offset: 1 },
          ], { duration: 1400, delay: absDelay, easing: 'ease-out', fill: 'none' });

          span.style.opacity = '0';
          span.animate([
            { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0, offset: 0 },
            { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0.9, offset: 0.05 },
            { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0.9, offset: 0.45 },
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: 1 },
          ], {
            duration: 1800,
            delay: absDelay + 300,
            easing: 'cubic-bezier(0.55, 0, 0.15, 1)',
            fill: 'forwards',
          });
        } else {
          // No match — random off-screen origin
          fromX = (Math.random() - 0.5) * 600;
          fromY = (Math.random() - 0.5) * 800;
          fromRot = (Math.random() - 0.5) * 90;

          span.style.opacity = '0';
          span.animate([
            { transform: `translate(${fromX}px, ${fromY}px) rotate(${fromRot}deg)`, opacity: 0 },
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          ], {
            duration: 1200,
            delay: absDelay,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'forwards',
          });
        }
      }
    }
  }, [keithRef, danielleRef, promptRef, keithBtnRef, danielleBtnRef]);
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('jung-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('jung-theme', next);
  };

  return (
    <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function App() {
  const [reader, setReader] = useState(() => localStorage.getItem('jung-reader'));
  const [tab, setTab] = useState(() => sessionStorage.getItem('jung-tab') || 'read');
  const [selectedChapter, setSelectedChapter] = useState(() => {
    const saved = sessionStorage.getItem('jung-chapter');
    return saved ? Number(saved) : null;
  });
  const [activeConcept, setActiveConcept] = useState(null);
  const [toast, setToast] = useState(null);
  const [symbolBurst, setSymbolBurst] = useState(false);
  const [transition, setTransition] = useState('idle');
  const [pendingChapter, setPendingChapter] = useState(null);
  const savedScrollRef = useRef(0);
  const chaptersRef = useRef(null);
  const coverRef = useRef(null);
  const symbolLayerRef = useRef(null);
  const promptLettersRef = useRef(null);
  const keithLettersRef = useRef(null);
  const danielleLettersRef = useRef(null);
  const keithBtnRef = useRef(null);
  const danielleBtnRef = useRef(null);

  useNameChoreography(keithLettersRef, danielleLettersRef, promptLettersRef, keithBtnRef, danielleBtnRef);

  // Fade cover into darkness as user scrolls away from it
  useEffect(() => {
    const cover = coverRef.current;
    if (!cover) return;

    function updateCoverFade() {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      // Fully visible at top, fully dark by the time you've scrolled one viewport height
      const progress = Math.min(scrollY / (vh * 0.7), 1);
      const opacity = 1 - progress;
      // Set as CSS custom property so it works alongside CSS animations
      cover.style.setProperty('--cover-fade', opacity);
    }

    updateCoverFade();
    window.addEventListener('scroll', updateCoverFade, { passive: true });
    return () => window.removeEventListener('scroll', updateCoverFade);
  }, [reader, selectedChapter]);

  const changeTab = (t) => {
    setTab(t);
    sessionStorage.setItem('jung-tab', t);
  };

  const TRANSITION_EXIT_MS = 700;
  const TRANSITION_ENTER_MS = 800;

  const changeChapter = useCallback((id) => {
    if (transition !== 'idle') return;

    // Save scroll position if leaving list view
    if (selectedChapter == null) {
      savedScrollRef.current = window.scrollY;
    }

    setPendingChapter(id);
    setTransition('exiting');

    setTimeout(() => {
      // Swap content
      setSelectedChapter(id);
      if (id != null) sessionStorage.setItem('jung-chapter', id);
      else sessionStorage.removeItem('jung-chapter');

      setTransition('entering');

      // Restore scroll immediately before the first paint so the cover is never visible
      if (id == null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScrollRef.current, behavior: 'instant' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      setTimeout(() => {
        setTransition('idle');
        setPendingChapter(null);
      }, TRANSITION_ENTER_MS);
    }, TRANSITION_EXIT_MS);
  }, [transition, selectedChapter]);

  const { otherReader, otherName } = usePresence(reader, selectedChapter);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const selectReader = (name) => {
    localStorage.setItem('jung-reader', name);
    // Trigger symbol burst animation before scrolling
    setSymbolBurst(true);
    setTimeout(() => {
      setReader(name);
      // Smooth scroll to chapter list
      setTimeout(() => {
        chaptersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 600);
  };

  // If reader was already set (returning user), skip the cover
  useEffect(() => {
    if (reader && chaptersRef.current) {
      // Instantly scroll past cover for returning users
      chaptersRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const transitionClass = transition === 'exiting' ? ' page-exit' : transition === 'entering' ? ' page-enter' : '';

  // If viewing a chapter detail, don't show the scrollable cover flow
  if (reader && selectedChapter) {
    return (
      <div className={`app page-transition-wrapper${transitionClass}`}>
        <ThemeToggle />
        <div className="app-content">
          <ChapterDetail
            chapterId={selectedChapter}
            reader={reader}
            onBack={() => changeChapter(null)}
            onShowConcept={setActiveConcept}
            showToast={showToast}
          />
        </div>
        <nav className="nav-tabs">
          <div className="nav-tabs-main">
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
          </div>
          <div className="nav-tabs-reader">
            <PresenceIndicator otherReader={otherReader} otherName={otherName} />
            <span className={`reader-badge ${reader.toLowerCase()}`}>{reader}</span>
            <button
              className="nav-switch-btn"
              onClick={() => {
                localStorage.removeItem('jung-reader');
                setReader(null);
                setSymbolBurst(false);
              }}
            >
              switch
            </button>
          </div>
        </nav>
        {activeConcept && (
          <ConceptCard conceptKey={activeConcept} onClose={() => setActiveConcept(null)} />
        )}
        {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.message}</div>}
      </div>
    );
  }

  return (
    <div className={`app-scrollable page-transition-wrapper${transitionClass}`}>
      <ThemeToggle />
      <SymbolLayer ref={symbolLayerRef} burst={symbolBurst} />
      {/* Cover hero — always the roof of the reading house */}
      <div ref={coverRef} className={`reader-selection${symbolBurst ? ' burst' : ''}`}>
        <div className="title-page">
          <div className="title-dots">
            <span /><span /><span />
          </div>
          <h1 className="title-main">
            <SourceText tag="span">Man </SourceText>
            <span className="title-ampersand">&amp;</span>
            <SourceText tag="span"> His Symbols</SourceText>
          </h1>
          <SourceText className="title-author" tag="div">Carl Gustav Jung</SourceText>
          <div className="title-rule" />
          <div className="title-contributors">
            <SourceText>Conceived and edited by Carl G. Jung</SourceText>
            <SourceText>with M.-L. von Franz, Joseph L. Henderson,</SourceText>
            <SourceText>Jolande Jacobi, Aniela Jaff&eacute;</SourceText>
          </div>
        </div>

        {!reader && (
          <>
            <div className="reader-prompt" ref={promptLettersRef}>
              {'Who are you?'.split('').map((ch, i) => (
                <span key={i} className="fly-in-letter">{ch === ' ' ? '\u00A0' : ch}</span>
              ))}
            </div>
            <div className="reader-buttons">
              <button className="reader-select-btn keith" ref={keithBtnRef} onClick={() => selectReader('Keith')}>
                <NameLetters text="Keith" btnRef={keithLettersRef} />
              </button>
              <button className="reader-select-btn danielle" ref={danielleBtnRef} onClick={() => selectReader('Danielle')}>
                <NameLetters text="Danielle" btnRef={danielleLettersRef} />
              </button>
            </div>
          </>
        )}

        {reader && (
          <div className="cover-scroll-hint">
            <span className="cover-scroll-arrow">&#x2193;</span>
          </div>
        )}
      </div>

      {/* Chapter list and main content — below the cover */}
      {reader && (
        <div className="app-below-cover" ref={chaptersRef}>
          <div className="app-content">
            {tab === 'read' && (
              <ChapterList onSelect={changeChapter} skipEntry={transition === 'entering'} />
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
            <div className="nav-tabs-main">
              <button
                className={`nav-tab ${tab === 'read' ? 'active' : ''}`}
                onClick={() => changeTab('read')}
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
            </div>
            <div className="nav-tabs-reader">
              <PresenceIndicator otherReader={otherReader} otherName={otherName} />
              <span className={`reader-badge ${reader.toLowerCase()}`}>{reader}</span>
              <button
                className="nav-switch-btn"
                onClick={() => {
                  localStorage.removeItem('jung-reader');
                  setReader(null);
                  setSymbolBurst(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                switch
              </button>
            </div>
          </nav>
        </div>
      )}

      {activeConcept && (
        <ConceptCard conceptKey={activeConcept} onClose={() => setActiveConcept(null)} />
      )}
      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
