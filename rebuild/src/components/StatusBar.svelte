<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { statusMessage, bootPhase } from '../stores/system';
  import { isPlaying, currentTrack } from '../stores/audio';
  import { focusedWindow } from '../stores/windows';

  const STATUS_MESSAGES = [
    'just chasing the wind...',
    'the unexamined life is not worth living',
    'one must imagine Sisyphus happy',
    'existence precedes essence',
    'we are condemned to be free',
    'in the midst of winter, I found there was, within me, an invincible summer',
  ];

  let messageIndex = 0;
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % STATUS_MESSAGES.length;
      statusMessage.set(STATUS_MESSAGES[messageIndex]);
    }, 15000); // Rotate every 15 seconds
  });

  onDestroy(() => {
    clearInterval(interval);
  });

  $: focusLabel = $focusedWindow ? $focusedWindow.title : 'workspace';
  $: audioLabel = $isPlaying ? `♪ ${$currentTrack.title}` : '';
</script>

{#if $bootPhase === 'ready'}
  <div class="status-bar" role="status" aria-live="polite">
    <span class="status-focus">{focusLabel}</span>
    <span class="status-message">{$statusMessage}</span>
    <span class="status-audio">{audioLabel}</span>
  </div>
{/if}

<style>
  .status-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-dock);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-4);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    font-size: var(--text-xs);
    color: var(--text-dim);
    height: 24px;
  }

  .status-focus {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    min-width: 120px;
  }

  .status-message {
    color: var(--text-dim);
    font-style: italic;
    transition: opacity var(--transition-slow);
  }

  .status-audio {
    color: var(--accent-dim);
    min-width: 120px;
    text-align: right;
  }
</style>
