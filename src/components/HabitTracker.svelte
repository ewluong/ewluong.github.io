<script lang="ts">
  import { onMount } from 'svelte';
  import { playClick } from '../lib/uiSounds';

  const STORAGE_KEY = 'ewluong-os-habits';

  interface Habit {
    id: string;
    label: string;
    history: Record<string, boolean>; // 'YYYY-MM-DD' -> completed
  }

  const DEFAULT_HABITS: Habit[] = [
    { id: 'h1', label: 'HYDRATION CHECK', history: {} },
    { id: 'h2', label: 'PHYSICAL SYSTEMS TEST', history: {} },
    { id: 'h3', label: 'COGNITIVE MAINTENANCE', history: {} },
    { id: 'h4', label: 'SOCIAL SYNC', history: {} },
    { id: 'h5', label: 'REST CYCLE OPTIMIZATION', history: {} },
  ];

  let habits: Habit[] = [];
  let editing = false;
  let newLabel = '';
  let showHeatmap = false;

  function todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function load(): Habit[] {
    if (typeof window === 'undefined') return DEFAULT_HABITS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed && parsed.length > 0 ? parsed : DEFAULT_HABITS;
    } catch {
      return DEFAULT_HABITS;
    }
  }

  function save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    }
  }

  function toggleHabit(id: string) {
    const today = todayKey();
    habits = habits.map(h => {
      if (h.id !== id) return h;
      const next = { ...h, history: { ...h.history } };
      next.history[today] = !next.history[today];
      return next;
    });
    playClick();
    save();
  }

  function streak(habit: Habit): number {
    let count = 0;
    const d = new Date();
    // Start from yesterday if today isn't completed yet
    if (!habit.history[todayKey()]) {
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (habit.history[key]) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }

  function addHabit() {
    if (!newLabel.trim()) return;
    habits = [...habits, { id: crypto.randomUUID(), label: newLabel.trim().toUpperCase(), history: {} }];
    newLabel = '';
    save();
  }

  function removeHabit(id: string) {
    habits = habits.filter(h => h.id !== id);
    save();
  }

  // System health: % of habits completed today
  $: today = todayKey();
  $: completedToday = habits.filter(h => h.history[today]).length;
  $: healthPct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
  $: healthColor = healthPct >= 80 ? 'var(--status-nominal)' : healthPct >= 50 ? 'var(--accent)' : 'var(--accent-dim)';

  // Heatmap: last 28 days
  $: heatmapDays = (() => {
    const days: { date: string; level: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const done = habits.filter(h => h.history[key]).length;
      const level = habits.length > 0 ? done / habits.length : 0;
      days.push({ date: key, level });
    }
    return days;
  })();

  onMount(() => {
    habits = load();
  });
</script>

<div class="habit-tracker">
  <div class="header-row">
    <span class="module-label">SYSTEM DIAGNOSTICS</span>
    <button class="edit-btn" on:click={() => editing = !editing}>
      {editing ? 'DONE' : 'EDIT'}
    </button>
  </div>

  <!-- System Integrity -->
  <div class="integrity-section">
    <div class="integrity-label">
      <span>SYSTEM INTEGRITY</span>
      <span class="integrity-pct" style="color: {healthColor}">{healthPct}%</span>
    </div>
    <div class="integrity-bar">
      <div class="integrity-fill" style="width: {healthPct}%; background: {healthColor}"></div>
    </div>
    <div class="integrity-status" style="color: {healthColor}">
      {#if healthPct >= 80}ALL SYSTEMS NOMINAL{:else if healthPct >= 50}PARTIAL DEGRADATION{:else}CRITICAL — ATTENTION REQUIRED{/if}
    </div>
  </div>

  <!-- Habit rows -->
  <div class="diagnostics">
    {#each habits as habit, i}
      {@const num = String(i + 1).padStart(3, '0')}
      {@const done = habit.history[today]}
      {@const s = streak(habit)}
      <div class="diag-row" class:completed={done}>
        <button class="diag-btn" on:click={() => toggleHabit(habit.id)}>
          <span class="diag-code">[DIAG.{num}]</span>
          <span class="diag-label">{habit.label}</span>
          <span class="diag-dots"></span>
          <span class="diag-check" class:checked={done}>{done ? '[\u2713]' : '[ ]'}</span>
        </button>
        {#if s > 0}
          <span class="streak-badge">{s}d</span>
        {/if}
        {#if editing}
          <button class="remove-btn" on:click={() => removeHabit(habit.id)}>x</button>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Add habit -->
  {#if editing}
    <div class="add-section">
      <input
        class="add-input"
        bind:value={newLabel}
        placeholder="NEW DIAGNOSTIC..."
        on:keydown={(e) => e.key === 'Enter' && addHabit()}
      />
      <button class="add-btn" on:click={addHabit}>ADD</button>
    </div>
  {/if}

  <!-- Heatmap toggle -->
  <button class="heatmap-toggle" on:click={() => showHeatmap = !showHeatmap}>
    {showHeatmap ? '\u25B2 HIDE HISTORY' : '\u25BC SHOW HISTORY'}
  </button>

  {#if showHeatmap}
    <div class="heatmap">
      <div class="heatmap-label">LAST 28 DAYS</div>
      <div class="heatmap-grid">
        {#each heatmapDays as day}
          <div
            class="heatmap-cell"
            style="opacity: {0.15 + day.level * 0.85}; background: {day.level > 0 ? (day.level >= 0.8 ? 'var(--status-nominal)' : 'var(--accent)') : 'var(--border)'}"
            title="{day.date}: {Math.round(day.level * 100)}%"
          ></div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .habit-tracker {
    font-size: var(--text-sm);
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: flicker 6s linear infinite;
  }

  .edit-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .edit-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  /* Integrity bar */
  .integrity-section {
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
  }

  .integrity-label {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    margin-bottom: var(--space-2);
  }

  .integrity-pct {
    font-variant-numeric: tabular-nums;
    font-size: var(--text-sm);
  }

  .integrity-bar {
    height: 6px;
    background: var(--border);
    border-radius: 1px;
    overflow: hidden;
    margin-bottom: var(--space-2);
  }

  .integrity-fill {
    height: 100%;
    border-radius: 1px;
    transition: width 500ms var(--ease-out);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .integrity-status {
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-align: center;
  }

  /* Diagnostic rows */
  .diagnostics {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: var(--space-4);
  }

  .diag-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .diag-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    text-align: left;
    padding: var(--space-2) var(--space-2);
    transition: background var(--transition-fast);
  }

  .diag-btn:hover {
    background: var(--bg-surface-hover);
  }

  .diag-code {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .diag-row.completed .diag-code {
    color: var(--status-nominal);
  }

  .diag-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .diag-dots {
    flex: 1;
    border-bottom: 1px dotted var(--border);
    min-width: 20px;
    margin: 0 var(--space-1);
    align-self: flex-end;
    margin-bottom: 3px;
  }

  .diag-check {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .diag-check.checked {
    color: var(--status-nominal);
    text-shadow: 0 0 6px rgba(68, 170, 136, 0.4);
  }

  .streak-badge {
    font-size: 12px;
    color: var(--accent);
    letter-spacing: 0.06em;
    flex-shrink: 0;
    min-width: 24px;
    text-align: right;
  }

  .remove-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .remove-btn:hover {
    color: var(--accent);
  }

  /* Add section */
  .add-section {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .add-input {
    flex: 1;
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-1) var(--space-2);
    text-transform: uppercase;
  }

  .add-input::placeholder {
    color: var(--text-dim);
  }

  .add-btn {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
  }

  .add-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* Heatmap */
  .heatmap-toggle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-2) 0;
    text-align: left;
    width: 100%;
    transition: color var(--transition-fast);
  }

  .heatmap-toggle:hover {
    color: var(--text-secondary);
  }

  .heatmap {
    margin-top: var(--space-2);
  }

  .heatmap-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    margin-bottom: var(--space-2);
  }

  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }

  .heatmap-cell {
    aspect-ratio: 1;
    border-radius: 2px;
    transition: opacity var(--transition-fast);
    cursor: default;
  }

  .heatmap-cell:hover {
    outline: 1px solid var(--accent-dim);
  }
</style>
