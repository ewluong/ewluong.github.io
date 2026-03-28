<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionVector, vectorModifiers, driftModifiers, coherenceState, sessionLedger, type AmbientTextPool, type SessionLedger } from '../stores/temporal';
  import { get } from 'svelte/store';

  /**
   * Ambient text fragments — whispers from the system's own state.
   * Uses direct DOM manipulation for animation (bypasses Svelte reactivity per frame).
   */

  // Base system fragments — authored for this system
  const SYSTEM_FRAGMENTS = [
    'ENTROPY: STABLE',
    'OBSERVER: PRESENT',
    'MEMBRANE INTACT',
    'SIGNAL/NOISE: 0.94',
    'JUST CHASING THE WIND',
    'THE THRESHOLD HOLDS',
    'GATE STATUS: OPEN',
  ];

  const SPIRITUAL_FRAGMENTS = [
    'BE STILL AND KNOW',
    'SELAH',
    'SOLI DEO GLORIA',
    'THE WORD ENDURES',
    'FEAR AND TREMBLING',
    'AMOR FATI',
    'MEMENTO MORI',
    'WALK HUMBLY',
  ];

  const DRIFT_FRAGMENTS: string[] = [
    'REMEMBER YOUR HEADING',
    'THE GATE IS BEHIND YOU',
    'PASS THROUGH',
    'RETURN TO VECTOR',
  ];

  const COHERENCE_HIGH_FRAGMENTS = [
    'THE CURRENT HOLDS',
    'ALIGNMENT',
    'STEADY STATE',
    'COHERENCE HOLDING',
    'ON VECTOR',
  ];

  const COHERENCE_LOW_FRAGMENTS = [
    'SCATTERED LIGHT',
    'THE SIGNAL FADES',
    'DISPERSING',
    'BETWEEN VECTORS',
  ];

  export let essayTitles: string[] = [];
  export let projectTitles: string[] = [];

  let pools: Record<string, string[]> = {};

  function buildPools(): Record<string, string[]> {
    const base = [...SYSTEM_FRAGMENTS];
    const essays = essayTitles.map(t => t.toUpperCase());
    const projects = projectTitles.slice(0, 6).map(t => t.toUpperCase());
    const liveData: string[] = [];

    if (typeof window !== 'undefined') {
      try {
        const habits = localStorage.getItem('ewluong-os-habits');
        if (habits) {
          const data = JSON.parse(habits);
          if (Array.isArray(data.habits) && data.habits.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const done = data.habits.filter((h: { history: Record<string, boolean> }) => h.history?.[today]).length;
            const pct = Math.round((done / data.habits.length) * 100);
            liveData.push(`INTEGRITY: ${pct}%`);
          }
        }
      } catch {}

      try {
        const log = localStorage.getItem('ewluong-os-log');
        if (log) {
          const entries = JSON.parse(log);
          if (Array.isArray(entries) && entries.length > 0) {
            const sorted = entries.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
            const lastContent = sorted[0]?.content ?? '';
            if (lastContent.length > 10) {
              const sentences = lastContent.split(/[.!?\n]/).filter((s: string) => s.trim().length > 8);
              if (sentences.length > 0) {
                const frag = sentences[sentences.length - 1].trim().toUpperCase().slice(0, 60);
                liveData.push(frag);
              }
            }
          }
        }
      } catch {}

      try {
        const lifetime = localStorage.getItem('ewluong-os-lifetime');
        if (lifetime) {
          const data = JSON.parse(lifetime);
          if (data.totalVisits > 1) liveData.push(`SESSION ${data.totalVisits}`);
          if (data.totalRuntimeMs > 0) {
            const hours = Math.floor(data.totalRuntimeMs / 3600000);
            liveData.push(`RUNTIME: ${hours}h`);
          }
        }
      } catch {}

      try {
        const weather = localStorage.getItem('ewluong-os-weather');
        if (weather) {
          const data = JSON.parse(weather);
          if (data.location) liveData.push(data.location.toUpperCase());
        }
      } catch {}
    }

    const allGeneral = [...base, ...liveData];

    return {
      default: [...allGeneral, ...essays, ...projects],
      writing: [...allGeneral, ...essays, ...liveData.filter(f => f.includes('SESSION') || f.includes('RUNTIME'))],
      signals: [...allGeneral, ...projects, 'SCANNING', 'INTERCEPT ACTIVE', 'SOURCE LOCK'],
      archive: [...allGeneral, ...essays, 'DEEP READING', 'THRESHOLD ARCHIVES'],
      spiritual: [...allGeneral, ...SPIRITUAL_FRAGMENTS],
      projects: [...allGeneral, ...projects, 'COMPILING', 'BUILD ACTIVE'],
    };
  }

  // --- Session echo ---

  function sessionEchoFragment(): string | null {
    const ledger = get(sessionLedger);
    const cs = get(coherenceState);
    const candidates: string[] = [];

    if (ledger.wordsWritten > 0) {
      candidates.push(`${ledger.wordsWritten} WORDS`);
      if (ledger.wordsWritten >= 100) candidates.push('THE LOG GROWS');
      if (ledger.wordsWritten >= 300) candidates.push('WORDS ACCUMULATING');
      if (ledger.wordsWritten >= 500) candidates.push('THE PAGE FILLS');
    }

    if (ledger.habitsCompleted > 0) {
      candidates.push('SYSTEMS CHECKED');
      if (ledger.habitsCompleted >= 3) candidates.push('INTEGRITY RISING');
      if (ledger.habitsCompleted >= 5) candidates.push('DIAGNOSTICS CLEAR');
    }

    if (ledger.signalsRead > 0) {
      candidates.push(`${ledger.signalsRead} SIGNALS PROCESSED`);
      if (ledger.signalsRead >= 5) candidates.push('SIGNAL INTAKE ACTIVE');
    }

    if (ledger.modulesVisited.length > 4) {
      candidates.push(`${ledger.modulesVisited.length} MODULES TRAVERSED`);
    }

    if (cs.totalFocusedMs > 120000) {
      if (cs.ratio > 0.80) {
        candidates.push(...COHERENCE_HIGH_FRAGMENTS);
      } else if (cs.ratio < 0.40 && cs.driftMinutes < 10) {
        candidates.push(...COHERENCE_LOW_FRAGMENTS);
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function getPooledFragment(pool: AmbientTextPool): string {
    const poolFrags = pools[pool] || pools['default'] || SYSTEM_FRAGMENTS;

    // Priority 1: Drift injection (25% when drifting)
    const dm = currentDriftLevel;
    if (dm >= 1 && Math.random() < 0.25) {
      const vec = currentVector;
      const driftPool = [...DRIFT_FRAGMENTS];
      if (vec) driftPool.push(`VECTOR: ${vec}`);

      if (vec === 'WRITE') {
        try {
          const log = localStorage.getItem('ewluong-os-log');
          if (log) {
            const entries = JSON.parse(log);
            const today = new Date().toISOString().slice(0, 10);
            const hasToday = Array.isArray(entries) && entries.some((e: { date: string }) => e.date === today);
            if (!hasToday) driftPool.push('THE LOG IS EMPTY');
          }
        } catch {}
      }

      return driftPool[Math.floor(Math.random() * driftPool.length)];
    }

    // Priority 2: Session echo (~20% when ledger has data)
    if (Math.random() < 0.20) {
      const echo = sessionEchoFragment();
      if (echo) return echo;
    }

    return poolFrags[Math.floor(Math.random() * poolFrags.length)];
  }

  // --- Fragment state (plain objects, NOT reactive) ---

  interface Fragment {
    text: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    opacity: number;
    opacityDir: number;
    fadeSpeed: number;
    el: HTMLSpanElement | null;
  }

  let fragments: Fragment[] = [];
  let container: HTMLDivElement;
  let animationId: number;
  let recycleTimeout: ReturnType<typeof setTimeout>;

  let currentTextSpeed = 1.0;
  let currentTextDensity = 1.0;
  let currentPool: AmbientTextPool = 'default';
  let currentDriftLevel = 0;
  let currentVector = '';

  const unsubVec = vectorModifiers.subscribe(vm => {
    currentTextSpeed = vm.ambientTextSpeed;
    currentTextDensity = vm.ambientTextDensity;
    currentPool = vm.ambientTextPool;
  });

  const unsubDrift = driftModifiers.subscribe(dm => {
    currentDriftLevel = dm.driftLevel;
  });

  const unsubVector = sessionVector.subscribe(v => {
    currentVector = v;
  });

  const MIN_OPACITY = 0.04;
  const MAX_OPACITY = 0.12;

  function randomEdgePosition(): { x: number; y: number; vx: number; vy: number } {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const edge = Math.floor(Math.random() * 4);
    const margin = 80;
    const s = currentTextSpeed;

    switch (edge) {
      case 0: return { x: margin + Math.random() * (w - margin * 2), y: margin * 0.5, vx: (Math.random() - 0.5) * 0.15 * s, vy: (0.05 + Math.random() * 0.08) * s };
      case 1: return { x: w - margin, y: margin + Math.random() * (h - margin * 2), vx: -(0.05 + Math.random() * 0.08) * s, vy: (Math.random() - 0.5) * 0.15 * s };
      case 2: return { x: margin + Math.random() * (w - margin * 2), y: h - margin, vx: (Math.random() - 0.5) * 0.15 * s, vy: -(0.05 + Math.random() * 0.08) * s };
      default: return { x: margin, y: margin + Math.random() * (h - margin * 2), vx: (0.05 + Math.random() * 0.08) * s, vy: (Math.random() - 0.5) * 0.15 * s };
    }
  }

  function createFragmentEl(): Fragment {
    const pos = randomEdgePosition();
    const el = document.createElement('span');
    el.className = 'ambient-fragment';
    el.textContent = getPooledFragment(currentPool);
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.opacity = '0';
    return { text: el.textContent, ...pos, opacity: 0, opacityDir: 1, fadeSpeed: 0.003 + Math.random() * 0.004, el };
  }

  // --- Animation: direct DOM manipulation, no Svelte reactivity ---

  function animate() {
    for (const frag of fragments) {
      frag.x += frag.vx;
      frag.y += frag.vy;

      frag.opacity += frag.opacityDir * frag.fadeSpeed;
      if (frag.opacity >= MAX_OPACITY) {
        frag.opacity = MAX_OPACITY;
        frag.opacityDir = -1;
      }
      if (frag.opacity <= MIN_OPACITY) {
        frag.opacity = MIN_OPACITY;
        frag.opacityDir = 1;
      }

      // Direct DOM update — no Svelte re-render
      if (frag.el) {
        frag.el.style.left = frag.x + 'px';
        frag.el.style.top = frag.y + 'px';
        frag.el.style.opacity = String(frag.opacity);
      }
    }
    animationId = requestAnimationFrame(animate);
  }

  function recycleRandom() {
    if (fragments.length === 0) return;
    const idx = Math.floor(Math.random() * fragments.length);
    const frag = fragments[idx];

    frag.opacity = 0;
    frag.opacityDir = 1;
    const pos = randomEdgePosition();
    frag.x = pos.x;
    frag.y = pos.y;
    frag.vx = pos.vx;
    frag.vy = pos.vy;
    frag.text = getPooledFragment(currentPool);
    frag.fadeSpeed = 0.003 + Math.random() * 0.004;

    if (frag.el) {
      frag.el.textContent = frag.text;
      frag.el.style.left = pos.x + 'px';
      frag.el.style.top = pos.y + 'px';
      frag.el.style.opacity = '0';
    }

    scheduleRecycle();
  }

  function scheduleRecycle() {
    const baseInterval = 20000 + Math.random() * 15000;
    const interval = baseInterval / Math.max(0.3, currentTextDensity);
    recycleTimeout = setTimeout(recycleRandom, interval);
  }

  onMount(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    pools = buildPools();
    const fragCount = Math.max(3, Math.round(5 * currentTextDensity));

    // Create fragment DOM elements directly
    for (let i = 0; i < fragCount; i++) {
      const frag = createFragmentEl();
      frag.opacity = MIN_OPACITY + (i * 0.015);
      if (frag.el) {
        frag.el.style.opacity = String(frag.opacity);
        container.appendChild(frag.el);
      }
      fragments.push(frag);
    }

    if (!prefersReduced) {
      animationId = requestAnimationFrame(animate);
      scheduleRecycle();
    }
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    clearTimeout(recycleTimeout);
    unsubVec();
    unsubDrift();
    unsubVector();
    // Clean up DOM elements
    for (const frag of fragments) {
      if (frag.el && frag.el.parentNode) frag.el.parentNode.removeChild(frag.el);
    }
    fragments = [];
  });
</script>

<div class="ambient-text-layer" bind:this={container}></div>

<style>
  .ambient-text-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: var(--z-ambient);
    overflow: hidden;
  }

  /* Applied via className in JS */
  :global(.ambient-fragment) {
    position: absolute;
    font-family: var(--font-system);
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    white-space: nowrap;
    user-select: none;
  }
</style>
