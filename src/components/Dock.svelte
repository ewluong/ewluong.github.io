<script lang="ts">
  import { windowStore } from '../stores/windows';
  import { theme } from '../stores/theme';
  import { sessionVector, VECTOR_MODULES } from '../stores/temporal';

  interface DockItem {
    id: string;
    label: string;
    designation: string;
  }

  // Tier 1: Daily instruments — what you use every session
  const dailyItems: DockItem[] = [
    { id: 'daily-log', designation: '01', label: 'LOG' },
    { id: 'habits', designation: '02', label: 'DIAGNOSTICS' },
    { id: 'tarot', designation: '03', label: 'WORD' },
    { id: 'quick-links', designation: '04', label: 'REFERENCE' },
  ];

  // Tier 2: Creation & research tools
  const instrumentItems: DockItem[] = [
    { id: 'writing', designation: '05', label: 'WRITING' },
    { id: 'projects', designation: '06', label: 'PROJECTS' },
    { id: 'chat', designation: '07', label: 'MAGI' },
    { id: 'signals', designation: '08', label: 'SIGNALS' },
  ];

  // Tier 3: Archive & monitoring
  const archiveItems: DockItem[] = [
    { id: 'music', designation: '09', label: 'MUSIC' },
    { id: 'backrooms', designation: '10', label: 'BACKROOMS' },
    { id: 'crypto', designation: '11', label: 'RESOURCES' },
    { id: 'system-info', designation: '12', label: 'SYSTEM' },
    { id: 'life-counters', designation: '13', label: 'RUNTIME' },
  ];

  $: openWindows = $windowStore.filter(w => w.isOpen && !w.isMinimized);
  $: openIds = new Set(openWindows.map(w => w.id));

  // Which modules the current vector emphasizes
  $: vectorModules = new Set(VECTOR_MODULES[$sessionVector] || []);
  $: hasVector = $sessionVector !== '';

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
    {#if $sessionVector}
      <span class="dock-vector">{$sessionVector}</span>
    {/if}
  </div>

  <div class="dock-items">
    <!-- Tier 1: DAILY -->
    <div class="tier-label">DAILY</div>
    {#each dailyItems as item}
      <button
        class="dock-item"
        class:active={openIds.has(item.id)}
        class:vector-emphasis={hasVector && vectorModules.has(item.id)}
        class:vector-dim={hasVector && !vectorModules.has(item.id)}
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

    <!-- Tier 2: INSTRUMENTS -->
    <div class="tier-divider"></div>
    <div class="tier-label">INSTRUMENTS</div>
    {#each instrumentItems as item}
      <button
        class="dock-item"
        class:active={openIds.has(item.id)}
        class:vector-emphasis={hasVector && vectorModules.has(item.id)}
        class:vector-dim={hasVector && !vectorModules.has(item.id)}
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

    <!-- Tier 3: ARCHIVE -->
    <div class="tier-divider"></div>
    <div class="tier-label">ARCHIVE</div>
    {#each archiveItems as item}
      <button
        class="dock-item tier-archive"
        class:active={openIds.has(item.id)}
        class:vector-emphasis={hasVector && vectorModules.has(item.id)}
        class:vector-dim={hasVector && !vectorModules.has(item.id)}
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dock-system-label {
    font-size: var(--text-sm);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    animation: flicker 6s linear infinite;
  }

  .dock-vector {
    font-size: 12px;
    color: var(--accent);
    letter-spacing: 0.08em;
    opacity: 0.8;
  }

  .dock-items {
    display: flex;
    flex-direction: column;
    padding: var(--space-1) 0;
    flex: 1;
    overflow-y: auto;
  }

  .tier-label {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.14em;
    padding: var(--space-2) var(--space-3) var(--space-1);
    opacity: 0.5;
  }

  .tier-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-2) var(--space-3);
    opacity: 0.5;
  }

  .dock-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-3);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast), padding-left var(--transition-fast), opacity var(--transition-fast);
    text-align: left;
    width: 100%;
    border-left: 2px solid transparent;
  }

  /* Archive tier items are slightly dimmer by default */
  .dock-item.tier-archive {
    opacity: 0.7;
  }

  .dock-item.tier-archive:hover {
    opacity: 1;
  }

  /* Vector emphasis: items aligned with current vector glow subtly */
  .dock-item.vector-emphasis {
    opacity: 1;
  }

  .dock-item.vector-emphasis .dock-designation {
    color: var(--accent-dim);
  }

  .dock-item.vector-emphasis .dock-label {
    color: var(--text-primary);
  }

  /* Vector dim: items not aligned with current vector fade */
  .dock-item.vector-dim:not(.active) {
    opacity: 0.45;
  }

  .dock-item.vector-dim:not(.active):hover {
    opacity: 0.8;
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
    opacity: 1;
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
