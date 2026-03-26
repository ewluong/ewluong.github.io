<script lang="ts">
  import { windowStore } from '../stores/windows';
  import { theme } from '../stores/theme';

  interface DockItem {
    id: string;
    label: string;
    designation: string;
  }

  const items: DockItem[] = [
    { id: 'quick-links', designation: '01', label: 'REFERENCE' },
    { id: 'writing', designation: '02', label: 'WRITING' },
    { id: 'projects', designation: '03', label: 'PROJECTS' },
    { id: 'music', designation: '04', label: 'MUSIC' },
    { id: 'backrooms', designation: '05', label: 'BACKROOMS' },
    { id: 'crypto', designation: '06', label: 'RESOURCES' },
    { id: 'daily-log', designation: '07', label: 'LOG' },
    { id: 'life-counters', designation: '08', label: 'RUNTIME' },
    { id: 'chat', designation: '09', label: 'MAGI' },
    { id: 'system-info', designation: '10', label: 'SYSTEM' },
    { id: 'habits', designation: '11', label: 'DIAGNOSTICS' },
    { id: 'tarot', designation: '12', label: 'WORD' },
    { id: 'signals', designation: '13', label: 'SIGNALS' },
  ];

  $: openWindows = $windowStore.filter(w => w.isOpen && !w.isMinimized);
  $: openIds = new Set(openWindows.map(w => w.id));

  function handleClick(id: string) {
    windowStore.toggle(id);
  }

  function handleThemeCycle() {
    theme.cycle();
  }
</script>

<nav class="dock" role="navigation" aria-label="System dock">
  <div class="dock-header">
    <span class="dock-system-label">ewluong.os</span>
  </div>

  <div class="dock-items">
    {#each items as item}
      <button
        class="dock-item"
        class:active={openIds.has(item.id)}
        on:click={() => handleClick(item.id)}
        title={item.label}
      >
        <span class="dock-designation">{item.designation}</span>
        {#if openIds.has(item.id)}
          <span class="dock-label">[{item.label}]</span>
        {:else}
          <span class="dock-label">{item.label}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="dock-footer">
    <div class="dock-divider"></div>
    <button
      class="dock-item"
      class:active={openIds.has('login')}
      on:click={() => handleClick('login')}
      title="Login"
    >
      <span class="dock-designation">**</span>
      {#if openIds.has('login')}
        <span class="dock-label">[LOGIN]</span>
      {:else}
        <span class="dock-label">LOGIN</span>
      {/if}
    </button>
    <button class="dock-item theme-btn" on:click={handleThemeCycle} title="Cycle theme">
      <span class="dock-designation">**</span>
      <span class="dock-label">THEME</span>
    </button>
  </div>
</nav>

<style>
  .dock {
    position: fixed;
    top: 38px;
    left: 0;
    bottom: 0;
    width: 184px;
    z-index: var(--z-dock);
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
  }

  .dock-header {
    padding: var(--space-4) var(--space-3) var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .dock-system-label {
    font-size: var(--text-sm);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    animation: flicker 6s linear infinite;
  }

  .dock-items {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) 0;
    flex: 1;
    overflow-y: auto;
  }

  .dock-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-3);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast), padding-left var(--transition-fast);
    text-align: left;
    width: 100%;
    border-left: 2px solid transparent;
  }

  .dock-item:hover {
    color: var(--text-primary);
    background: var(--bg-surface-hover);
    border-left-color: var(--border-active);
    padding-left: calc(var(--space-3) + 2px);
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.06) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 1.5s linear;
  }

  .dock-item.active {
    color: var(--accent);
    background: var(--bg-surface);
    border-left: 2px solid var(--accent);
    animation: glowPulse 3s ease-in-out infinite;
  }

  .dock-designation {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    min-width: 22px;
    font-variant-numeric: tabular-nums;
    transition: color var(--transition-fast);
  }

  .dock-item:hover .dock-designation {
    color: var(--accent-dim);
  }

  .dock-item.active .dock-designation {
    color: var(--accent);
  }

  .dock-label {
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .dock-footer {
    padding: var(--space-2) 0;
  }

  .dock-divider {
    height: 1px;
    background: var(--border);
    margin: 0 var(--space-3) var(--space-2);
  }

  .theme-btn .dock-designation {
    color: var(--accent-dim);
  }
</style>
