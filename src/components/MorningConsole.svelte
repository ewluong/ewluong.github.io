<script lang="ts">
  import { onMount } from 'svelte';
  import { sessionMemory, getTimeGreeting, formatTimeSince, formatDurationShort, sessionVector, VECTOR_AUTO_OPEN, type SessionVector, shouldShowWatcher, getWatcherQuestion, getWatcherSummary, saveWatcherEntry, type WatcherSummary } from '../stores/temporal';
  import { windowStore } from '../stores/windows';
  import { playWatcher } from '../lib/uiSounds';

  export let blogEntries: Array<{ slug: string; title: string }> = [];
  export let onDismiss: () => void = () => {};

  let visible = false;
  let dismissed = false;
  let phase: 'watcher' | 'question' | 'briefing' = 'question';
  let selectedVector: SessionVector = '';

  // Watcher state
  let watcherQuestion = '';
  let watcherSummary: WatcherSummary | null = null;
  let watcherResponse = '';
  const WATCHER_MAX_CHARS = 280;

  // Time data
  $: greeting = getTimeGreeting();
  $: now = new Date();
  $: dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  $: dayNum = String(Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1).padStart(3, '0');

  // Last session summary line
  $: lastSessionAgo = $sessionMemory.lastVisit > 0
    ? formatTimeSince(Date.now() - $sessionMemory.lastVisit)
    : '';
  $: lastDuration = $sessionMemory.lastSessionDuration > 0
    ? formatDurationShort($sessionMemory.lastSessionDuration)
    : '';
  $: lastVector = $sessionMemory.lastVector || '';
  $: lastCoherence = $sessionMemory.lastCoherence;

  const VECTORS: { id: SessionVector; label: string; desc: string }[] = [
    { id: 'WRITE', label: 'WRITE', desc: 'compose, log, capture' },
    { id: 'RESEARCH', label: 'RESEARCH', desc: 'seek, scan, aggregate' },
    { id: 'READ', label: 'READ', desc: 'essays, archives, depth' },
    { id: 'REFLECT', label: 'REFLECT', desc: 'word, habits, stillness' },
    { id: 'BUILD', label: 'BUILD', desc: 'projects, code, systems' },
    { id: 'BROWSE', label: 'BROWSE', desc: 'no fixed heading' },
  ];

  // --- Phase 2: Vector-specific briefing data ---
  interface BriefingLine { label: string; value: string }
  let briefingLines: BriefingLine[] = [];

  function loadBriefingData(vec: SessionVector): BriefingLine[] {
    const lines: BriefingLine[] = [];
    const ledger = $sessionMemory.lastLedger;

    // Cross-session memory: show relevant last session activity
    if (ledger) {
      switch (vec) {
        case 'WRITE':
          if (ledger.wordsWritten > 0) lines.push({ label: 'LAST SESSION', value: `${ledger.wordsWritten} WORDS LOGGED` });
          break;
        case 'RESEARCH':
          if (ledger.signalsRead > 0 || ledger.chatMessages > 0) {
            const parts = [];
            if (ledger.signalsRead > 0) parts.push(`${ledger.signalsRead} SIGNALS READ`);
            if (ledger.chatMessages > 0) parts.push(`${ledger.chatMessages} MAGI EXCHANGES`);
            lines.push({ label: 'LAST SESSION', value: parts.join(' / ') });
          }
          break;
        case 'REFLECT':
          if (ledger.habitsCompleted > 0) lines.push({ label: 'LAST SESSION', value: `${ledger.habitsCompleted} HABITS COMPLETED` });
          break;
        case 'BUILD':
          if (ledger.scratchpadChars > 0 || ledger.chatMessages > 0) {
            const parts = [];
            if (ledger.scratchpadChars > 0) parts.push(`${ledger.scratchpadChars} CHARS TO SCRATCHPAD`);
            if (ledger.chatMessages > 0) parts.push(`${ledger.chatMessages} MAGI EXCHANGES`);
            lines.push({ label: 'LAST SESSION', value: parts.join(' / ') });
          }
          break;
      }
    }

    switch (vec) {
      case 'WRITE': {
        // Log status
        try {
          const stored = localStorage.getItem('ewluong-os-log');
          if (stored) {
            const entries = JSON.parse(stored);
            const today = new Date().toISOString().slice(0, 10);
            const hasToday = Array.isArray(entries) && entries.some((e: { date: string }) => e.date === today);
            lines.push({ label: 'LOG', value: hasToday ? 'ENTRY RECORDED' : 'NO ENTRY TODAY' });

            // Yesterday's first line
            const sorted = entries
              .filter((e: { date: string }) => e.date < today)
              .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
            if (sorted.length > 0 && sorted[0].content) {
              const firstLine = sorted[0].content.trim().split('\n')[0].trim();
              lines.push({ label: 'YESTERDAY', value: firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine });
            }

            // Word count this week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekStr = weekAgo.toISOString().slice(0, 10);
            const weekWords = entries
              .filter((e: { date: string; wordCount?: number }) => e.date >= weekStr)
              .reduce((sum: number, e: { wordCount?: number }) => sum + (e.wordCount || 0), 0);
            if (weekWords > 0) lines.push({ label: 'WORDS THIS WEEK', value: String(weekWords) });
          } else {
            lines.push({ label: 'LOG', value: 'NO ENTRIES YET' });
          }
        } catch { lines.push({ label: 'LOG', value: 'UNAVAILABLE' }); }
        break;
      }

      case 'RESEARCH': {
        try {
          const cached = localStorage.getItem('ewluong-os-signals-cache');
          if (cached) {
            const data = JSON.parse(cached);
            const signalConfig = localStorage.getItem('ewluong-os-signals');
            const readIds = signalConfig ? new Set(JSON.parse(signalConfig).readIds || []) : new Set();
            const total = Array.isArray(data.signals) ? data.signals.length : 0;
            const unread = total - (Array.isArray(data.signals) ? data.signals.filter((s: { id: string }) => readIds.has(s.id)).length : 0);
            lines.push({ label: 'SIGNALS', value: `${unread} UNREAD / ${total} TOTAL` });
            if (data.fetchedAt) {
              lines.push({ label: 'LAST SCAN', value: formatTimeSince(Date.now() - data.fetchedAt) });
            }
          } else {
            lines.push({ label: 'SIGNALS', value: 'NO SCAN DATA' });
          }
        } catch { lines.push({ label: 'SIGNALS', value: 'UNAVAILABLE' }); }
        break;
      }

      case 'READ': {
        // Daily essay from archive
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
        if (blogEntries.length > 0) {
          const essay = blogEntries[dayOfYear % blogEntries.length];
          lines.push({ label: 'FROM THE ARCHIVE', value: essay.title });
        }
        break;
      }

      case 'REFLECT': {
        lines.push({ label: 'DAILY WORD', value: 'VERSE AWAITS' });

        // Habit integrity
        try {
          const stored = localStorage.getItem('ewluong-os-habits');
          if (stored) {
            const data = JSON.parse(stored);
            if (Array.isArray(data.habits)) {
              const today = new Date().toISOString().slice(0, 10);
              const total = data.habits.length;
              const completed = data.habits.filter((h: { history: Record<string, boolean> }) => h.history?.[today]).length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              lines.push({ label: 'INTEGRITY', value: `${pct}% (${completed}/${total})` });
            }
          }
        } catch { /* ignore */ }

        // Streak
        lines.push({ label: 'STREAK', value: `${$sessionMemory.streakDays}d` });
        break;
      }

      case 'BUILD': {
        lines.push({ label: 'PROJECTS', value: `${blogEntries.length > 0 ? '14' : '—'} INDEXED` });
        // Scratchpad tasks
        try {
          const stored = localStorage.getItem('ewluong-os-scratchpad');
          if (stored) {
            const pages = JSON.parse(stored);
            const totalChars = Array.isArray(pages) ? pages.reduce((s: number, p: { content?: string }) => s + (p.content?.length || 0), 0) : 0;
            if (totalChars > 0) lines.push({ label: 'SCRATCHPAD', value: `${Array.isArray(pages) ? pages.length : 0} PAGES / ${totalChars} CHARS` });
          }
        } catch { /* ignore */ }
        break;
      }

      case 'BROWSE':
        lines.push({ label: '', value: 'NO FIXED HEADING — PASS THROUGH WHEN READY' });
        break;
    }

    return lines;
  }

  function selectVector(v: SessionVector) {
    selectedVector = v;
    sessionVector.set(v);

    // Load vector-specific briefing data
    briefingLines = loadBriefingData(v);

    // Auto-open windows aligned with this vector
    const toOpen = VECTOR_AUTO_OPEN[v] || [];
    for (const id of toOpen) {
      windowStore.open(id);
    }

    // Transition to Phase 2
    phase = 'briefing';

    // Auto-dismiss after briefing display
    setTimeout(() => {
      dismissed = true;
      setTimeout(onDismiss, 400);
    }, 1800);
  }

  function dismiss() {
    dismissed = true;
    setTimeout(onDismiss, 400);
  }

  // Build the last session summary string
  function lastSessionSummary(): string {
    const parts: string[] = [];
    if (lastDuration) parts.push(lastDuration);
    if (lastVector) parts.push(lastVector);
    if (lastCoherence >= 0) parts.push(`${lastCoherence}% COHERENT`);
    return parts.join(' / ');
  }

  function submitWatcher() {
    if (watcherResponse.trim()) {
      saveWatcherEntry(watcherQuestion, watcherResponse.trim());
    }
    phase = 'question';
  }

  function dismissWatcher() {
    phase = 'question';
  }

  // Format duration for watcher display
  function formatWatcherDuration(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  // Build vector distribution bar for watcher
  function vectorBar(dist: Record<string, number>): Array<{ label: string; pct: number }> {
    const total = Object.values(dist).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    return Object.entries(dist)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([label, ms]) => ({ label, pct: Math.round((ms / total) * 100) }));
  }

  onMount(() => {
    // Check if Watcher should appear
    if (shouldShowWatcher()) {
      phase = 'watcher';
      watcherQuestion = getWatcherQuestion();
      watcherSummary = getWatcherSummary();
      playWatcher();
    }
    setTimeout(() => { visible = true; }, 100);
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="morning-console"
  class:visible
  class:dismissed
  on:keydown={(e) => e.key === 'Escape' && dismiss()}
>
  <div class="console-inner">
    <!-- Always visible: temporal context -->
    <div class="console-greeting">{greeting}</div>
    <div class="console-date">{dateStr}</div>
    <div class="console-daynum">DAY {dayNum}</div>

    <!-- Last session summary (single line) -->
    {#if lastSessionAgo}
      <div class="console-divider"></div>
      <div class="console-last-session">
        <span class="last-label">LAST SESSION</span>
        <span class="last-value">{lastSessionAgo}{lastSessionSummary() ? ` / ${lastSessionSummary()}` : ''}</span>
      </div>
      {#if $sessionMemory.totalSessions > 1}
        <div class="console-sessions">
          {$sessionMemory.totalSessions} sessions / {$sessionMemory.streakDays}d streak
        </div>
      {/if}
    {/if}

    <div class="console-divider"></div>

    {#if phase === 'watcher'}
      <!-- Phase 0: The Watcher -->
      <div class="watcher-section">
        <div class="watcher-title">THE WATCHER</div>

        {#if watcherSummary}
          <div class="watcher-summary">
            <div class="watcher-stat">
              {watcherSummary.sessionCount} SESSIONS / {formatWatcherDuration(watcherSummary.totalDurationMs)} TOTAL
            </div>

            {#if vectorBar(watcherSummary.vectorDistribution).length > 0}
              <div class="watcher-vectors">
                {#each vectorBar(watcherSummary.vectorDistribution) as v}
                  <span class="watcher-vector-item">
                    {v.label}
                    <span class="watcher-bar">{'█'.repeat(Math.max(1, Math.round(v.pct / 15)))}</span>
                    {v.pct}%
                  </span>
                {/each}
              </div>
            {/if}

            {#if watcherSummary.avgCoherence >= 0}
              <div class="watcher-stat">
                COHERENCE: {watcherSummary.avgCoherence}% AVG
                {#if watcherSummary.driftPattern === 'improving'}
                  <span class="watcher-trend up">↑</span>
                {:else if watcherSummary.driftPattern === 'worsening'}
                  <span class="watcher-trend down">↓</span>
                {/if}
              </div>
            {/if}

            {#if watcherSummary.mostVisitedModules.length > 0}
              <div class="watcher-stat">
                MOST VISITED: {watcherSummary.mostVisitedModules.map(m => m.replace(/-/g, ' ').toUpperCase()).join(', ')}
              </div>
            {/if}
          </div>

          {#if watcherSummary.previousWatcherEntry}
            <div class="watcher-previous">
              <div class="watcher-prev-label">LAST RESPONSE ({Math.floor((Date.now() - new Date(watcherSummary.previousWatcherEntry.date).getTime()) / 86400000)}d ago):</div>
              <div class="watcher-prev-text">"{watcherSummary.previousWatcherEntry.response}"</div>
            </div>
          {/if}
        {/if}

        <div class="console-divider"></div>

        <div class="watcher-question">"{watcherQuestion}"</div>

        <textarea
          class="watcher-input"
          bind:value={watcherResponse}
          maxlength={WATCHER_MAX_CHARS}
          placeholder="..."
          rows="3"
        ></textarea>
        <div class="watcher-charcount">{watcherResponse.length}/{WATCHER_MAX_CHARS}</div>

        <div class="watcher-actions">
          <button class="watcher-submit" on:click={submitWatcher}>SUBMIT</button>
          <button class="watcher-dismiss" on:click={dismissWatcher}>DISMISS</button>
        </div>
      </div>

    {:else if phase === 'question'}
      <!-- Phase 1: The Question -->
      <div class="vector-section">
        <div class="vector-prompt">WHAT ARE YOU HERE FOR?</div>
        <div class="vector-grid">
          {#each VECTORS as vec}
            <button
              class="vector-btn"
              on:click={() => selectVector(vec.id)}
            >
              <span class="vector-label">{vec.label}</span>
              <span class="vector-desc">{vec.desc}</span>
            </button>
          {/each}
        </div>
      </div>

      <button class="console-skip" on:click={dismiss}>
        skip — enter without vector
      </button>

    {:else}
      <!-- Phase 2: Vector Briefing -->
      <div class="briefing-section">
        <div class="briefing-header">
          <span class="briefing-vector">{selectedVector}</span>
          <span class="briefing-label">VECTOR SET</span>
        </div>

        {#if briefingLines.length > 0}
          <div class="briefing-data">
            {#each briefingLines as line}
              <div class="briefing-row">
                {#if line.label}
                  <span class="briefing-key">{line.label}</span>
                  <span class="briefing-val">{line.value}</span>
                {:else}
                  <span class="briefing-val solo">{line.value}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
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
  }

  .morning-console.visible {
    opacity: 1;
  }

  .morning-console.dismissed {
    opacity: 0;
    pointer-events: none;
  }

  .console-inner {
    max-width: 520px;
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

  /* --- Last session summary --- */
  .console-last-session {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-1) 0;
    font-size: var(--text-xs);
  }

  .last-label {
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .last-value {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .console-sessions {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: right;
    padding: var(--space-1) 0 0;
    letter-spacing: 0.04em;
  }

  /* --- Phase 1: Vector selector --- */
  .vector-section {
    margin-bottom: var(--space-4);
  }

  .vector-prompt {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.16em;
    margin-bottom: var(--space-4);
    text-align: center;
    animation: flicker 6s linear infinite;
  }

  .vector-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
  }

  .vector-btn {
    background: var(--bg-primary);
    padding: var(--space-3) var(--space-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
  }

  .vector-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.04) 50%, transparent 100%);
    background-size: 200% 100%;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .vector-btn:hover::before {
    opacity: 1;
    animation: scanSweep 2s linear infinite;
  }

  .vector-btn:hover {
    background: var(--bg-surface);
  }

  .vector-btn:hover .vector-label {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .vector-label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    letter-spacing: 0.12em;
    transition: color var(--transition-fast), text-shadow var(--transition-fast);
  }

  .vector-desc {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  .console-skip {
    display: block;
    width: 100%;
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-2) 0;
    text-align: center;
    transition: color var(--transition-fast);
    opacity: 0.5;
  }

  .console-skip:hover {
    color: var(--text-secondary);
    opacity: 0.8;
  }

  /* --- Phase 2: Vector Briefing --- */
  .briefing-section {
    animation: briefingIn 300ms var(--ease-out) forwards;
  }

  @keyframes briefingIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .briefing-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .briefing-vector {
    font-size: var(--text-lg);
    color: var(--accent);
    letter-spacing: 0.12em;
    text-shadow: 0 0 12px var(--accent-glow);
  }

  .briefing-label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .briefing-data {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .briefing-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--text-xs);
    animation: briefingIn 300ms var(--ease-out) forwards;
  }

  .briefing-row:nth-child(2) { animation-delay: 80ms; }
  .briefing-row:nth-child(3) { animation-delay: 160ms; }

  .briefing-key {
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .briefing-val {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .briefing-val.solo {
    width: 100%;
    text-align: center;
    color: var(--text-dim);
    font-style: italic;
    letter-spacing: 0.06em;
  }

  /* --- Watcher Phase --- */
  .watcher-section {
    animation: briefingIn 500ms var(--ease-out) forwards;
  }

  .watcher-title {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.2em;
    text-align: center;
    margin-bottom: var(--space-5);
    animation: flicker 6s linear infinite;
  }

  .watcher-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .watcher-stat {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    text-align: center;
  }

  .watcher-vectors {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .watcher-vector-item {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }

  .watcher-bar {
    color: var(--accent-dim);
    font-size: 10px;
    letter-spacing: -0.05em;
  }

  .watcher-trend {
    margin-left: var(--space-1);
    font-weight: bold;
  }

  .watcher-trend.up { color: var(--accent); }
  .watcher-trend.down { color: var(--text-dim); opacity: 0.6; }

  .watcher-previous {
    margin: var(--space-3) 0;
    padding: var(--space-2) var(--space-3);
    border-left: 1px solid var(--border);
    opacity: 0.5;
  }

  .watcher-prev-label {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    margin-bottom: var(--space-1);
  }

  .watcher-prev-text {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.5;
  }

  .watcher-question {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    font-style: italic;
    text-align: center;
    margin: var(--space-5) 0 var(--space-4);
    line-height: 1.5;
    letter-spacing: 0.02em;
  }

  .watcher-input {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--text-primary);
    font-family: var(--font-system);
    font-size: var(--text-xs);
    padding: var(--space-3);
    resize: none;
    line-height: 1.5;
    letter-spacing: 0.02em;
    transition: border-color var(--transition-fast);
  }

  .watcher-input:focus {
    outline: none;
    border-color: var(--accent-dim);
  }

  .watcher-input::placeholder {
    color: var(--text-dim);
    opacity: 0.4;
  }

  .watcher-charcount {
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
    margin-top: var(--space-1);
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
  }

  .watcher-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .watcher-submit,
  .watcher-dismiss {
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    padding: var(--space-2) var(--space-4);
    transition: all var(--transition-fast);
  }

  .watcher-submit {
    color: var(--accent);
    border: 1px solid var(--accent-dim);
    background: transparent;
  }

  .watcher-submit:hover {
    background: rgba(212, 160, 68, 0.08);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .watcher-dismiss {
    color: var(--text-dim);
    border: 1px solid var(--border);
    background: transparent;
    opacity: 0.5;
  }

  .watcher-dismiss:hover {
    opacity: 0.8;
    color: var(--text-secondary);
  }
</style>
