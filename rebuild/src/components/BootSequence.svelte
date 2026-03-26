<script lang="ts">
  import { onMount } from 'svelte';
  import { bootPhase, bootMessages, statusMessage } from '../stores/system';

  let visible = true;
  let lines: string[] = [];

  const BOOT_LINES = [
    'SYSTEM INIT...',
    'loading environment...',
    'connecting to /dev/mind',
    'audio subsystem ready',
    'canvas layer initialized',
    '> just chasing the wind...',
  ];

  const LINE_DELAY = 400;
  const FADE_DELAY = 800;

  onMount(() => {
    bootPhase.set('booting');
    let i = 0;

    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        lines = [...lines, BOOT_LINES[i]];
        bootMessages.set(lines);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          visible = false;
          bootPhase.set('ready');
          statusMessage.set('just chasing the wind...');
        }, FADE_DELAY);
      }
    }, LINE_DELAY);

    return () => clearInterval(interval);
  });
</script>

{#if visible}
  <div class="boot-overlay" class:fading={!visible}>
    <div class="boot-terminal">
      {#each lines as line, i}
        <div class="boot-line" style="animation-delay: {i * 50}ms">
          {line}
        </div>
      {/each}
      <span class="boot-cursor">_</span>
    </div>
  </div>
{/if}

<style>
  .boot-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-boot);
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity var(--transition-slow) var(--ease-out);
  }

  .boot-overlay.fading {
    opacity: 0;
    pointer-events: none;
  }

  .boot-terminal {
    font-family: var(--font-system);
    font-size: var(--text-lg);
    color: var(--text-secondary);
    max-width: 500px;
    padding: var(--space-8);
  }

  .boot-line {
    opacity: 0;
    animation: fadeIn var(--transition-normal) var(--ease-out) forwards;
    margin-bottom: var(--space-2);
  }

  .boot-line:last-of-type {
    color: var(--accent);
  }

  .boot-cursor {
    display: inline-block;
    color: var(--accent);
    animation: blink 1s step-end infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
