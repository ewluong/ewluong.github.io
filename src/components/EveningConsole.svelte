<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SealSummary } from '../stores/temporal';

  export let summary: SealSummary;
  export let onDismiss: () => void;

  let lines: string[] = [];
  let visibleCount = 0;
  let dismissed = false;
  let staggerInterval: ReturnType<typeof setInterval>;
  let autoDismissTimeout: ReturnType<typeof setTimeout>;

  function buildLines(s: SealSummary): string[] {
    const result: string[] = [];

    result.push(`SESSION SEALED — ${s.duration}`);
    result.push('');

    if (s.vector) result.push(`VECTOR: ${s.vector}`);
    if (s.coherencePercent >= 0) result.push(`COHERENCE: ${s.coherencePercent}%`);

    // Ledger lines — only show non-zero activity
    const activity: string[] = [];
    if (s.ledger.wordsWritten > 0) activity.push(`wrote ${s.ledger.wordsWritten} words in the log`);
    if (s.ledger.signalsRead > 0) activity.push(`read ${s.ledger.signalsRead} signal${s.ledger.signalsRead > 1 ? 's' : ''}`);
    if (s.ledger.habitsCompleted > 0) activity.push(`completed ${s.ledger.habitsCompleted} habit${s.ledger.habitsCompleted > 1 ? 's' : ''}`);
    if (s.ledger.chatMessages > 0) activity.push(`${s.ledger.chatMessages} exchange${s.ledger.chatMessages > 1 ? 's' : ''} with MAGI`);
    if (s.ledger.scratchpadChars > 0) activity.push(`${s.ledger.scratchpadChars} characters to scratchpad`);

    if (activity.length > 0) {
      result.push('');
      for (const line of activity) result.push(line);
    }

    // Module journey (compact: max 6 unique modules shown)
    if (s.ledger.modulesVisited.length > 1) {
      const unique = s.ledger.modulesVisited.filter((m, i, arr) => i === 0 || arr[i - 1] !== m);
      const shown = unique.slice(0, 6);
      const journey = shown.map(m => m.replace(/-/g, ' ')).join(' \u2192 ');
      result.push('');
      result.push(journey + (unique.length > 6 ? ' \u2192 ...' : ''));
    }

    result.push('');
    result.push(s.closingPhrase);

    return result;
  }

  onMount(() => {
    lines = buildLines(summary);

    // Stagger line reveals
    staggerInterval = setInterval(() => {
      visibleCount++;
      if (visibleCount >= lines.length) {
        clearInterval(staggerInterval);
      }
    }, 200);

    // Auto-dismiss after lines are revealed + hold time
    const totalRevealMs = lines.length * 200 + 4000;
    autoDismissTimeout = setTimeout(dismiss, totalRevealMs);
  });

  onDestroy(() => {
    clearInterval(staggerInterval);
    clearTimeout(autoDismissTimeout);
  });

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(autoDismissTimeout); // Prevent auto-dismiss firing after manual dismiss
    setTimeout(onDismiss, 600);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (visibleCount >= lines.length) dismiss();
  }

  function handleClick() {
    if (visibleCount >= lines.length) dismiss();
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="evening-overlay"
  class:dismissed
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <div class="evening-console">
    {#each lines.slice(0, visibleCount) as line, i}
      {#if line === ''}
        <div class="seal-spacer"></div>
      {:else if i === 0}
        <div class="seal-line seal-header">{line}</div>
      {:else if i === lines.length - 1}
        <div class="seal-line seal-closing">{line}</div>
      {:else}
        <div class="seal-line">{line}</div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .evening-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    transition: opacity 600ms var(--ease-out);
    cursor: pointer;
  }

  .evening-overlay.dismissed {
    opacity: 0;
    pointer-events: none;
  }

  .evening-console {
    max-width: 480px;
    text-align: center;
  }

  .seal-spacer {
    height: var(--space-3);
  }

  .seal-line {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    line-height: 1.8;
    letter-spacing: 0.04em;
    opacity: 0;
    animation: sealLineIn 400ms var(--ease-out) forwards;
  }

  .seal-header {
    font-size: var(--text-sm);
    color: var(--accent);
    letter-spacing: 0.1em;
    text-shadow: 0 0 12px var(--accent-glow);
  }

  .seal-closing {
    color: var(--accent-dim);
    font-style: italic;
    letter-spacing: 0.06em;
  }

  @keyframes sealLineIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .seal-line {
      animation: none;
      opacity: 1;
    }
    .evening-overlay {
      transition: none;
    }
  }
</style>
