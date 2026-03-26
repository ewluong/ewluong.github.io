<script lang="ts">
  import { windowStore } from '../stores/windows';

  /** Blog entries passed from Astro at build time via props */
  export let entries: Array<{
    slug: string;
    title: string;
    date: string;
    tags?: string[];
  }> = [];

  let essayCounter = 0;

  function openEssay(slug: string, title: string) {
    const winId = `essay-${slug}`;
    const existing = $windowStore.find(w => w.id === winId);

    if (existing) {
      windowStore.open(winId);
      return;
    }

    essayCounter++;
    const dockWidth = 184;
    const centerX = dockWidth + (window.innerWidth - dockWidth - 640) / 2 + Math.random() * 40 - 20;
    const centerY = 60 + Math.random() * 40;

    windowStore.register({
      id: winId,
      title: title,
      module: 'essay',
      designation: `DOC.${String(essayCounter).padStart(3, '0')}`,
      x: centerX,
      y: centerY,
      width: 640,
      height: 520,
      isOpen: true,
      isMinimized: false,
      data: { slug },
    });
  }
</script>

<div class="blog-list">
  <p class="module-label">WRITING</p>
  <p class="module-desc">Essays on philosophy, economics, technology, and consciousness.</p>

  <ul class="entries">
    {#each entries as entry}
      <li>
        <button class="entry-row" on:click={() => openEssay(entry.slug, entry.title)}>
          <span class="entry-title">{entry.title}</span>
          <span class="entry-date">{entry.date}</span>
        </button>
        {#if entry.tags && entry.tags.length > 0}
          <div class="entry-tags">
            {#each entry.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .blog-list {
    font-size: var(--text-sm);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-1);
    animation: flicker 6s linear infinite;
  }

  .module-desc {
    color: var(--text-dim);
    font-size: var(--text-xs);
    margin-bottom: var(--space-6);
  }

  .entries {
    list-style: none;
  }

  .entries li {
    border-bottom: 1px solid var(--border);
  }

  .entry-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    text-align: left;
    padding: var(--space-3) 0;
    color: var(--text-secondary);
    transition: color var(--transition-fast), background var(--transition-fast), padding-left var(--transition-fast);
    gap: var(--space-4);
  }

  .entry-row:hover {
    color: var(--text-primary);
    background: var(--bg-surface-hover);
    padding-left: var(--space-2);
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.04) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 1.5s linear;
  }

  .entry-title {
    flex: 1;
  }

  .entry-date {
    font-size: var(--text-xs);
    color: var(--text-dim);
    white-space: nowrap;
  }

  .entry-tags {
    display: flex;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
  }

  .tag {
    font-size: var(--text-xs);
    color: var(--text-dim);
    padding: 1px var(--space-2);
    border: 1px solid var(--border);
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .entry-row:hover + .entry-tags .tag,
  li:hover .tag {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
  }
</style>
