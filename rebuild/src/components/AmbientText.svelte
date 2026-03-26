<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  /**
   * Ambient text fragments — whispers from the system's own state.
   * Draws from essays, projects, logs, and live system data
   * rather than only hardcoded strings.
   */

  // Base system fragments (kept sparse — the personal content fills the rest)
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

  /** Essay titles passed from Workspace */
  export let essayTitles: string[] = [];
  /** Project titles passed from Workspace */
  export let projectTitles: string[] = [];

  function buildFragmentPool(): string[] {
    const pool = [...SYSTEM_FRAGMENTS];

    // Add essay titles
    for (const t of essayTitles) {
      pool.push(t.toUpperCase());
    }

    // Add project titles
    for (const t of projectTitles.slice(0, 6)) {
      pool.push(t.toUpperCase());
    }

    // Pull from localStorage data (live system state)
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
            pool.push(`INTEGRITY: ${pct}%`);
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
              // Take the last meaningful sentence fragment
              const sentences = lastContent.split(/[.!?\n]/).filter((s: string) => s.trim().length > 8);
              if (sentences.length > 0) {
                const frag = sentences[sentences.length - 1].trim().toUpperCase().slice(0, 60);
                pool.push(frag);
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
          if (data.totalVisits > 1) {
            pool.push(`SESSION ${data.totalVisits}`);
          }
          if (data.totalRuntimeMs > 0) {
            const hours = Math.floor(data.totalRuntimeMs / 3600000);
            pool.push(`RUNTIME: ${hours}h`);
          }
        }
      } catch { /* ignore */ }

      // Location from weather
      try {
        const weather = localStorage.getItem('ewluong-os-weather');
        if (weather) {
          const data = JSON.parse(weather);
          if (data.location) {
            pool.push(data.location.toUpperCase());
          }
        }
      } catch { /* ignore */ }
    }

    return pool;
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

  function randomEdgePosition(): { x: number; y: number; vx: number; vy: number } {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const edge = Math.floor(Math.random() * 4);
    const margin = 80;

    switch (edge) {
      case 0: // top
        return { x: margin + Math.random() * (w - margin * 2), y: margin * 0.5, vx: (Math.random() - 0.5) * 0.15, vy: 0.05 + Math.random() * 0.08 };
      case 1: // right
        return { x: w - margin, y: margin + Math.random() * (h - margin * 2), vx: -(0.05 + Math.random() * 0.08), vy: (Math.random() - 0.5) * 0.15 };
      case 2: // bottom
        return { x: margin + Math.random() * (w - margin * 2), y: h - margin, vx: (Math.random() - 0.5) * 0.15, vy: -(0.05 + Math.random() * 0.08) };
      default: // left
        return { x: margin, y: margin + Math.random() * (h - margin * 2), vx: 0.05 + Math.random() * 0.08, vy: (Math.random() - 0.5) * 0.15 };
    }
  }

  function createFragment(): FloatingFragment {
    const pos = randomEdgePosition();
    return {
      text: fragmentPool[Math.floor(Math.random() * fragmentPool.length)],
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

      // Opacity breathing
      frag.opacity += frag.opacityDir * frag.fadeSpeed;
      if (frag.opacity >= 0.08) {
        frag.opacity = 0.08;
        frag.opacityDir = -1;
      }
      if (frag.opacity <= 0.02) {
        frag.opacity = 0.02;
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
    frag.text = fragmentPool[Math.floor(Math.random() * fragmentPool.length)];
    frag.fadeSpeed = 0.003 + Math.random() * 0.004;

    fragments = fragments;
    scheduleRecycle();
  }

  function scheduleRecycle() {
    recycleTimeout = setTimeout(recycleRandom, 20000 + Math.random() * 15000);
  }

  onMount(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    fragmentPool = buildFragmentPool();
    fragments = Array.from({ length: 5 }, createFragment);
    fragments.forEach((f, i) => {
      f.opacity = 0.02 + (i * 0.012);
    });

    if (!prefersReduced) {
      animationId = requestAnimationFrame(animate);
      scheduleRecycle();
    }
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    clearTimeout(recycleTimeout);
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
