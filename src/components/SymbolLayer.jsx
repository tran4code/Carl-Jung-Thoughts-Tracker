import { useEffect, useRef, forwardRef } from 'react';

const symbolGenerators = [
  // Mandala (quartered circle)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <circle cx="40" cy="40" r="30"/>
    <circle cx="40" cy="40" r="20"/>
    <circle cx="40" cy="40" r="8"/>
    <line x1="40" y1="10" x2="40" y2="70"/>
    <line x1="10" y1="40" x2="70" y2="40"/>
  </svg>`,

  // Ouroboros
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 12 A28 28 0 1 1 38 12" stroke-linecap="round"/>
    <path d="M38 12 L42 8 L40 14 Z" fill="currentColor" stroke="none"/>
    <circle cx="40" cy="40" r="4"/>
  </svg>`,

  // Sun (conscious)
  () => {
    const rays = [0,45,90,135,180,225,270,315].map(a => {
      const r1 = 18, r2 = 26;
      const rad = a * Math.PI / 180;
      return `<line x1="${40+Math.cos(rad)*r1}" y1="${40+Math.sin(rad)*r1}" x2="${40+Math.cos(rad)*r2}" y2="${40+Math.sin(rad)*r2}"/>`;
    }).join('');
    return `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
      <circle cx="40" cy="40" r="12"/>
      <circle cx="40" cy="40" r="3" fill="currentColor"/>
      ${rays}
    </svg>`;
  },

  // Crescent moon (unconscious)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M48 16 A22 22 0 1 1 48 64 A16 16 0 1 0 48 16Z"/>
  </svg>`,

  // Tree of life
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <line x1="40" y1="72" x2="40" y2="28"/>
    <path d="M40 28 Q30 20 22 26" stroke-linecap="round"/>
    <path d="M40 28 Q50 20 58 26" stroke-linecap="round"/>
    <path d="M40 36 Q32 30 26 34" stroke-linecap="round"/>
    <path d="M40 36 Q48 30 54 34" stroke-linecap="round"/>
    <path d="M40 44 Q34 38 30 42" stroke-linecap="round"/>
    <path d="M40 44 Q46 38 50 42" stroke-linecap="round"/>
    <path d="M35 72 Q40 64 45 72" stroke-linecap="round"/>
  </svg>`,

  // Quaternity (cross in circle)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <circle cx="40" cy="40" r="26"/>
    <line x1="40" y1="14" x2="40" y2="66"/>
    <line x1="14" y1="40" x2="66" y2="40"/>
    <circle cx="40" cy="14" r="3" fill="currentColor"/>
    <circle cx="40" cy="66" r="3" fill="currentColor"/>
    <circle cx="14" cy="40" r="3" fill="currentColor"/>
    <circle cx="66" cy="40" r="3" fill="currentColor"/>
  </svg>`,

  // Eye (perception/consciousness)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M8 40 Q40 16 72 40 Q40 64 8 40Z"/>
    <circle cx="40" cy="40" r="10"/>
    <circle cx="40" cy="40" r="4" fill="currentColor"/>
  </svg>`,

  // Spiral (individuation)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 40 Q40 36 44 36 Q48 36 48 40 Q48 46 42 48 Q34 50 32 42 Q30 32 38 28 Q48 24 52 34 Q56 48 44 54 Q28 60 24 42 Q20 22 36 18 Q54 14 60 36 Q64 56 42 62" stroke-linecap="round"/>
  </svg>`,

  // Triangle with eye
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 12 L68 64 L12 64 Z"/>
    <circle cx="40" cy="42" r="8"/>
    <circle cx="40" cy="42" r="3" fill="currentColor"/>
  </svg>`,

  // Alchemical symbol (gold/sol)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <circle cx="40" cy="40" r="22"/>
    <circle cx="40" cy="40" r="3" fill="currentColor"/>
  </svg>`,

  // Key (unlocking the unconscious)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <circle cx="30" cy="32" r="12"/>
    <circle cx="30" cy="32" r="5"/>
    <line x1="42" y1="32" x2="66" y2="32"/>
    <line x1="60" y1="32" x2="60" y2="42"/>
    <line x1="54" y1="32" x2="54" y2="40"/>
  </svg>`,

  // Labyrinth
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.7">
    <circle cx="40" cy="40" r="4" fill="currentColor"/>
    <path d="M40 28 A12 12 0 0 1 52 40" stroke-linecap="round"/>
    <path d="M52 40 A12 12 0 0 1 40 52" stroke-linecap="round"/>
    <path d="M40 52 A12 12 0 0 1 28 40" stroke-linecap="round"/>
    <path d="M40 22 A18 18 0 0 1 58 40" stroke-linecap="round"/>
    <path d="M58 40 A18 18 0 0 1 40 58" stroke-linecap="round"/>
    <path d="M40 58 A18 18 0 0 1 22 40" stroke-linecap="round"/>
    <path d="M40 16 A24 24 0 0 1 64 40" stroke-linecap="round"/>
    <path d="M64 40 A24 24 0 0 1 40 64" stroke-linecap="round"/>
    <path d="M40 64 A24 24 0 0 1 16 40" stroke-linecap="round"/>
  </svg>`,

  // Infinity / lemniscate
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M40 40 C32 26 12 26 12 40 C12 54 32 54 40 40 C48 26 68 26 68 40 C68 54 48 54 40 40Z"/>
  </svg>`,

  // Star (individuation / wholeness)
  () => {
    const path = [0,1,2,3,4].map(i => {
      const a1 = (i * 72 - 90) * Math.PI / 180;
      const a2 = ((i * 72) + 36 - 90) * Math.PI / 180;
      const ox = 40, oy = 40, r1 = 26, r2 = 12;
      return `${i === 0 ? 'M' : 'L'}${ox + Math.cos(a1) * r1} ${oy + Math.sin(a1) * r1} L${ox + Math.cos(a2) * r2} ${oy + Math.sin(a2) * r2}`;
    }).join(' ') + ' Z';
    return `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8"><path d="${path}"/></svg>`;
  },

  // Water/waves (the unconscious depths)
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <path d="M10 32 Q20 24 30 32 Q40 40 50 32 Q60 24 70 32" stroke-linecap="round"/>
    <path d="M10 42 Q20 34 30 42 Q40 50 50 42 Q60 34 70 42" stroke-linecap="round"/>
    <path d="M10 52 Q20 44 30 52 Q40 60 50 52 Q60 44 70 52" stroke-linecap="round"/>
  </svg>`,

  // Caduceus-inspired
  () => `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="0.8">
    <line x1="40" y1="14" x2="40" y2="68"/>
    <circle cx="40" cy="14" r="4"/>
    <path d="M28 58 Q40 50 52 58 Q40 42 28 50 Q40 34 52 42 Q40 26 28 34" stroke-linecap="round"/>
  </svg>`,
];

const MAX_SYMBOLS = 8;
const BURST_TOTAL = 14;

function createSymbolElement(layer, x, y) {
  const idx = Math.floor(Math.random() * symbolGenerators.length);
  const size = 50 + Math.random() * 60;
  const hue = 38 + Math.random() * 12;
  const sat = 50 + Math.random() * 20;
  const light = 45 + Math.random() * 15;
  const rot = Math.random() * 360;
  const maxOpacity = 0.15 + Math.random() * 0.15;

  const el = document.createElement('div');
  el.className = 'symbol';
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = `hsla(${hue}, ${sat}%, ${light}%, 1)`;
  el.style.transform = `rotate(${rot}deg)`;
  el.style.opacity = '0';
  el.innerHTML = symbolGenerators[idx]();
  layer.appendChild(el);

  return { el, size, rot, maxOpacity };
}

function isInExclusionZone(x, y) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = Math.abs(x - cx) / (window.innerWidth * 0.28);
  const dy = Math.abs(y - cy) / (window.innerHeight * 0.32);
  return (dx * dx + dy * dy) < 1;
}

const SymbolLayer = forwardRef(function SymbolLayer({ burst }, ref) {
  const layerRef = useRef(null);
  const glowRef = useRef(null);
  // Each entry: { el, startTime, fadeInDuration, holdDuration, fadeOutDuration, maxOpacity,
  //               startX, startY, startRot, driftX, driftY, rotSpeed, totalDuration }
  const symbolsRef = useRef([]);
  const rafRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const burstActiveRef = useRef(false);

  // Keep the glow centered at the viewport as the user scrolls
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    function positionGlow() {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      glow.style.top = (scrollY + vh / 2) + 'px';
    }

    positionGlow();
    window.addEventListener('scroll', positionGlow, { passive: true });
    window.addEventListener('resize', positionGlow, { passive: true });
    return () => {
      window.removeEventListener('scroll', positionGlow);
      window.removeEventListener('resize', positionGlow);
    };
  }, []);

  // Burst effect using Web Animations API
  useEffect(() => {
    if (!burst) return;
    const layer = layerRef.current;
    if (!layer) return;

    // Stop normal spawning and animation during burst
    burstActiveRef.current = true;
    clearTimeout(spawnTimerRef.current);

    const active = symbolsRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;

    // Phase 1: Spawn extra symbols to fill the screen at visible opacity
    const extraNeeded = Math.max(0, BURST_TOTAL - active.length);
    for (let i = 0; i < extraNeeded; i++) {
      const x = Math.random() * (vw - 80);
      const y = Math.random() * (vh - 80);
      const { el, maxOpacity } = createSymbolElement(layer, x, y);
      el.style.opacity = String(maxOpacity);
      // These extras have no normal lifecycle — they exist only for the burst
      active.push({
        el, startTime: performance.now(), maxOpacity,
        fadeInDuration: 0, holdDuration: Infinity, fadeOutDuration: 0,
        startX: x, startY: y, startRot: 0, driftX: 0, driftY: 0, rotSpeed: 0,
        totalDuration: Infinity,
      });
    }

    // Phase 2: Brighten all symbols instantly
    for (const s of active) {
      s.el.style.opacity = String(Math.min(s.maxOpacity * 3, 0.55));
    }

    // Phase 3: After one paint frame, animate outward using el.animate()
    const burstPromises = [];

    requestAnimationFrame(() => {
      for (const s of active) {
        const rect = s.el.getBoundingClientRect();
        const sx = rect.left + rect.width / 2;
        const sy = rect.top + rect.height / 2;
        const angle = Math.atan2(sy - cy, sx - cx);
        const dist = 80 + Math.random() * 60;
        const moveX = Math.cos(angle) * dist;
        const moveY = Math.sin(angle) * dist;

        const currentLeft = parseFloat(s.el.style.left) || 0;
        const currentTop = parseFloat(s.el.style.top) || 0;
        const currentOpacity = parseFloat(s.el.style.opacity) || 0;

        const anim = s.el.animate([
          { left: currentLeft + 'px', top: currentTop + 'px', opacity: currentOpacity },
          { left: (currentLeft + moveX) + 'px', top: (currentTop + moveY) + 'px', opacity: 0 },
        ], {
          duration: 900,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'forwards',
        });

        burstPromises.push(anim.finished.then(() => s.el.remove()));
      }

      // Once all animations finish, clean up and resume normal operation
      Promise.all(burstPromises).then(() => {
        symbolsRef.current = [];
        burstActiveRef.current = false;
        // Resume normal spawning
        scheduleSpawn();
      });
    });

    function scheduleSpawn() {
      if (!layerRef.current) return;
      spawnSymbol();
      spawnTimerRef.current = setTimeout(scheduleSpawn, 1500 + Math.random() * 3000);
    }

    function spawnSymbol() {
      const syms = symbolsRef.current;
      if (syms.length >= MAX_SYMBOLS) return;
      const lyr = layerRef.current;
      if (!lyr) return;

      let x, y, attempts = 0;
      const size = 50 + Math.random() * 60;
      do {
        x = Math.random() * (window.innerWidth - size);
        y = Math.random() * (window.innerHeight - size);
        attempts++;
      } while (isInExclusionZone(x + size / 2, y + size / 2) && attempts < 20);
      if (attempts >= 20) return;

      const { el, rot, maxOpacity } = createSymbolElement(lyr, x, y);
      const driftX = (Math.random() - 0.5) * 30;
      const driftY = -10 - Math.random() * 20;
      const rotSpeed = (Math.random() - 0.5) * 20;
      const fadeInDuration = 1000 + Math.random() * 1500;
      const holdDuration = 4000 + Math.random() * 5000;
      const fadeOutDuration = 2000 + Math.random() * 2000;

      syms.push({
        el, startTime: performance.now(), maxOpacity,
        fadeInDuration, holdDuration, fadeOutDuration,
        startX: x, startY: y, startRot: rot, driftX, driftY, rotSpeed,
        totalDuration: fadeInDuration + holdDuration + fadeOutDuration,
      });
    }
  }, [burst]);

  // Normal lifecycle: spawn, drift, fade in/out via RAF
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const syms = symbolsRef.current;

    function spawnSymbol() {
      if (syms.length >= MAX_SYMBOLS) return;

      let x, y, attempts = 0;
      const size = 50 + Math.random() * 60;
      do {
        x = Math.random() * (window.innerWidth - size);
        y = Math.random() * (window.innerHeight - size);
        attempts++;
      } while (isInExclusionZone(x + size / 2, y + size / 2) && attempts < 20);
      if (attempts >= 20) return;

      const { el, rot, maxOpacity } = createSymbolElement(layer, x, y);
      const driftX = (Math.random() - 0.5) * 30;
      const driftY = -10 - Math.random() * 20;
      const rotSpeed = (Math.random() - 0.5) * 20;
      const fadeInDuration = 1000 + Math.random() * 1500;
      const holdDuration = 4000 + Math.random() * 5000;
      const fadeOutDuration = 2000 + Math.random() * 2000;

      syms.push({
        el, startTime: performance.now(), maxOpacity,
        fadeInDuration, holdDuration, fadeOutDuration,
        startX: x, startY: y, startRot: rot, driftX, driftY, rotSpeed,
        totalDuration: fadeInDuration + holdDuration + fadeOutDuration,
      });
    }

    function updateSymbols(now) {
      if (!burstActiveRef.current) {
        for (let i = syms.length - 1; i >= 0; i--) {
          const s = syms[i];
          const elapsed = now - s.startTime;
          const progress = elapsed / s.totalDuration;

          if (progress >= 1) {
            s.el.remove();
            syms.splice(i, 1);
            continue;
          }

          let opacity;
          const fadeInEnd = s.fadeInDuration / s.totalDuration;
          const holdEnd = (s.fadeInDuration + s.holdDuration) / s.totalDuration;

          if (progress < fadeInEnd) {
            const t = progress / fadeInEnd;
            opacity = t * t * s.maxOpacity;
          } else if (progress < holdEnd) {
            opacity = s.maxOpacity;
          } else {
            const t = (progress - holdEnd) / (1 - holdEnd);
            opacity = (1 - t * t) * s.maxOpacity;
          }

          const driftProgress = elapsed / s.totalDuration;
          const dx = s.driftX * driftProgress;
          const dy = s.driftY * driftProgress;
          const rot = s.startRot + s.rotSpeed * driftProgress;

          s.el.style.opacity = Math.max(0, opacity);
          s.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
        }
      }

      rafRef.current = requestAnimationFrame(updateSymbols);
    }

    function scheduleSpawn() {
      if (burstActiveRef.current) return;
      spawnSymbol();
      spawnTimerRef.current = setTimeout(scheduleSpawn, 1500 + Math.random() * 3000);
    }

    rafRef.current = requestAnimationFrame(updateSymbols);

    // Spawn initial batch at full opacity for immediate visibility
    for (let i = 0; i < 5; i++) {
      spawnSymbol();
      // Make initial symbols visible immediately (skip fade-in)
      const last = syms[syms.length - 1];
      if (last) {
        last.el.style.opacity = String(last.maxOpacity);
        last.fadeInDuration = 0;
        last.totalDuration = last.holdDuration + last.fadeOutDuration;
      }
    }

    spawnTimerRef.current = setTimeout(scheduleSpawn, 1500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(spawnTimerRef.current);
      syms.forEach(s => s.el.remove());
      syms.length = 0;
    };
  }, []);

  return (
    <>
      <div className="symbol-layer" ref={layerRef} />
      <div className="symbol-center-glow" ref={glowRef} />
      <div className="symbol-vignette" />
    </>
  );
});

export default SymbolLayer;
