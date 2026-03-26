<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { bootTime } from '../stores/system';

  const STORAGE_KEY = 'ewluong-os-lifetime';

  interface LifetimeData {
    birthday: string; // YYYY-MM-DD
    totalVisits: number;
    totalRuntimeMs: number;
    longestSessionMs: number;
    firstVisit: string;
  }

  let lifetime: LifetimeData = {
    birthday: '',
    totalVisits: 0,
    totalRuntimeMs: 0,
    longestSessionMs: 0,
    firstVisit: '',
  };

  let birthdayInput = '';
  let editingBirthday = false;
  let tickInterval: ReturnType<typeof setInterval>;
  let sessionStart = Date.now();
  let lastTick = Date.now();

  // Live ticking values
  let ageStr = '';
  let heartbeats = '';
  let yearProgress = 0;
  let weekProgress = 0;
  let dayProgress = 0;
  let sessionTime = '';
  let totalRuntime = '';

  function loadLifetime(): LifetimeData {
    if (typeof window === 'undefined') return lifetime;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : lifetime;
    } catch {
      return lifetime;
    }
  }

  function saveLifetime() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lifetime));
    }
  }

  function setBirthday() {
    if (!birthdayInput) return;
    lifetime.birthday = birthdayInput;
    editingBirthday = false;
    saveLifetime();
  }

  function computeAge(birthday: string): string {
    if (!birthday) return '—';
    const born = new Date(birthday + 'T00:00:00');
    if (isNaN(born.getTime())) return '—';
    const now = new Date();

    let years = now.getFullYear() - born.getFullYear();
    let months = now.getMonth() - born.getMonth();
    let days = now.getDate() - born.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMs = now.getTime() - born.getTime();
    const totalSeconds = Math.floor(totalMs / 1000);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${years}y ${String(months).padStart(2, '0')}m ${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  function computeHeartbeats(birthday: string): string {
    if (!birthday) return '—';
    const born = new Date(birthday + 'T00:00:00');
    if (isNaN(born.getTime())) return '—';
    const now = new Date();
    const minutes = (now.getTime() - born.getTime()) / 60000;
    const beats = Math.floor(minutes * 72); // avg 72 bpm
    return beats.toLocaleString('en-US');
  }

  function formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m`;
  }

  function tick() {
    const now = new Date();

    // Age
    ageStr = computeAge(lifetime.birthday);
    heartbeats = computeHeartbeats(lifetime.birthday);

    // Year progress
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    yearProgress = (now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime()) * 100;

    // Week progress (Mon = 0)
    const day = (now.getDay() + 6) % 7; // Mon=0
    const weekMs = (day * 86400 + now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
    weekProgress = weekMs / (7 * 86400000) * 100;

    // Day progress
    dayProgress = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400 * 100;

    // Session time
    const elapsed = Date.now() - sessionStart;
    sessionTime = formatDuration(elapsed);

    // Update longest session
    if (elapsed > lifetime.longestSessionMs) {
      lifetime.longestSessionMs = elapsed;
    }

    // Total runtime (use actual elapsed time to avoid drift)
    const now2 = Date.now();
    lifetime.totalRuntimeMs += now2 - lastTick;
    lastTick = now2;
    totalRuntime = formatDuration(lifetime.totalRuntimeMs);

    // Save every 30 seconds
    if (Math.floor(elapsed / 1000) % 30 === 0) {
      saveLifetime();
    }
  }

  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  onMount(() => {
    lifetime = loadLifetime();
    lifetime.totalVisits++;
    if (!lifetime.firstVisit) {
      lifetime.firstVisit = new Date().toISOString().slice(0, 10);
    }
    birthdayInput = lifetime.birthday;
    sessionStart = Date.now();
    saveLifetime();

    tick();
    tickInterval = setInterval(tick, 1000);
  });

  onDestroy(() => {
    clearInterval(tickInterval);
    saveLifetime();
  });

  $: dayName = DAYS[(new Date().getDay() + 6) % 7];
</script>

<div class="life-counters">
  <div class="module-label">RUNTIME STATISTICS</div>

  <!-- Operator Age -->
  <div class="section">
    <div class="section-header">OPERATOR AGE</div>
    {#if lifetime.birthday}
      <div class="age-display">{ageStr}</div>
      <div class="heartbeats">EST. HEARTBEATS: {heartbeats}</div>
    {:else if editingBirthday}
      <div class="birthday-form">
        <input
          type="date"
          class="birthday-input"
          bind:value={birthdayInput}
          on:keydown={(e) => e.key === 'Enter' && setBirthday()}
        />
        <button class="set-btn" on:click={setBirthday}>SET</button>
      </div>
    {:else}
      <button class="set-birthday-btn" on:click={() => editingBirthday = true}>
        SET BIRTHDAY TO ENABLE
      </button>
    {/if}
  </div>

  <!-- Progress Bars -->
  <div class="section">
    <div class="section-header">TEMPORAL PROGRESS</div>

    <div class="progress-row">
      <span class="progress-label">YEAR</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {yearProgress}%"></div>
      </div>
      <span class="progress-pct">{yearProgress.toFixed(1)}%</span>
    </div>

    <div class="progress-row">
      <span class="progress-label">WEEK</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {weekProgress}%"></div>
      </div>
      <span class="progress-pct">{weekProgress.toFixed(1)}%</span>
    </div>

    <div class="progress-row">
      <span class="progress-label">DAY</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {dayProgress}%"></div>
      </div>
      <span class="progress-pct">{dayProgress.toFixed(1)}% ({dayName})</span>
    </div>
  </div>

  <!-- Site Runtime -->
  <div class="section">
    <div class="section-header">SITE METRICS</div>

    <div class="metric-row">
      <span class="metric-key">TOTAL RUNTIME</span>
      <span class="metric-val">{totalRuntime}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">TOTAL VISITS</span>
      <span class="metric-val">{lifetime.totalVisits}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">LONGEST SESSION</span>
      <span class="metric-val">{formatDuration(lifetime.longestSessionMs)}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">CURRENT SESSION</span>
      <span class="metric-val">{sessionTime}</span>
    </div>
    {#if lifetime.firstVisit}
      <div class="metric-row">
        <span class="metric-key">FIRST VISIT</span>
        <span class="metric-val">{lifetime.firstVisit}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .life-counters {
    font-size: var(--text-sm);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-4);
    animation: flicker 6s linear infinite;
  }

  .section {
    margin-bottom: var(--space-6);
  }

  .section-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
    position: relative;
  }

  .section-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 1px;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .age-display {
    font-size: var(--text-lg);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    margin-bottom: var(--space-2);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .heartbeats {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
  }

  .birthday-form {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .birthday-input {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-1) var(--space-2);
  }

  .set-btn {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
  }

  .set-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .set-birthday-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .set-birthday-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  /* Progress bars */
  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .progress-label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    min-width: 50px;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 1px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-dim);
    border-radius: 1px;
    transition: width 1s linear;
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .progress-pct {
    font-size: var(--text-xs);
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    min-width: 120px;
    text-align: right;
  }

  /* Metrics */
  .metric-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) 0;
    font-size: var(--text-xs);
  }

  .metric-key {
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  .metric-val {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
