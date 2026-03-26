<script lang="ts">
  import { onMount } from 'svelte';

  export let slug: string = '';
  export let title: string = '';
  export let type: string = '';
  export let tech: string[] = [];
  export let github: string = '';
  export let link: string = '';
  export let dataFile: string = '';

  let html = '';
  let loading = true;

  onMount(async () => {
    if (!slug) { loading = false; return; }
    try {
      const res = await fetch(`/fragments/projects/${slug}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      html = doc.body.innerHTML;
    } catch {
      html = '';
    } finally {
      loading = false;
    }
  });
</script>

<div class="project-detail">
  <div class="detail-header">
    <span class="type-badge">{type.toUpperCase()}</span>
    <h2 class="detail-title">{title}</h2>
  </div>

  {#if tech.length > 0}
    <div class="tech-row">
      {#each tech as t}
        <span class="tech-tag">{t}</span>
      {/each}
    </div>
  {/if}

  <div class="detail-body">
    {#if loading}
      <span class="loading-text">LOADING...</span>
    {:else if html}
      {@html html}
    {/if}
  </div>

  <div class="detail-links">
    {#if github}
      <a href={github} target="_blank" rel="noopener noreferrer" class="detail-link">
        View on GitHub >>
      </a>
    {/if}
    {#if link}
      <a href={link} target="_blank" rel="noopener noreferrer" class="detail-link">
        Visit Website >>
      </a>
    {/if}
    {#if dataFile}
      <a href={`/docs/${dataFile}`} target="_blank" rel="noopener noreferrer" class="detail-link">
        View Document >>
      </a>
    {/if}
  </div>
</div>

<style>
  .project-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .type-badge {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: 2px var(--space-2);
    border: 1px solid var(--accent-dim);
    flex-shrink: 0;
    animation: glowPulse 3s ease-in-out infinite;
  }

  .detail-title {
    font-family: var(--font-reading);
    font-size: var(--text-lg);
    font-weight: 400;
    color: var(--text-primary);
  }

  .tech-row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .tech-tag {
    font-size: var(--text-xs);
    color: var(--text-dim);
    padding: 1px var(--space-2);
    border: 1px solid var(--border);
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .tech-tag:hover {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
  }

  .detail-body {
    font-family: var(--font-reading);
    font-size: var(--text-sm);
    line-height: 1.65;
    color: var(--text-secondary);
  }

  .detail-body :global(p) {
    margin-bottom: 1em;
  }

  .loading-text {
    color: var(--text-dim);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
  }

  .detail-links {
    display: flex;
    gap: var(--space-4);
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .detail-link {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    transition: color var(--transition-fast);
  }

  .detail-link:hover {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent-glow);
  }
</style>
