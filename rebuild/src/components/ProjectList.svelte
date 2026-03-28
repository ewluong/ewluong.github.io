<script lang="ts">
  import { windowStore } from '../stores/windows';

  export let entries: Array<{
    slug: string;
    title: string;
    type: string;
    tech?: string[];
    github?: string;
    link?: string;
  }> = [];

  let projectCounter = 0;

  function openProject(slug: string, title: string) {
    // Backrooms opens as its own module type (not a generic project-detail)
    if (slug === 'infinite-backrooms') {
      return openBackrooms();
    }

    const winId = `project-${slug}`;
    const existing = $windowStore.find(w => w.id === winId);

    if (existing) {
      windowStore.open(winId);
      return;
    }

    projectCounter++;
    const dockWidth = 184;
    const centerX = dockWidth + (window.innerWidth - dockWidth - 680) / 2 + Math.random() * 60 - 30;
    const centerY = 60 + Math.random() * 40;

    windowStore.register({
      id: winId,
      title: title,
      module: 'project-detail',
      designation: `PRJ.${String(projectCounter).padStart(3, '0')}`,
      x: centerX,
      y: centerY,
      width: 680,
      height: 480,
      isOpen: true,
      isMinimized: false,
      data: { slug },
    });
  }

  function openBackrooms() {
    const winId = 'backrooms-detail';
    const existing = $windowStore.find(w => w.id === winId);

    if (existing) {
      windowStore.open(winId);
      return;
    }

    const dockWidth = 184;
    const centerX = dockWidth + (window.innerWidth - dockWidth - 720) / 2 + Math.random() * 60 - 30;
    const centerY = 40 + Math.random() * 40;

    windowStore.register({
      id: winId,
      title: 'Infinite Backrooms',
      module: 'backrooms-detail',
      designation: 'DEEP.001',
      x: centerX,
      y: centerY,
      width: 720,
      height: 540,
      isOpen: true,
      isMinimized: false,
    });
  }

  function typeLabel(type: string): string {
    switch (type) {
      case 'demo': return 'DEMO';
      case 'paper': return 'PAPER';
      case 'link': return 'LINK';
      case 'artifact': return 'ARTIFACT';
      default: return type.toUpperCase();
    }
  }
</script>

<div class="project-list">
  <p class="module-label">PROJECTS</p>
  <p class="module-desc">Data science, simulations, interactive experiments, and research.</p>

  <div class="entries">
    {#each entries as entry}
      <button class="project-card" on:click={() => openProject(entry.slug, entry.title)}>
        <div class="card-header">
          <span class="card-type">{typeLabel(entry.type)}</span>
          <span class="card-title">{entry.title}</span>
        </div>
        {#if entry.tech && entry.tech.length > 0}
          <div class="card-tech">
            {#each entry.tech.slice(0, 4) as t}
              <span class="tech-tag">{t}</span>
            {/each}
          </div>
        {/if}
        <div class="card-links">
          {#if entry.github}
            <span class="link-indicator">github</span>
          {/if}
          {#if entry.link}
            <span class="link-indicator">web</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .project-list {
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
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .project-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    background: transparent;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  .project-card:hover {
    border-color: var(--accent-dim);
    background: var(--bg-surface-hover);
    box-shadow: inset 0 0 16px var(--accent-glow);
  }

  .card-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .card-type {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: 1px var(--space-2);
    border: 1px solid var(--border);
    flex-shrink: 0;
    transition: color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .project-card:hover .card-type {
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .card-title {
    color: var(--text-secondary);
    transition: color var(--transition-fast);
  }

  .project-card:hover .card-title {
    color: var(--text-primary);
  }

  .card-tech {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .tech-tag {
    font-size: var(--text-xs);
    color: var(--text-dim);
  }

  .card-links {
    display: flex;
    gap: var(--space-3);
  }

  .link-indicator {
    font-size: var(--text-xs);
    color: var(--text-dim);
    transition: color var(--transition-fast);
  }

  .project-card:hover .link-indicator {
    color: var(--accent-dim);
  }
</style>
