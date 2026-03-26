<script lang="ts">
  import { windowStore } from '../stores/windows';
  import { theme } from '../stores/theme';

  interface DockItem {
    id: string;
    label: string;
    icon: string;
  }

  const items: DockItem[] = [
    { id: 'writing', label: 'WRITING', icon: '>' },
    { id: 'projects', label: 'PROJECTS', icon: '/' },
    { id: 'music', label: 'MUSIC', icon: '~' },
    { id: 'backrooms', label: 'BACKROOMS', icon: '...' },
    { id: 'system-info', label: 'SYSTEM', icon: '?' },
  ];

  $: openWindows = $windowStore.filter(w => w.isOpen);
  $: openIds = new Set(openWindows.map(w => w.id));

  function handleClick(id: string) {
    windowStore.toggle(id);
  }

  function handleThemeCycle() {
    theme.cycle();
  }
</script>

<nav class="dock" role="navigation" aria-label="System dock">
  <div class="dock-items">
    {#each items as item}
      <button
        class="dock-item"
        class:active={openIds.has(item.id)}
        on:click={() => handleClick(item.id)}
        title={item.label}
      >
        <span class="dock-icon">{item.icon}</span>
        <span class="dock-label">{item.label}</span>
        {#if openIds.has(item.id)}
          <span class="dock-indicator"></span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="dock-system">
    <button class="dock-item theme-btn" on:click={handleThemeCycle} title="Cycle theme">
      <span class="dock-icon">*</span>
    </button>
  </div>
</nav>

<style>
  .dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-dock);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(4px);
  }

  .dock-items {
    display: flex;
    gap: var(--space-1);
  }

  .dock-system {
    display: flex;
    gap: var(--space-1);
  }

  .dock-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    transition: color var(--transition-fast);
    letter-spacing: 0.05em;
  }

  .dock-item:hover {
    color: var(--text-primary);
  }

  .dock-item.active {
    color: var(--accent);
  }

  .dock-icon {
    font-size: var(--text-sm);
    width: 16px;
    text-align: center;
  }

  .dock-label {
    text-transform: uppercase;
  }

  .dock-indicator {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 2px;
    background: var(--accent);
    border-radius: 1px;
  }

  .theme-btn .dock-icon {
    color: var(--accent-dim);
  }
</style>
