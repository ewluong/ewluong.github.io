<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { scale } from 'svelte/transition';
  import { windowStore } from '../stores/windows';
  import { theme } from '../stores/theme';
  import { playPaletteOpen } from '../lib/uiSounds';
  import { sealSession, resetDrift } from '../stores/temporal';

  export let visible = false;
  export let onSeal: (() => void) | undefined = undefined;
  export let onStatus: (() => void) | undefined = undefined;
  export let onReorient: (() => void) | undefined = undefined;

  const dispatch = createEventDispatcher();
  let inputEl: HTMLInputElement;
  let query = '';
  let selectedIndex = 0;

  interface Command {
    id: string;
    label: string;
    category: string;
    action: () => void;
  }

  // Build command list from window store + system commands
  $: commands = buildCommands($windowStore);

  function buildCommands(windows: typeof $windowStore): Command[] {
    const cmds: Command[] = [];

    // Window commands
    for (const win of windows) {
      cmds.push({
        id: `open-${win.id}`,
        label: `Open ${win.title}`,
        category: 'WINDOW',
        action: () => { windowStore.toggle(win.id); close(); },
      });
    }

    // Theme commands
    cmds.push(
      { id: 'theme-navy', label: 'Theme: Navy', category: 'SYSTEM', action: () => { theme.set('navy'); close(); } },
      { id: 'theme-terminal', label: 'Theme: Terminal', category: 'SYSTEM', action: () => { theme.set('terminal'); close(); } },
      { id: 'theme-warm', label: 'Theme: Warm', category: 'SYSTEM', action: () => { theme.set('warm'); close(); } },
      { id: 'theme-cycle', label: 'Cycle Theme', category: 'SYSTEM', action: () => { theme.cycle(); close(); } },
    );

    // Close all
    cmds.push({
      id: 'close-all',
      label: 'Close All Windows',
      category: 'SYSTEM',
      action: () => {
        for (const w of windows) {
          if (w.isOpen) windowStore.close(w.id);
        }
        close();
      },
    });

    // Session seal
    cmds.push({
      id: 'seal',
      label: 'Seal Session',
      category: 'THRESHOLD',
      action: () => { onSeal?.(); close(); },
    });

    // Show status (re-show morning console)
    cmds.push({
      id: 'status',
      label: 'Show Status',
      category: 'THRESHOLD',
      action: () => { onStatus?.(); close(); },
    });

    // Reorient (reset drift state)
    cmds.push({
      id: 'reorient',
      label: 'Reorient',
      category: 'THRESHOLD',
      action: () => { resetDrift(); onReorient?.(); close(); },
    });

    return cmds;
  }

  // Fuzzy match
  function matches(cmd: Command, q: string): boolean {
    if (!q) return true;
    const lower = q.toLowerCase();
    return cmd.label.toLowerCase().includes(lower) ||
           cmd.category.toLowerCase().includes(lower);
  }

  $: filtered = query.startsWith('search ')
    ? [{ id: 'search', label: `Search: "${query.slice(7)}"`, category: 'WEB', action: () => doSearch(query.slice(7)) }]
    : query.startsWith('goto ')
    ? [{ id: 'goto', label: `Go to: ${query.slice(5)}`, category: 'WEB', action: () => doGoto(query.slice(5)) }]
    : commands.filter(c => matches(c, query));

  $: if (filtered.length > 0 && selectedIndex >= filtered.length) {
    selectedIndex = 0;
  }

  function doSearch(q: string) {
    if (!q.trim()) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q.trim())}`, '_blank');
    close();
  }

  function doGoto(url: string) {
    let u = url.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    window.open(u, '_blank');
    close();
  }

  function close() {
    query = '';
    selectedIndex = 0;
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      } else if (query.trim()) {
        // Default: treat as search
        doSearch(query);
      }
    }
  }

  $: if (visible) {
    playPaletteOpen();
    tick().then(() => inputEl?.focus());
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="palette-overlay" on:click|self={close} out:scale={{ duration: 150, opacity: 0 }}>
    <div class="palette">
      <div class="palette-input-row">
        <span class="palette-prompt">&gt;</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          class="palette-input"
          placeholder="type a command, 'search ...', or 'goto ...'"
          on:keydown={handleKeydown}
          spellcheck="false"
        />
      </div>

      {#if filtered.length > 0}
        <div class="palette-results">
          {#each filtered as cmd, i}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="palette-result"
              class:selected={i === selectedIndex}
              on:click={cmd.action}
              on:mouseenter={() => selectedIndex = i}
            >
              <span class="result-category">{cmd.category}</span>
              <span class="result-label">{cmd.label}</span>
            </div>
          {/each}
        </div>
      {:else if query}
        <div class="palette-empty">
          No matches. Press Enter to search the web.
        </div>
      {/if}

      <div class="palette-hint">
        <span>↑↓ navigate</span>
        <span>enter select</span>
        <span>esc close</span>
        <span>search &lt;query&gt;</span>
        <span>goto &lt;url&gt;</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-overlay {
    position: fixed;
    inset: 0;
    z-index: 600;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    backdrop-filter: blur(2px);
  }

  .palette {
    width: 560px;
    max-width: 90vw;
    background: var(--bg-surface);
    border: 1px solid var(--accent-dim);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px var(--accent-glow);
    animation: paletteOpen 200ms var(--ease-out) forwards;
  }

  @keyframes paletteOpen {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .palette-input-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .palette-prompt {
    color: var(--accent);
    font-size: var(--text-lg);
    font-family: var(--font-system);
  }

  .palette-input {
    flex: 1;
    font-family: var(--font-system);
    font-size: var(--text-sm);
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
    caret-color: var(--accent);
  }

  .palette-input::placeholder {
    color: var(--text-dim);
  }

  .palette-results {
    max-height: 320px;
    overflow-y: auto;
  }

  .palette-result {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .palette-result:hover,
  .palette-result.selected {
    background: var(--bg-surface-hover);
  }

  .palette-result.selected {
    border-left: 2px solid var(--accent);
    padding-left: calc(var(--space-4) - 2px);
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.04) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 2s linear infinite;
  }

  .result-category {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    min-width: 70px;
    transition: color var(--transition-fast);
  }

  .palette-result.selected .result-category {
    color: var(--accent);
  }

  .result-label {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .palette-result.selected .result-label {
    color: var(--text-primary);
  }

  .palette-empty {
    padding: var(--space-4);
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: center;
  }

  .palette-hint {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--border);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .palette-prompt {
    animation: flicker 4s linear infinite;
  }
</style>
