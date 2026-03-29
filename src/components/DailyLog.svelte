<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { updateLedger } from '../stores/temporal';

  const STORAGE_KEY = 'ewluong-os-log';

  interface LogEntry {
    date: string; // YYYY-MM-DD
    content: string;
    wordCount: number;
  }

  // --- State ---
  let entries: LogEntry[] = [];
  let activeDate = '';
  let currentContent = '';
  let saveTimeout: ReturnType<typeof setTimeout>;
  let backupInterval: ReturnType<typeof setInterval>;
  let lastSavedWordCount = 0;
  let editorEl: HTMLDivElement;

  // UI state
  let sidebarOpen = false;
  let searchQuery = '';
  let searchInputEl: HTMLInputElement;
  let focusMode = false;
  let contentDirty = false;
  let saveState: 'idle' | 'saving' | 'saved' = 'idle';
  let saveIndicatorTimeout: ReturnType<typeof setTimeout>;
  let lastMilestone = 0;
  let milestoneFlash = false;
  let milestoneTimeout: ReturnType<typeof setTimeout>;
  let writingLineHeight = 0;
  let writingLineVisible = false;
  let writingLineTimeout: ReturnType<typeof setTimeout>;
  let clockText = '';
  let clockInterval: ReturnType<typeof setInterval>;

  // --- Helpers ---

  function todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function dayOfYear(dateStr?: string): number {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${days[d.getDay()]} ${dateStr}`;
  }

  function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    return `${days[d.getDay()]} ${dateStr.slice(5)}`; // e.g. "MO 03-28"
  }

  function firstLine(content: string): string {
    const line = content.trim().split('\n')[0] || '';
    return line.length > 50 ? line.slice(0, 50) + '...' : line;
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  function updateClock() {
    clockText = new Date().toTimeString().slice(0, 5); // HH:MM
  }

  // --- Persistence ---

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

    const idx = entries.findIndex(e => e.date === activeDate);
    const wc = countWords(currentContent);

    if (idx >= 0) {
      entries[idx] = { date: activeDate, content: currentContent, wordCount: wc };
    } else if (currentContent.trim()) {
      entries = [{ date: activeDate, content: currentContent, wordCount: wc }, ...entries];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    // Ledger integration: only count words for today's entry
    if (activeDate === todayKey()) {
      const delta = wc - lastSavedWordCount;
      if (delta > 0) updateLedger('wordsWritten', delta);
      lastSavedWordCount = wc;
    }

    contentDirty = false;

    // Save indicator
    saveState = 'saving';
    clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => { saveState = 'saved'; }, 150);
    setTimeout(() => { if (saveState === 'saved') saveState = 'idle'; }, 1500);
  }

  function handleInput() {
    // Sync content from contenteditable — lightweight, no string processing
    if (editorEl) {
      currentContent = editorEl.innerText;
    }
    contentDirty = true;

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveEntries, 500);

    // Writing line: show while typing (uses cached wordCount from reactive, not recalculated here)
    writingLineVisible = true;
    clearTimeout(writingLineTimeout);
    writingLineTimeout = setTimeout(() => { writingLineVisible = false; }, 5000);
  }

  function handleKeydown(e: KeyboardEvent) {
    // Tab key: insert 2 spaces
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      return;
    }

    // Ctrl+S: force save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      clearTimeout(saveTimeout);
      saveEntries();
      return;
    }

    // F11 or Ctrl+Shift+F: toggle focus mode
    if (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F')) {
      e.preventDefault();
      toggleFocusMode();
      return;
    }

    // Escape: exit focus mode
    if (e.key === 'Escape' && focusMode) {
      e.preventDefault();
      focusMode = false;
      return;
    }

    // Ctrl+E: toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      sidebarOpen = !sidebarOpen;
      if (sidebarOpen && searchInputEl) {
        tick().then(() => searchInputEl?.focus());
      }
      return;
    }

    // Ctrl+F: open sidebar with search focused
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      sidebarOpen = true;
      tick().then(() => searchInputEl?.focus());
      return;
    }

    // Ctrl+[: previous entry
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault();
      navigateEntry(-1);
      return;
    }

    // Ctrl+]: next entry
    if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault();
      navigateEntry(1);
      return;
    }

    // Ctrl+D: jump to today
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      loadEntry(todayKey());
      return;
    }
  }

  // Paste handler: strip formatting for contenteditable
  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  // --- Entry navigation ---

  function loadEntry(date: string) {
    // Save current entry first
    if (currentContent.trim() || entries.some(e => e.date === activeDate)) {
      clearTimeout(saveTimeout);
      saveEntries();
    }

    activeDate = date;
    const entry = entries.find(e => e.date === date);
    currentContent = entry?.content || '';
    lastSavedWordCount = entry?.wordCount || 0;
    lastMilestone = 0;

    // Sync to contenteditable
    tick().then(() => {
      if (editorEl) {
        editorEl.innerText = currentContent;
        editorEl.focus();
      }
    });
  }

  function navigateEntry(direction: number) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const currentIdx = sorted.findIndex(e => e.date === activeDate);

    // If viewing today and it has no entry yet, treat it as the last position
    if (currentIdx === -1 && direction < 0 && sorted.length > 0) {
      loadEntry(sorted[sorted.length - 1].date);
      return;
    }

    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < sorted.length) {
      loadEntry(sorted[nextIdx].date);
    } else if (direction > 0 && activeDate !== todayKey()) {
      loadEntry(todayKey());
    }
  }

  // --- Milestones ---

  const MILESTONES = [50, 100, 200, 300, 500, 750, 1000];

  function checkMilestone(wc: number) {
    for (const m of MILESTONES) {
      if (wc >= m && lastMilestone < m) {
        lastMilestone = m;
        milestoneFlash = true;
        clearTimeout(milestoneTimeout);
        milestoneTimeout = setTimeout(() => { milestoneFlash = false; }, 400);
        break;
      }
    }
  }

  // --- Focus mode ---

  function toggleFocusMode() {
    focusMode = !focusMode;
    if (focusMode) {
      tick().then(() => {
        // Re-focus editor in focus mode overlay
        const focusEditor = document.querySelector('.focus-editor') as HTMLDivElement;
        if (focusEditor) {
          focusEditor.innerText = currentContent;
          focusEditor.focus();
          // Place cursor at end
          const range = document.createRange();
          range.selectNodeContents(focusEditor);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    } else {
      // Sync back from focus editor
      tick().then(() => {
        if (editorEl) {
          editorEl.innerText = currentContent;
        }
      });
    }
  }

  function handleFocusInput() {
    const el = document.querySelector('.focus-editor') as HTMLDivElement;
    if (el) {
      currentContent = el.innerText;
    }
    handleInput();
  }

  // --- Export ---

  function exportClipboard() {
    const text = entries
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e => `## ${e.date}\n${e.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
  }

  function exportDownload() {
    const text = entries
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(e => `## ${e.date}\n${e.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'operator-log.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyEntry(entry: LogEntry) {
    navigator.clipboard.writeText(`## ${entry.date}\n${entry.content}`);
  }

  // --- Lifecycle ---

  onMount(() => {
    entries = loadEntries();
    activeDate = todayKey();

    const existing = entries.find(e => e.date === activeDate);
    if (existing) {
      currentContent = existing.content;
      lastSavedWordCount = existing.wordCount;
    }

    // Sync initial content to contenteditable
    tick().then(() => {
      if (editorEl) {
        editorEl.innerText = currentContent;
      }
    });

    // 10-second backup save — only if content changed since last save
    backupInterval = setInterval(() => {
      if (contentDirty) {
        if (editorEl) currentContent = editorEl.innerText;
        saveEntries();
        contentDirty = false;
      }
    }, 10000);

    // Clock for focus mode
    updateClock();
    clockInterval = setInterval(updateClock, 30000);

    // beforeunload safety
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  function handleBeforeUnload() {
    if (editorEl) currentContent = editorEl.innerText;
    clearTimeout(saveTimeout);
    saveEntries();
  }

  onDestroy(() => {
    clearTimeout(saveTimeout);
    clearTimeout(saveIndicatorTimeout);
    clearTimeout(milestoneTimeout);
    clearTimeout(writingLineTimeout);
    clearInterval(backupInterval);
    clearInterval(clockInterval);
    if (editorEl) currentContent = editorEl.innerText;
    saveEntries();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  });

  // --- Reactive ---

  $: sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  $: filteredEntries = searchQuery
    ? sortedEntries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedEntries;
  $: wordCount = countWords(currentContent);
  $: writingLineHeight = Math.min(100, wordCount * 0.4);
  $: checkMilestone(wordCount);
  $: entryNumber = String(dayOfYear(activeDate)).padStart(3, '0');
  $: totalEntries = entries.length;
  $: isToday = activeDate === todayKey();
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="daily-log" on:keydown={handleKeydown}>
  <!-- Header -->
  <div class="header-row">
    <span class="module-label">OPERATOR LOG</span>
    <div class="header-actions">
      <button class="header-btn" on:click={() => sidebarOpen = !sidebarOpen} title="Toggle entries (Ctrl+E)">
        {sidebarOpen ? '◀' : '▶'} ENTRIES
      </button>
      <button class="header-btn" on:click={toggleFocusMode} title="Focus mode (F11)">
        FOCUS
      </button>
      <button class="header-btn" on:click={exportClipboard} title="Copy all to clipboard">
        COPY
      </button>
      <button class="header-btn" on:click={exportDownload} title="Download as .md file">
        SAVE
      </button>
    </div>
  </div>

  <div class="log-body" class:sidebar-open={sidebarOpen}>
    <!-- Sidebar: Entry navigation -->
    {#if sidebarOpen}
      <div class="sidebar">
        <div class="sidebar-search">
          <input
            bind:this={searchInputEl}
            bind:value={searchQuery}
            class="search-input"
            placeholder="search..."
            spellcheck="false"
          />
        </div>
        <div class="sidebar-entries">
          {#each filteredEntries as entry (entry.date)}
            <button
              class="sidebar-entry"
              class:active={entry.date === activeDate}
              class:today={entry.date === todayKey()}
              on:click={() => { loadEntry(entry.date); }}
            >
              <div class="entry-row-top">
                <span class="entry-date">{formatDateShort(entry.date)}</span>
                <span class="entry-words">{entry.wordCount}w</span>
              </div>
              <div class="entry-preview">{firstLine(entry.content)}</div>
            </button>
          {/each}
          {#if filteredEntries.length === 0}
            <div class="sidebar-empty">{searchQuery ? 'NO MATCHES' : 'NO ENTRIES'}</div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Editor area -->
    <div class="editor-area">
      <div class="entry-header">
        <span>ENTRY #{entryNumber} — {activeDate}</span>
        {#if !isToday}
          <button class="today-btn" on:click={() => loadEntry(todayKey())}>TODAY</button>
        {/if}
      </div>

      <!-- Writing line ambient cue -->
      {#if writingLineVisible}
        <div class="writing-line" style="height: {writingLineHeight}%"></div>
      {/if}

      <!-- The writing surface -->
      <div
        bind:this={editorEl}
        class="log-editor"
        contenteditable="plaintext-only"
        spellcheck="false"
        on:input={handleInput}
        on:paste={handlePaste}
        role="textbox"
        aria-label="Log entry editor"
        data-placeholder="> begin log entry..."
      ></div>

      <div class="entry-footer">
        <span class="word-count" class:milestone={milestoneFlash}>{wordCount} words</span>
        <span class="save-indicator">
          <span class="save-dot" class:saving={saveState === 'saving'} class:saved={saveState === 'saved'}></span>
          {totalEntries} entries
        </span>
      </div>
    </div>
  </div>
</div>

<!-- Focus Mode Overlay -->
{#if focusMode}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="focus-overlay" on:keydown={handleKeydown}>
    <div class="focus-chrome-top">
      <span class="focus-entry-header">ENTRY #{entryNumber} — {activeDate}</span>
      <button class="focus-exit" on:click={() => focusMode = false} title="Exit focus (Escape)">ESC</button>
    </div>

    <div class="focus-writing-area">
      {#if writingLineVisible}
        <div class="writing-line focus-writing-line" style="height: {writingLineHeight}%"></div>
      {/if}
      <div
        class="focus-editor"
        contenteditable="plaintext-only"
        spellcheck="false"
        on:input={handleFocusInput}
        on:paste={handlePaste}
        role="textbox"
        aria-label="Log entry editor (focus mode)"
        data-placeholder="> begin log entry..."
      ></div>
    </div>

    <div class="focus-chrome-bottom">
      <span class="focus-clock">{clockText}</span>
      <span class="focus-wordcount" class:milestone={milestoneFlash}>{wordCount} words</span>
    </div>
  </div>
{/if}

<style>
  .daily-log {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-size: var(--text-sm);
  }

  /* --- Header --- */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
    flex-shrink: 0;
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: flicker 6s linear infinite;
  }

  .header-actions {
    display: flex;
    gap: var(--space-1);
  }

  .header-btn {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .header-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  /* --- Log body: sidebar + editor --- */
  .log-body {
    display: flex;
    flex: 1;
    min-height: 0;
    gap: 0;
    overflow: hidden;
  }

  /* --- Sidebar --- */
  .sidebar {
    width: 200px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-search {
    padding: var(--space-2);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .search-input {
    width: 100%;
    font-family: var(--font-system);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-1) var(--space-2);
    caret-color: var(--accent);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-dim);
  }

  .search-input::placeholder {
    color: var(--text-dim);
    opacity: 0.5;
  }

  .sidebar-entries {
    flex: 1;
    overflow-y: auto;
  }

  .sidebar-entry {
    display: block;
    width: 100%;
    padding: var(--space-2);
    border-bottom: 1px solid var(--border);
    text-align: left;
    transition: background var(--transition-fast);
    border-left: 2px solid transparent;
  }

  .sidebar-entry:hover {
    background: var(--bg-surface-hover);
  }

  .sidebar-entry.active {
    border-left-color: var(--accent);
    background: var(--bg-surface);
  }

  .sidebar-entry.today .entry-date {
    color: var(--accent);
  }

  .entry-row-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }

  .entry-date {
    font-size: 12px;
    color: var(--accent-dim);
    letter-spacing: 0.04em;
    font-family: var(--font-system);
  }

  .entry-words {
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }

  .entry-preview {
    font-size: 12px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-reading);
    line-height: 1.4;
  }

  .sidebar-empty {
    padding: var(--space-4) var(--space-2);
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
    letter-spacing: 0.08em;
  }

  /* --- Editor area --- */
  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
  }

  .entry-header {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: 0 var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
    position: relative;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .entry-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: var(--space-3);
    width: 30px;
    height: 1px;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .today-btn {
    font-size: 12px;
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    padding: 0 var(--space-1);
    transition: color var(--transition-fast);
  }

  .today-btn:hover {
    color: var(--accent);
  }

  /* --- Writing line (live palimpsest indicator) --- */
  .writing-line {
    position: absolute;
    left: var(--space-2);
    top: 60px;
    width: 1px;
    background: var(--accent);
    opacity: 0.06;
    transition: height 500ms var(--ease-out), opacity 2s var(--ease-out);
    pointer-events: none;
    z-index: 1;
  }

  /* --- The writing surface --- */
  .log-editor {
    flex: 1;
    min-height: 0;
    font-family: var(--font-reading);
    font-size: 16px;
    color: var(--text-primary);
    background: var(--bg-primary);
    padding: var(--space-4) var(--space-6);
    line-height: 1.8;
    width: 100%;
    caret-color: var(--accent);
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
    outline: none;
    border: 1px solid var(--border);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    font-feature-settings: 'liga' 0;
    text-rendering: optimizeLegibility;
  }

  .log-editor:focus {
    border-color: var(--accent-dim);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .log-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--text-dim);
    opacity: 0.5;
    pointer-events: none;
  }

  .log-editor::selection {
    background: rgba(212, 160, 68, 0.15);
  }

  /* --- Footer --- */
  .entry-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-2);
    padding: 0 var(--space-3);
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .word-count {
    transition: color 300ms var(--ease-out);
    font-variant-numeric: tabular-nums;
  }

  .word-count.milestone {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .save-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .save-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-dim);
    opacity: 0.3;
    transition: all 300ms;
  }

  .save-dot.saving {
    background: var(--accent);
    opacity: 1;
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .save-dot.saved {
    background: var(--accent-dim);
    opacity: 0.6;
  }

  /* ===================================
     FOCUS MODE OVERLAY
     =================================== */
  .focus-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    animation: focusFadeIn 500ms var(--ease-out) forwards;
  }

  @keyframes focusFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .focus-chrome-top {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-4) var(--space-8);
    position: relative;
    flex-shrink: 0;
  }

  .focus-entry-header {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    opacity: 0.7;
  }

  .focus-exit {
    position: absolute;
    right: var(--space-8);
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    opacity: 0.2;
    letter-spacing: 0.1em;
    padding: var(--space-1) var(--space-2);
    transition: opacity var(--transition-fast);
  }

  .focus-exit:hover {
    opacity: 0.7;
    color: var(--accent-dim);
  }

  .focus-writing-area {
    flex: 1;
    display: flex;
    justify-content: center;
    overflow-y: auto;
    position: relative;
  }

  .focus-writing-line {
    left: calc(50% - 33ch);
  }

  .focus-editor {
    width: 100%;
    max-width: 65ch;
    font-family: var(--font-reading);
    font-size: 16px;
    color: var(--text-primary);
    background: transparent;
    padding: var(--space-8) var(--space-6) var(--space-16);
    line-height: 1.8;
    caret-color: var(--accent);
    white-space: pre-wrap;
    word-wrap: break-word;
    outline: none;
    border: none;
    font-feature-settings: 'liga' 0;
    text-rendering: optimizeLegibility;
  }

  .focus-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--text-dim);
    opacity: 0.4;
    pointer-events: none;
  }

  .focus-editor::selection {
    background: rgba(212, 160, 68, 0.15);
  }

  .focus-chrome-bottom {
    display: flex;
    justify-content: space-between;
    padding: var(--space-3) var(--space-8);
    flex-shrink: 0;
  }

  .focus-clock {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    opacity: 0.3;
    font-variant-numeric: tabular-nums;
  }

  .focus-wordcount {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
    transition: color 300ms var(--ease-out);
  }

  .focus-wordcount.milestone {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  /* --- Reduced motion --- */
  @media (prefers-reduced-motion: reduce) {
    .focus-overlay {
      animation: none;
      opacity: 1;
    }
    .module-label {
      animation: none;
    }
    .writing-line {
      transition: none;
    }
  }
</style>
