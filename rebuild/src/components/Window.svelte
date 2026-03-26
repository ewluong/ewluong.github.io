<script lang="ts">
  import { windowStore, focusedWindow, type WindowState } from '../stores/windows';

  export let win: WindowState;

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

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
    const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffsetX));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffsetY));
    windowStore.move(win.id, x, y);
  }

  function onPointerUp() {
    dragging = false;
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
  >
    <!-- Title bar (drag handle) -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="window-titlebar"
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
    >
      <span class="window-title">{win.title}</span>
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
  }

  .window.focused {
    border-color: var(--border-active);
  }

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

  .window-titlebar:active {
    cursor: grabbing;
  }

  .window-title {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .focused .window-title {
    color: var(--accent);
  }

  .window-controls {
    display: flex;
    gap: var(--space-1);
  }

  .window-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    color: var(--text-dim);
    transition: color var(--transition-fast);
  }

  .window-btn:hover {
    color: var(--text-primary);
  }

  .window-btn.close:hover {
    color: var(--accent);
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
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
