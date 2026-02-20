import { useEffect, useRef } from 'react';

const symbols = [
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

export default function SymbolLayer() {
  const layerRef = useRef(null);
  const activeRef = useRef([]);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const active = activeRef.current;

    function isInExclusionZone(x, y) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = Math.abs(x - cx) / (window.innerWidth * 0.28);
      const dy = Math.abs(y - cy) / (window.innerHeight * 0.32);
      return (dx * dx + dy * dy) < 1;
    }

    function spawnSymbol() {
      if (active.length >= MAX_SYMBOLS) return;

      const idx = Math.floor(Math.random() * symbols.length);
      const svgStr = symbols[idx]();
      const size = 50 + Math.random() * 60; // slightly smaller for mobile

      let x, y, attempts = 0;
      do {
        x = Math.random() * (window.innerWidth - size);
        y = Math.random() * (window.innerHeight - size);
        attempts++;
      } while (isInExclusionZone(x + size / 2, y + size / 2) && attempts < 20);

      if (attempts >= 20) return;

      const el = document.createElement('div');
      el.className = 'symbol';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.innerHTML = svgStr;

      const hue = 38 + Math.random() * 12;
      const sat = 50 + Math.random() * 20;
      const light = 45 + Math.random() * 15;
      el.style.color = `hsla(${hue}, ${sat}%, ${light}%, 1)`;

      const startRot = Math.random() * 360;
      const rotSpeed = (Math.random() - 0.5) * 20;
      el.style.transform = `rotate(${startRot}deg)`;

      const driftX = (Math.random() - 0.5) * 30;
      const driftY = -10 - Math.random() * 20;

      layer.appendChild(el);

      const fadeInDuration = 1000 + Math.random() * 1500;
      const holdDuration = 4000 + Math.random() * 5000;
      const fadeOutDuration = 2000 + Math.random() * 2000;
      const maxOpacity = 0.15 + Math.random() * 0.15;

      active.push({
        el, startTime: performance.now(),
        fadeInDuration, holdDuration, fadeOutDuration, maxOpacity,
        startX: x, startY: y, startRot, driftX, driftY, rotSpeed,
        totalDuration: fadeInDuration + holdDuration + fadeOutDuration,
      });
    }

    function updateSymbols(now) {
      for (let i = active.length - 1; i >= 0; i--) {
        const s = active[i];
        const elapsed = now - s.startTime;
        const progress = elapsed / s.totalDuration;

        if (progress >= 1) {
          s.el.remove();
          active.splice(i, 1);
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

      rafRef.current = requestAnimationFrame(updateSymbols);
    }

    function scheduleSpawn() {
      spawnSymbol();
      const delay = 1500 + Math.random() * 3000;
      timeoutRef.current = setTimeout(scheduleSpawn, delay);
    }

    rafRef.current = requestAnimationFrame(updateSymbols);

    // initial burst
    spawnSymbol();
    setTimeout(() => spawnSymbol(), 400);
    setTimeout(() => spawnSymbol(), 800);
    setTimeout(() => spawnSymbol(), 1500);
    setTimeout(() => spawnSymbol(), 2200);
    timeoutRef.current = setTimeout(scheduleSpawn, 3000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timeoutRef.current);
      // clean up spawned DOM elements
      active.forEach(s => s.el.remove());
      active.length = 0;
    };
  }, []);

  return (
    <>
      <div className="symbol-layer" ref={layerRef} />
      <div className="symbol-center-glow" />
    </>
  );
}
