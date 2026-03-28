<script lang="ts">
  import { scale } from 'svelte/transition';
  import { windowStore, focusedWindow, type WindowState } from '../stores/windows';

  export let win: WindowState;

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let pendingX = 0;
  let pendingY = 0;
  let dragRaf = 0;

  $: isFocused = $focusedWindow?.id === win.id;

  function onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    dragging = true;
    dragOffsetX = e.clientX - win.x;
    dragOffsetY = e.clientY - win.y;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    windowStore.focus(win.id);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dockWidth = 184;
    pendingX = Math.max(dockWidth, Math.min(window.innerWidth - 100, e.clientX - dragOffsetX));
    pendingY = Math.max(38, Math.min(window.innerHeight - 40, e.clientY - dragOffsetY));
    if (!dragRaf) {
      dragRaf = requestAnimationFrame(() => {
        windowStore.move(win.id, pendingX, pendingY);
        dragRaf = 0;
      });
    }
  }

  function onPointerUp() {
    if (dragging) {
      dragging = false;
      if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = 0; }
      windowStore.persistNow(); // Persist layout once at end of drag
    }
  }

  function handleClose() {
    windowStore.close(win.id);
  }

  function handleMinimize() {
    windowStore.minimize(win.id);
  }

  function handleFocus() {
    windowStore.focus(win.id);
  }
</script>

{#if win.isOpen && !win.isMinimized}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="window"
    class:focused={isFocused}
    style="
      left: {win.x}px;
      top: {win.y}px;
      width: {win.width}px;
      z-index: {win.zIndex};
    "
    on:pointerdown={handleFocus}
    out:scale={{ duration: 180, start: 0.97, opacity: 0 }}
  >
    <!-- Corner brackets (targeting reticle) -->
    <div class="bracket bracket-tl"></div>
    <div class="bracket bracket-tr"></div>
    <div class="bracket bracket-bl"></div>
    <div class="bracket bracket-br"></div>

    <!-- Title bar (drag handle) -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="window-titlebar"
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
    >
      <div class="window-title-group">
        <span class="status-dot" class:active={isFocused}></span>
        {#if win.designation}
          <span class="window-designation">[{win.designation}]</span>
        {/if}
        <span class="window-title">{win.title}</span>
      </div>
      <div class="window-controls">
        <button class="window-btn minimize" on:click={handleMinimize} aria-label="Minimize">
          <span>_</span>
        </button>
        <button class="window-btn close" on:click={handleClose} aria-label="Close">
          <span>x</span>
        </button>
      </div>
    </div>

    <!-- Content area -->
    <div class="window-content">
      <slot />
    </div>
  </div>
{/if}

<style>
  .window {
    position: fixed;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: scale(0.97);
    animation: windowOpen var(--transition-normal) var(--ease-out) forwards;
    max-height: calc(100vh - 80px);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .window:hover {
    border-color: var(--border-active);
  }

  .window.focused {
    border-color: var(--accent-dim);
    border-left: 2px solid var(--accent);
    box-shadow: -6px 0 24px var(--accent-glow), 0 0 40px rgba(0, 0, 0, 0.4);
  }

  /* --- Corner Brackets (targeting reticle) --- */
  .bracket {
    position: absolute;
    width: 20px;
    height: 20px;
    pointer-events: none;
    z-index: 1;
    transition: border-color var(--transition-fast), width var(--transition-fast), height var(--transition-fast);
  }

  .bracket-tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid var(--border-active);
    border-left: 2px solid var(--border-active);
  }

  .bracket-tr {
    top: -1px;
    right: -1px;
    border-top: 2px solid var(--border-active);
    border-right: 2px solid var(--border-active);
  }

  .bracket-bl {
    bottom: -1px;
    left: -1px;
    border-bottom: 2px solid var(--border-active);
    border-left: 2px solid var(--border-active);
  }

  .bracket-br {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid var(--border-active);
    border-right: 2px solid var(--border-active);
  }

  .focused .bracket {
    border-color: var(--accent);
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 0 4px var(--accent-glow));
  }

  /* --- Title Bar --- */
  .window-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
  }

  .focused .window-titlebar {
    border-bottom-color: var(--accent-dim);
  }

  .window-titlebar:active {
    cursor: grabbing;
  }

  .window-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* --- Status Dot --- */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
    flex-shrink: 0;
    transition: background var(--transition-fast), box-shadow var(--transition-fast);
  }

  .status-dot.active {
    background: var(--accent);
    animation: dotPulse 2s ease-in-out infinite;
  }

  @keyframes dotPulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent-glow), 0 0 16px var(--accent-glow); }
    50% { opacity: 0.5; box-shadow: 0 0 3px var(--accent-glow); }
  }

  /* --- Designation Code --- */
  .window-designation {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    font-family: var(--font-system);
    transition: color var(--transition-fast);
  }

  .focused .window-designation {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent-glow);
    animation: flicker 5s linear infinite;
  }

  .window-title {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: color var(--transition-fast);
  }

  .focused .window-title {
    color: var(--accent);
  }

  .window-controls {
    display: flex;
    gap: var(--space-2);
  }

  .window-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    color: var(--text-dim);
    border: 1px solid transparent;
    transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  }

  .window-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-active);
    background: var(--bg-surface);
  }

  .window-btn.close:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
    background: rgba(212, 160, 68, 0.08);
  }

  .window-content {
    padding: var(--space-4);
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  @keyframes windowOpen {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
