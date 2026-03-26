<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const STORAGE_KEY = 'ewluong-os-log';

  interface LogEntry {
    date: string; // YYYY-MM-DD
    content: string;
    wordCount: number;
  }

  let entries: LogEntry[] = [];
  let currentDate = '';
  let currentContent = '';
  let showPrevious = false;
  let saveTimeout: ReturnType<typeof setTimeout>;

  function todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function dayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  }

  function loadEntries(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveEntries() {
    if (typeof window === 'undefined') return;
    // Update current entry
    const idx = entries.findIndex(e => e.date === currentDate);
    const wordCount = currentContent.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (idx >= 0) {
      entries[idx] = { date: currentDate, content: currentContent, wordCount };
    } else {
      entries = [{ date: currentDate, content: currentContent, wordCount }, ...entries];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function handleInput() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveEntries, 500); // debounce 500ms
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${days[d.getDay()]} ${dateStr}`;
  }

  function exportLog() {
    const text = entries
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e => `## ${e.date}\n${e.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
  }

  onMount(() => {
    entries = loadEntries();
    currentDate = todayKey();

    const existing = entries.find(e => e.date === currentDate);
    if (existing) {
      currentContent = existing.content;
    }
  });

  onDestroy(() => {
    clearTimeout(saveTimeout);
    // Final save
    saveEntries();
  });

  $: previousEntries = entries
    .filter(e => e.date !== currentDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  $: wordCount = currentContent.trim().split(/\s+/).filter(w => w.length > 0).length;
  $: entryNumber = String(dayOfYear()).padStart(3, '0');
  $: totalEntries = entries.length;
</script>

<div class="daily-log">
  <div class="header-row">
    <span class="module-label">OPERATOR LOG</span>
    <button class="export-btn" on:click={exportLog} title="Copy all entries to clipboard">
      EXPORT
    </button>
  </div>

  <div class="entry-header">
    ENTRY #{entryNumber} — {currentDate}
  </div>

  <textarea
    class="log-textarea"
    bind:value={currentContent}
    on:input={handleInput}
    placeholder="> begin log entry..."
    spellcheck="false"
  ></textarea>

  <div class="entry-footer">
    <span class="word-count">{wordCount} words</span>
    <span class="total-entries">{totalEntries} total entries</span>
  </div>

  {#if previousEntries.length > 0}
    <button class="previous-toggle" on:click={() => showPrevious = !showPrevious}>
      {showPrevious ? '▼' : '▶'} PREVIOUS ENTRIES ({previousEntries.length})
    </button>

    {#if showPrevious}
      <div class="previous-entries">
        {#each previousEntries as entry}
          <div class="prev-entry">
            <div class="prev-header">
              ENTRY — {formatDate(entry.date)}
              <span class="prev-words">{entry.wordCount} words</span>
            </div>
            <div class="prev-content">{entry.content}</div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .daily-log {
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: flicker 6s linear infinite;
  }

  .export-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .export-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .entry-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
    position: relative;
  }

  .entry-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 1px;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .log-textarea {
    width: 100%;
    min-height: 180px;
    flex: 1;
    font-family: var(--font-system);
    font-size: var(--text-sm);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-3);
    resize: vertical;
    line-height: 1.7;
  }

  .log-textarea::placeholder {
    color: var(--text-dim);
  }

  .log-textarea:focus {
    outline: none;
    border-color: var(--accent-dim);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .entry-footer {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  .previous-toggle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    margin-top: var(--space-4);
    padding: var(--space-2) 0;
    text-align: left;
    transition: color var(--transition-fast);
  }

  .previous-toggle:hover {
    color: var(--text-secondary);
  }

  .previous-entries {
    margin-top: var(--space-2);
    max-height: 300px;
    overflow-y: auto;
  }

  .prev-entry {
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
  }

  .prev-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .prev-words {
    color: var(--text-dim);
  }

  .prev-content {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: pre-wrap;
    line-height: 1.6;
  }
</style>
