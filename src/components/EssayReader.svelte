<script lang="ts">
  import { windowStore } from '../stores/windows';

  /** The essay slug — used to fetch rendered HTML */
  export let slug: string = '';
  /** Pre-rendered HTML content from Astro content collection */
  export let html: string = '';
  export let title: string = '';

  let focusMode = false;

  function toggleFocus() {
    focusMode = !focusMode;
    // When focus mode is on, we could dim the workspace
    // For now, toggle a CSS class on the reader
  }
</script>

<div class="essay-reader" class:focus-mode={focusMode}>
  <div class="essay-toolbar">
    <button class="focus-btn" on:click={toggleFocus} aria-label="Toggle focus mode">
      {focusMode ? 'exit focus' : 'focus mode'}
    </button>
  </div>

  <article class="essay-body">
    <h1 class="essay-title">{title}</h1>
    <div class="essay-content">
      {@html html}
    </div>
  </article>
</div>

<style>
  .essay-reader {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .essay-toolbar {
    display: flex;
    justify-content: flex-end;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-4);
    flex-shrink: 0;
  }

  .focus-btn {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .focus-btn:hover {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
  }

  .focus-mode .focus-btn {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .essay-body {
    flex: 1;
    overflow-y: auto;
    padding-right: var(--space-2);
  }

  .essay-title {
    font-family: var(--font-reading);
    font-size: var(--text-lg);
    font-weight: 400;
    color: var(--text-primary);
    margin-bottom: var(--space-6);
    line-height: 1.3;
  }

  .essay-content {
    font-family: var(--font-reading);
    font-size: var(--text-reading);
    line-height: 1.75;
    color: var(--text-primary);
    max-width: 65ch;
  }

  .essay-content :global(p) {
    margin-bottom: 1.5em;
  }

  .essay-content :global(blockquote) {
    border-left: 2px solid var(--accent-dim);
    padding-left: var(--space-4);
    margin: var(--space-4) 0;
    color: var(--text-secondary);
    font-style: italic;
  }

  .essay-content :global(h2),
  .essay-content :global(h3) {
    font-family: var(--font-reading);
    font-weight: 400;
    color: var(--text-primary);
    margin-top: 2em;
    margin-bottom: 0.75em;
  }

  .essay-content :global(h2) {
    font-size: var(--text-lg);
  }

  .essay-content :global(h3) {
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  .essay-content :global(strong) {
    color: var(--accent);
    font-weight: 400;
  }

  .essay-content :global(a) {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Focus mode: slightly brighter text, more contrast */
  .focus-mode .essay-content {
    color: #d8dae0;
  }

  .focus-mode .essay-title {
    color: #e0e2e8;
  }
</style>
