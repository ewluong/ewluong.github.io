<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  /** Chapters available */
  export let chapters: Array<{ id: string; title: string; source: string }> = [
    { id: '1', title: 'Chapter I', source: '/backrooms/backrooms1.txt' },
    { id: '2', title: 'Chapter II', source: '/backrooms/backrooms2.txt' },
    { id: '3', title: 'Chapter III', source: '/backrooms/backrooms3.txt' },
  ];

  let selectedChapter = chapters[0];
  let lines: string[] = [];
  let displayedLines: string[] = [];
  let currentLineIndex = 0;
  let currentCharIndex = 0;
  let currentPartialLine = '';
  let isTyping = false;
  let typeInterval: ReturnType<typeof setInterval> | null = null;
  let container: HTMLDivElement;
  let immersive = false;

  // Search state
  let searchQuery = '';
  let searchResults: number[] = [];
  let currentSearchIndex = -1;

  const CHAR_DELAY = 25; // ms per character (controlled, atmospheric)
  const LINE_PAUSE = 300; // ms pause between lines

  async function loadChapter(chapter: typeof chapters[0]) {
    stopTyping();
    selectedChapter = chapter;
    displayedLines = [];
    currentLineIndex = 0;
    currentCharIndex = 0;
    currentPartialLine = '';
    searchQuery = '';
    searchResults = [];

    try {
      const res = await fetch(chapter.source);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length === 0) lines = ['[empty chapter]'];
      startTyping();
    } catch {
      lines = ['[error loading chapter]'];
      displayedLines = lines;
    }
  }

  function startTyping() {
    if (isTyping) return;
    isTyping = true;

    typeInterval = setInterval(() => {
      if (currentLineIndex >= lines.length) {
        stopTyping();
        return;
      }

      const line = lines[currentLineIndex];
      if (currentCharIndex < line.length) {
        currentPartialLine = line.substring(0, currentCharIndex + 1);
        currentCharIndex++;
      } else {
        // Line complete, move to next
        displayedLines = [...displayedLines, line];
        currentPartialLine = '';
        currentLineIndex++;
        currentCharIndex = 0;

        // Auto-scroll
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        }

        // Brief pause between lines
        if (typeInterval) {
          clearInterval(typeInterval);
          typeInterval = null;
          isTyping = false;
          setTimeout(() => startTyping(), LINE_PAUSE);
        }
      }
    }, CHAR_DELAY);
  }

  function stopTyping() {
    isTyping = false;
    if (typeInterval) {
      clearInterval(typeInterval);
      typeInterval = null;
    }
  }

  function skipToEnd() {
    stopTyping();
    displayedLines = [...lines];
    currentPartialLine = '';
    currentLineIndex = lines.length;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  function toggleImmersive() {
    immersive = !immersive;
  }

  function handleSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      currentSearchIndex = -1;
      return;
    }
    const q = searchQuery.toLowerCase();
    searchResults = displayedLines
      .map((line, i) => (line.toLowerCase().includes(q) ? i : -1))
      .filter(i => i >= 0);
    currentSearchIndex = searchResults.length > 0 ? 0 : -1;
    scrollToResult();
  }

  function nextResult() {
    if (searchResults.length === 0) return;
    currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
    scrollToResult();
  }

  function scrollToResult() {
    if (currentSearchIndex < 0 || !container) return;
    const lineEls = container.querySelectorAll('.backrooms-line');
    const target = lineEls[searchResults[currentSearchIndex]];
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatLine(line: string): string {
    // Escape HTML first, then apply safe span formatting
    const escaped = escapeHtml(line);
    return escaped
      .replace(
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - INFO - )(Model [AB]):/,
        '<span class="timestamp">$1</span><span class="speaker">$2</span>:'
      )
      .replace(
        /^\[(Model [AB])\]:/,
        '<span class="speaker">[$1]</span>:'
      )
      .replace(
        /^(INIT:)/,
        '<span class="speaker init">$1</span>'
      );
  }

  onMount(() => {
    loadChapter(chapters[0]);
  });

  onDestroy(() => {
    stopTyping();
  });
</script>

<div class="backrooms" class:immersive>
  <!-- VCR noise overlay -->
  <div class="vcr-overlay"></div>

  <!-- Header -->
  <div class="backrooms-header">
    <div class="header-left">
      <span class="backrooms-label">INFINITE BACKROOMS</span>
      <span class="backrooms-desc">
        Two LLMs in perpetual existential dialogue.
      </span>
    </div>
    <div class="header-controls">
      <button class="ctrl" on:click={toggleImmersive}>
        {immersive ? 'windowed' : 'immerse'}
      </button>
      <button class="ctrl" on:click={skipToEnd}>
        skip >>
      </button>
    </div>
  </div>

  <!-- Chapter selector -->
  <div class="chapter-bar">
    {#each chapters as ch}
      <button
        class="chapter-btn"
        class:active={selectedChapter.id === ch.id}
        on:click={() => loadChapter(ch)}
      >
        {ch.title}
      </button>
    {/each}
  </div>

  <!-- Search -->
  <div class="search-bar">
    <input
      type="text"
      bind:value={searchQuery}
      on:input={handleSearch}
      placeholder="search conversation..."
      class="search-input"
    />
    {#if searchResults.length > 0}
      <button class="ctrl" on:click={nextResult}>
        {currentSearchIndex + 1}/{searchResults.length}
      </button>
    {/if}
  </div>

  <!-- Dialogue viewport -->
  <div class="backrooms-viewport" bind:this={container}>
    {#each displayedLines as line, i}
      <div
        class="backrooms-line"
        class:highlighted={searchResults.includes(i) && i === searchResults[currentSearchIndex]}
      >
        {@html formatLine(line)}
      </div>
    {/each}

    <!-- Currently typing line -->
    {#if currentPartialLine}
      <div class="backrooms-line typing">
        {@html formatLine(currentPartialLine)}<span class="cursor">_</span>
      </div>
    {/if}

    {#if !isTyping && currentLineIndex >= lines.length && lines.length > 0}
      <div class="backrooms-end">
        [end of transmission]
      </div>
    {/if}
  </div>
</div>

<style>
  .backrooms {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    font-size: var(--text-sm);
  }

  .backrooms.immersive {
    /* In immersive mode, the window should request full focus.
       The parent Workspace will handle dimming the background. */
  }

  /* VCR noise overlay — only visible in the Backrooms */
  .vcr-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 256px 256px;
    animation: vcrFlicker 0.15s infinite alternate;
  }

  @keyframes vcrFlicker {
    0% { opacity: 0.03; }
    100% { opacity: 0.06; }
  }

  .backrooms-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-2);
    flex-shrink: 0;
    z-index: 11;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .backrooms-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .backrooms-desc {
    font-size: var(--text-xs);
    color: var(--text-dim);
  }

  .header-controls {
    display: flex;
    gap: var(--space-2);
  }

  .ctrl {
    font-size: var(--text-xs);
    color: var(--text-dim);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all var(--transition-fast);
  }

  .ctrl:hover {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
  }

  .chapter-bar {
    display: flex;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    flex-shrink: 0;
    z-index: 11;
  }

  .chapter-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    padding: var(--space-1) var(--space-2);
    transition: color var(--transition-fast);
  }

  .chapter-btn:hover {
    color: var(--text-secondary);
  }

  .chapter-btn.active {
    color: var(--accent);
    border-bottom: 1px solid var(--accent-dim);
  }

  .search-bar {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding-bottom: var(--space-2);
    flex-shrink: 0;
    z-index: 11;
  }

  .search-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-family: var(--font-system);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .search-input:focus {
    border-color: var(--accent-dim);
  }

  .search-input::placeholder {
    color: var(--text-dim);
  }

  .backrooms-viewport {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    position: relative;
    z-index: 11;
  }

  .backrooms-line {
    padding: var(--space-1) 0;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 1.6;
    word-wrap: break-word;
    transition: background var(--transition-fast);
  }

  .backrooms-line.highlighted {
    background: var(--accent-glow);
  }

  .backrooms-line.typing {
    color: var(--text-primary);
  }

  .backrooms-line :global(.timestamp) {
    color: var(--text-dim);
    font-size: var(--text-xs);
  }

  .backrooms-line :global(.speaker) {
    color: var(--accent);
    font-weight: bold;
  }

  .backrooms-line :global(.speaker.init) {
    color: var(--accent-dim);
  }

  .cursor {
    color: var(--accent);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .backrooms-end {
    padding: var(--space-4) 0;
    color: var(--text-dim);
    text-align: center;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
</style>
