<script lang="ts">
  import { onMount } from 'svelte';

  export let visible = false;

  const STORAGE_KEY = 'ewluong-os-scratchpad';

  interface Page {
    id: string;
    title: string;
    content: string;
  }

  let pages: Page[] = [];
  let activePageId = '';
  let saveTimeout: ReturnType<typeof setTimeout>;

  function loadPages(): Page[] {
    if (typeof window === 'undefined') return [defaultPage()];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed && parsed.length > 0 ? parsed : [defaultPage()];
    } catch {
      return [defaultPage()];
    }
  }

  function defaultPage(): Page {
    return { id: crypto.randomUUID(), title: 'SCRATCH.001', content: '' };
  }

  function save() {
    if (typeof window === 'undefined') return;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    }, 500);
  }

  function addPage() {
    const num = String(pages.length + 1).padStart(3, '0');
    const page = { id: crypto.randomUUID(), title: `SCRATCH.${num}`, content: '' };
    pages = [...pages, page];
    activePageId = page.id;
    save();
  }

  function removePage(id: string) {
    if (pages.length <= 1) return;
    pages = pages.filter(p => p.id !== id);
    if (activePageId === id) {
      activePageId = pages[0].id;
    }
    save();
  }

  function handleInput() {
    pages = pages; // trigger reactivity
    save();
  }

  function exportPage() {
    const page = pages.find(p => p.id === activePageId);
    if (!page) return;
    const blob = new Blob([page.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.toLowerCase().replace(/\./g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    pages = loadPages();
    activePageId = pages[0]?.id ?? '';
  });

  $: activePage = pages.find(p => p.id === activePageId);
</script>

{#if visible}
  <div class="scratchpad-panel">
    <div class="scratchpad-header">
      <span class="scratchpad-label">SCRATCHPAD</span>
      <div class="scratchpad-actions">
        <button class="action-btn" on:click={exportPage} title="Export as .md">EXPORT</button>
        <button class="action-btn" on:click={() => visible = false} title="Close">CLOSE</button>
      </div>
    </div>

    <div class="tab-bar">
      {#each pages as page}
        <button
          class="tab"
          class:active={page.id === activePageId}
          on:click={() => activePageId = page.id}
        >
          {page.title}
          {#if pages.length > 1}
            <span class="tab-close" on:click|stopPropagation={() => removePage(page.id)}>x</span>
          {/if}
        </button>
      {/each}
      <button class="tab add-tab" on:click={addPage} title="New page">+</button>
    </div>

    <textarea
      class="scratchpad-textarea"
      bind:value={activePage.content}
      on:input={handleInput}
      placeholder="> capture thoughts..."
      spellcheck="false"
    ></textarea>

    <div class="scratchpad-footer">
      <span class="char-count">{activePage?.content.length ?? 0} chars</span>
      <span class="page-count">{pages.length} {pages.length === 1 ? 'page' : 'pages'}</span>
    </div>
  </div>
{/if}

<style>
  .scratchpad-panel {
    position: fixed;
    top: 38px;
    right: 0;
    bottom: 0;
    width: 400px;
    z-index: var(--z-overlay);
    background: var(--bg-surface);
    border-left: 1px solid var(--accent-dim);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
    animation: slideIn 250ms var(--ease-out) forwards;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .scratchpad-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .scratchpad-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    animation: flicker 6s linear infinite;
  }

  .scratchpad-actions {
    display: flex;
    gap: var(--space-2);
  }

  .action-btn {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .tab-bar {
    display: flex;
    gap: 1px;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .tab {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) var(--space-2);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .tab:hover {
    color: var(--text-secondary);
    background: var(--bg-surface-hover);
  }

  .tab.active {
    color: var(--accent);
    border-bottom: 1px solid var(--accent);
  }

  .tab-close {
    font-size: 11px;
    color: var(--text-dim);
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .tab-close:hover {
    color: var(--accent);
  }

  .add-tab {
    color: var(--accent-dim);
    font-size: var(--text-sm);
  }

  .add-tab:hover {
    color: var(--accent);
  }

  .scratchpad-textarea {
    flex: 1;
    width: 100%;
    font-family: var(--font-reading);
    font-size: 15px;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: none;
    padding: var(--space-4);
    resize: none;
    line-height: 1.7;
    outline: none;
    caret-color: var(--accent);
  }

  .scratchpad-textarea::placeholder {
    color: var(--text-dim);
  }

  .scratchpad-footer {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--border);
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }
</style>
