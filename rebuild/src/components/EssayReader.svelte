<script lang="ts">
  import { onMount } from 'svelte';

  /** The essay slug — used to fetch rendered HTML fragment */
  export let slug: string = '';
  export let title: string = '';

  let html = '';
  let loading = true;
  let error = '';
  let focusMode = false;

  function toggleFocus() {
    focusMode = !focusMode;
  }

  onMount(async () => {
    if (!slug) {
      error = 'NO SLUG PROVIDED';
      loading = false;
      return;
    }

    try {
      const res = await fetch(`/fragments/blog/${slug}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Extract just the body content from the HTML response
      // The fragment pages return minimal HTML — extract the inner content
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      html = doc.body.innerHTML;
    } catch {
      error = 'SIGNAL LOST — UNABLE TO LOAD DOCUMENT';
    } finally {
      loading = false;
    }
  });
</script>

<div class="essay-reader" class:focus-mode={focusMode}>
  <div class="essay-toolbar">
    <button class="focus-btn" on:click={toggleFocus} aria-label="Toggle focus mode">
      {focusMode ? 'exit focus' : 'focus mode'}
    </button>
  </div>

  <article class="essay-body">
    <h1 class="essay-title">{title}</h1>

    {#if loading}
      <div class="loading-state">
        <span class="loading-text">LOADING DOCUMENT</span>
        <span class="loading-dots">...</span>
      </div>
    {:else if error}
      <div class="error-state">[{error}]</div>
    {:else}
      <div class="essay-content">
        {@html html}
      </div>
    {/if}
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
    font-size: var(--text-xs);
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
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.06) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 1.5s linear;
  }

  .focus-mode .focus-btn {
    color: var(--accent);
    border-color: var(--accent-dim);
    animation: glowPulse 3s ease-in-out infinite;
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

  .loading-state {
    color: var(--text-dim);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    padding: var(--space-4) 0;
  }

  .loading-dots {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .error-state {
    color: var(--accent);
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    padding: var(--space-4) 0;
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
    position: relative;
  }

  .essay-content :global(blockquote::before) {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    box-shadow: 0 0 6px var(--accent-glow);
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
