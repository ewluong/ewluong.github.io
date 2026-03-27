<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionVector, vectorModifiers, driftModifiers, type AmbientTextPool } from '../stores/temporal';

  /**
   * Ambient text fragments — whispers from the system's own state.
   * Draws from essays, projects, logs, and live system data.
   * Pool biased by current session vector. Speed/density modulated.
   */

  // Base system fragments
  const SYSTEM_FRAGMENTS = [
    'SYNC.OK',
    'PROC.IDLE',
    'ENTROPY: STABLE',
    'OBSERVER: PRESENT',
    'MEMBRANE INTACT',
    'PATTERN BLUE',
    'SIGNAL/NOISE: 0.94',
    'JUST CHASING THE WIND',
  ];

  // Spiritual/grounding fragments (for REFLECT pool bias)
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

  // Drift reminder fragments (injected when drifting)
  const DRIFT_FRAGMENTS: string[] = [
    'REMEMBER YOUR HEADING',
    'THE GATE IS BEHIND YOU',
    'PASS THROUGH',
    'RETURN TO VECTOR',
  ];

  /** Essay titles passed from Workspace */
  export let essayTitles: string[] = [];
  /** Project titles passed from Workspace */
  export let projectTitles: string[] = [];

  // Categorized pools built once on mount
  let pools: Record<string, string[]> = {};

  function buildPools(): Record<string, string[]> {
    const base = [...SYSTEM_FRAGMENTS];
    const essays = essayTitles.map(t => t.toUpperCase());
    const projects = projectTitles.slice(0, 6).map(t => t.toUpperCase());
    const liveData: string[] = [];

    if (typeof window !== 'undefined') {
      // Habit integrity
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
      } catch { /* ignore */ }

      // Last log entry excerpt
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
      } catch { /* ignore */ }

      // Lifetime data
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
      } catch { /* ignore */ }

      // Location from weather
      try {
        const weather = localStorage.getItem('ewluong-os-weather');
        if (weather) {
          const data = JSON.parse(weather);
          if (data.location) liveData.push(data.location.toUpperCase());
        }
      } catch { /* ignore */ }
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

  function getPooledFragment(pool: AmbientTextPool): string {
    const poolFrags = pools[pool] || pools['default'] || SYSTEM_FRAGMENTS;

    // Check for drift injection: 25% chance to inject a drift fragment
    const dm = currentDriftLevel;
    if (dm >= 1 && Math.random() < 0.25) {
      const vec = currentVector;
      // Add vector-specific reminders
      const driftPool = [...DRIFT_FRAGMENTS];
      if (vec) driftPool.push(`VECTOR: ${vec}`);

      // Check if log is empty (for WRITE drift)
      if (vec === 'WRITE') {
        try {
          const log = localStorage.getItem('ewluong-os-log');
          if (log) {
            const entries = JSON.parse(log);
            const today = new Date().toISOString().slice(0, 10);
            const hasToday = Array.isArray(entries) && entries.some((e: { date: string }) => e.date === today);
            if (!hasToday) driftPool.push('THE LOG IS EMPTY');
          }
        } catch { /* ignore */ }
      }

      return driftPool[Math.floor(Math.random() * driftPool.length)];
    }

    return poolFrags[Math.floor(Math.random() * poolFrags.length)];
  }

  interface FloatingFragment {
    text: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    opacity: number;
    opacityDir: number;
    fadeSpeed: number;
  }

  let fragmentPool: string[] = [];
  let fragments: FloatingFragment[] = [];
  let animationId: number;
  let recycleTimeout: ReturnType<typeof setTimeout>;

  // Reactive modifier values
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

  // Opacity range: slightly more visible than before (0.04-0.12 instead of 0.02-0.08)
  const MIN_OPACITY = 0.04;
  const MAX_OPACITY = 0.12;

  function randomEdgePosition(): { x: number; y: number; vx: number; vy: number } {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const edge = Math.floor(Math.random() * 4);
    const margin = 80;
    const speedMult = currentTextSpeed;

    switch (edge) {
      case 0: // top
        return { x: margin + Math.random() * (w - margin * 2), y: margin * 0.5, vx: (Math.random() - 0.5) * 0.15 * speedMult, vy: (0.05 + Math.random() * 0.08) * speedMult };
      case 1: // right
        return { x: w - margin, y: margin + Math.random() * (h - margin * 2), vx: -(0.05 + Math.random() * 0.08) * speedMult, vy: (Math.random() - 0.5) * 0.15 * speedMult };
      case 2: // bottom
        return { x: margin + Math.random() * (w - margin * 2), y: h - margin, vx: (Math.random() - 0.5) * 0.15 * speedMult, vy: -(0.05 + Math.random() * 0.08) * speedMult };
      default: // left
        return { x: margin, y: margin + Math.random() * (h - margin * 2), vx: (0.05 + Math.random() * 0.08) * speedMult, vy: (Math.random() - 0.5) * 0.15 * speedMult };
    }
  }

  function createFragment(): FloatingFragment {
    const pos = randomEdgePosition();
    return {
      text: getPooledFragment(currentPool),
      ...pos,
      opacity: 0,
      opacityDir: 1,
      fadeSpeed: 0.003 + Math.random() * 0.004,
    };
  }

  function animate() {
    for (const frag of fragments) {
      frag.x += frag.vx;
      frag.y += frag.vy;

      // Opacity breathing with vector-adjusted range
      frag.opacity += frag.opacityDir * frag.fadeSpeed;
      if (frag.opacity >= MAX_OPACITY) {
        frag.opacity = MAX_OPACITY;
        frag.opacityDir = -1;
      }
      if (frag.opacity <= MIN_OPACITY) {
        frag.opacity = MIN_OPACITY;
        frag.opacityDir = 1;
      }
    }
    fragments = fragments; // trigger reactivity
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

    fragments = fragments;
    scheduleRecycle();
  }

  function scheduleRecycle() {
    // Recycle interval affected by density — lower density = longer intervals
    const baseInterval = 20000 + Math.random() * 15000;
    const interval = baseInterval / Math.max(0.3, currentTextDensity);
    recycleTimeout = setTimeout(recycleRandom, interval);
  }

  onMount(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    pools = buildPools();
    // Fragment count modulated by density
    const fragCount = Math.max(3, Math.round(5 * currentTextDensity));
    fragments = Array.from({ length: fragCount }, createFragment);
    fragments.forEach((f, i) => {
      f.opacity = MIN_OPACITY + (i * 0.015);
    });

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
  });
</script>

<div class="ambient-text-layer">
  {#each fragments as frag}
    <span
      class="ambient-fragment"
      style="
        left: {frag.x}px;
        top: {frag.y}px;
        opacity: {frag.opacity};
      "
    >
      {frag.text}
    </span>
  {/each}
</div>

<style>
  .ambient-text-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: var(--z-ambient);
    overflow: hidden;
  }

  .ambient-fragment {
    position: absolute;
    font-family: var(--font-system);
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    white-space: nowrap;
    user-select: none;
  }
</style>
