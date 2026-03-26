<script lang="ts">
  import { onMount } from 'svelte';
  import { sessionMemory, getTimeGreeting, formatTimeSince, formatDurationShort } from '../stores/temporal';
  import { weather } from '../stores/weather';

  export let blogEntries: Array<{ slug: string; title: string }> = [];
  export let onDismiss: () => void = () => {};

  let visible = false;
  let dismissed = false;

  // Daily rotating essay fragment
  $: dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
  $: dailyEssay = blogEntries.length > 0 ? blogEntries[dayOfYear % blogEntries.length] : null;

  // Habit data from localStorage
  let habitIntegrity = -1;
  let habitsTotal = 0;
  let habitsCompleted = 0;

  // Log data
  let hasLogToday = false;
  let lastLogDate = '';

  // Time data
  $: greeting = getTimeGreeting();
  $: now = new Date();
  $: dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  $: dayNum = String(Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1).padStart(3, '0');

  $: lastSessionAgo = $sessionMemory.lastVisit > 0
    ? formatTimeSince(Date.now() - $sessionMemory.lastVisit)
    : '';
  $: lastDuration = $sessionMemory.lastSessionDuration > 0
    ? formatDurationShort($sessionMemory.lastSessionDuration)
    : '';

  function loadHabitData() {
    try {
      const stored = localStorage.getItem('ewluong-os-habits');
      if (!stored) return;
      const data = JSON.parse(stored);
      if (!Array.isArray(data.habits)) return;
      const today = new Date().toISOString().slice(0, 10);
      habitsTotal = data.habits.length;
      habitsCompleted = data.habits.filter((h: { history: Record<string, boolean> }) => h.history?.[today]).length;
      habitIntegrity = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : -1;
    } catch { /* ignore */ }
  }

  function loadLogData() {
    try {
      const stored = localStorage.getItem('ewluong-os-log');
      if (!stored) return;
      const entries = JSON.parse(stored);
      if (!Array.isArray(entries) || entries.length === 0) return;
      const today = new Date().toISOString().slice(0, 10);
      hasLogToday = entries.some((e: { date: string }) => e.date === today);
      const sorted = entries.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
      lastLogDate = sorted[0]?.date ?? '';
    } catch { /* ignore */ }
  }

  function dismiss() {
    dismissed = true;
    setTimeout(onDismiss, 400);
  }

  onMount(() => {
    loadHabitData();
    loadLogData();
    // Fade in after a brief delay
    setTimeout(() => { visible = true; }, 100);
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="morning-console"
  class:visible
  class:dismissed
  on:click={dismiss}
  on:keydown={(e) => e.key === 'Escape' && dismiss()}
>
  <div class="console-inner" on:click|stopPropagation>
    <div class="console-greeting">{greeting}</div>
    <div class="console-date">{dateStr}</div>
    <div class="console-daynum">DAY {dayNum}</div>

    <div class="console-divider"></div>

    <!-- Session info -->
    {#if lastSessionAgo}
      <div class="console-row">
        <span class="row-label">LAST SESSION</span>
        <span class="row-value">{lastSessionAgo}{lastDuration ? ` / ${lastDuration}` : ''}</span>
      </div>
    {/if}

    {#if $sessionMemory.totalSessions > 1}
      <div class="console-row">
        <span class="row-label">SESSIONS</span>
        <span class="row-value">{$sessionMemory.totalSessions} total / {$sessionMemory.streakDays}d streak</span>
      </div>
    {/if}

    <!-- Weather -->
    {#if $weather.condition !== 'unknown'}
      <div class="console-row">
        <span class="row-label">WEATHER</span>
        <span class="row-value">{$weather.temp}C / {$weather.condition.toUpperCase()}{$weather.location ? ` / ${$weather.location}` : ''}</span>
      </div>
    {/if}

    <div class="console-divider"></div>

    <!-- System state -->
    {#if habitIntegrity >= 0}
      <div class="console-row">
        <span class="row-label">SYSTEM INTEGRITY</span>
        <span class="row-value" class:integrity-high={habitIntegrity > 80} class:integrity-mid={habitIntegrity >= 50 && habitIntegrity <= 80} class:integrity-low={habitIntegrity < 50}>
          {habitIntegrity}% ({habitsCompleted}/{habitsTotal})
        </span>
      </div>
    {/if}

    <div class="console-row">
      <span class="row-label">OPERATOR LOG</span>
      <span class="row-value">{hasLogToday ? 'ENTRY RECORDED' : 'NO ENTRY TODAY'}</span>
    </div>

    <!-- Daily fragment from essays -->
    {#if dailyEssay}
      <div class="console-divider"></div>
      <div class="console-fragment">
        <span class="fragment-label">FROM THE ARCHIVE</span>
        <span class="fragment-title">{dailyEssay.title}</span>
      </div>
    {/if}

    <div class="console-divider"></div>

    <button class="console-enter" on:click={dismiss}>
      ENTER SYSTEM
    </button>
  </div>
</div>

<style>
  .morning-console {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 20, 0.95);
    backdrop-filter: blur(20px);
    opacity: 0;
    transition: opacity 500ms var(--ease-out);
    cursor: pointer;
  }

  .morning-console.visible {
    opacity: 1;
  }

  .morning-console.dismissed {
    opacity: 0;
    pointer-events: none;
  }

  .console-inner {
    max-width: 480px;
    width: 100%;
    padding: var(--space-8) var(--space-8);
    cursor: default;
  }

  .console-greeting {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: var(--space-2);
    animation: flicker 6s linear infinite;
  }

  .console-date {
    font-size: var(--text-lg);
    color: var(--text-primary);
    margin-bottom: var(--space-1);
  }

  .console-daynum {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.12em;
  }

  .console-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-4) 0;
    position: relative;
  }

  .console-divider::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 1px;
    background: var(--accent-dim);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .console-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-1) 0;
    font-size: var(--text-xs);
  }

  .row-label {
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .row-value {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .integrity-high { color: var(--status-nominal); }
  .integrity-mid { color: var(--accent); }
  .integrity-low { color: var(--accent-bright); }

  .console-fragment {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .fragment-label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .fragment-title {
    font-family: var(--font-reading);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  .console-enter {
    display: block;
    width: 100%;
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.15em;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--accent-dim);
    text-align: center;
    transition: all var(--transition-fast);
  }

  .console-enter:hover {
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--accent-glow);
    text-shadow: 0 0 8px var(--accent-glow);
  }
</style>
