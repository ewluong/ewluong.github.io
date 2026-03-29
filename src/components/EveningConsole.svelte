<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { SealSummary } from '../stores/temporal';
  import { playSealReflection } from '../lib/uiSounds';

  export let summary: SealSummary;
  export let onDismiss: () => void;
  export let sessionKey: string = '';

  let lines: string[] = [];
  let visibleCount = 0;
  let dismissed = false;
  let staggerInterval: ReturnType<typeof setInterval>;
  let autoDismissTimeout: ReturnType<typeof setTimeout>;
  let reflectionIndex = -1; // index in lines[] where AI reflection will be inserted

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
    if (s.ledger.silenceMs > 60000) {
      const silenceMin = Math.round(s.ledger.silenceMs / 60000);
      activity.push(`${silenceMin} minute${silenceMin > 1 ? 's' : ''} in silence`);
    }

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

    // Reserve space for reflection (AI if authenticated, deterministic fallback otherwise)
    if (s.sessionMs >= 600000) {
      result.push('');
      reflectionIndex = result.length;
      result.push('...'); // placeholder — will be replaced by AI reflection
    }

    result.push('');
    result.push(s.closingPhrase);

    return result;
  }

  const SEAL_REFLECTION_PROMPT = `You are the threshold — the space between the operator and the network. A session has just ended. You will receive a summary of what happened. Generate a single sentence (under 80 characters) that reflects on the session with quiet, unsentimental observation. You are not congratulating. You are not judging. You are witnessing.

Rules:
- One sentence only. Under 80 characters.
- Lowercase. No emoji. No exclamation marks.
- Do not name the operator. Do not say "you."
- Speak as if the threshold itself is noting what passed through.
- Match the register: quiet, observational, slightly melancholic.

Examples:
- "the log is heavier now."
- "signals received. none answered."
- "words were written. whether they were true remains."
- "forty minutes of research. the questions multiplied."
- "three habits checked. one avoided."`;

  async function fetchSealReflection(s: SealSummary): Promise<string | null> {
    if (!sessionKey) return null;

    const contextParts: string[] = [];
    if (s.vector) contextParts.push(`vector: ${s.vector}`);
    contextParts.push(`duration: ${s.duration}`);
    if (s.coherencePercent >= 0) contextParts.push(`coherence: ${s.coherencePercent}%`);
    if (s.ledger.wordsWritten > 0) contextParts.push(`wrote ${s.ledger.wordsWritten} words`);
    if (s.ledger.signalsRead > 0) contextParts.push(`read ${s.ledger.signalsRead} signals`);
    if (s.ledger.habitsCompleted > 0) contextParts.push(`completed ${s.ledger.habitsCompleted} habits`);
    if (s.ledger.chatMessages > 0) contextParts.push(`${s.ledger.chatMessages} exchanges with MAGI`);

    const unique = s.ledger.modulesVisited.filter((m, i, arr) => i === 0 || arr[i - 1] !== m);
    if (unique.length > 1) {
      contextParts.push(`module journey: ${unique.slice(0, 6).map(m => m.replace(/-/g, ' ')).join(' → ')}`);
    }
    contextParts.push(`closing phrase: ${s.closingPhrase}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SEAL_REFLECTION_PROMPT },
            { role: 'user', content: contextParts.join('\n') },
          ],
          max_tokens: 40,
          temperature: 0.85,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) return null;

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!content) return null;

      // Enforce length and lowercase
      let reflection = content.slice(0, 80);
      if (!reflection.endsWith('.')) reflection += '.';
      return reflection.toLowerCase();
    } catch {
      return null;
    }
  }

  function buildDeterministicReflection(s: SealSummary): string {
    // Template-based reflection selected from session data
    if (s.ledger.wordsWritten > 200) return 'the page is fuller now.';
    if (s.ledger.wordsWritten > 0) return 'words were committed.';
    if (s.ledger.silenceMs > 300000) return 'the silence was long. something may have shifted.';
    if (s.ledger.silenceMs > 60000) return 'silence was chosen.';
    if (s.ledger.habitsCompleted >= 4) return 'the system checks passed.';
    if (s.ledger.habitsCompleted > 0) return 'some habits attended to.';
    if (s.ledger.signalsRead > 5) return 'the feed was consulted. thoroughly.';
    if (s.ledger.signalsRead > 0) return 'signals scanned. none urgent.';
    if (s.ledger.chatMessages > 3) return 'a conversation with the machine.';
    if (s.ledger.chatMessages > 0) return 'the oracle was consulted.';
    if (s.coherencePercent > 85) return 'the vector held.';
    if (s.coherencePercent > 60) return 'mostly on course.';
    if (s.coherencePercent >= 0 && s.coherencePercent <= 40) return 'the current was strong today.';
    return 'time passed through the gate.';
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
    const totalRevealMs = lines.length * 200 + 5000;
    autoDismissTimeout = setTimeout(dismiss, totalRevealMs);

    // Fire AI reflection request (non-blocking, with deterministic fallback)
    if (reflectionIndex >= 0) {
      const fallback = buildDeterministicReflection(summary);
      if (sessionKey) {
        fetchSealReflection(summary).then(reflection => {
          if (reflectionIndex >= 0 && reflectionIndex < lines.length) {
            lines[reflectionIndex] = reflection || fallback;
            lines = lines;
            playSealReflection();
          }
        });
      } else {
        // No auth — use deterministic fallback immediately
        setTimeout(() => {
          if (reflectionIndex >= 0 && reflectionIndex < lines.length) {
            lines[reflectionIndex] = fallback;
            lines = lines;
            playSealReflection();
          }
        }, 800);
      }
    }
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
      {:else if i === reflectionIndex}
        <div class="seal-line seal-reflection" class:seal-breathing={line === '...'}>{line}</div>
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

  .seal-reflection {
    color: var(--text-secondary);
    font-style: italic;
    letter-spacing: 0.03em;
    transition: opacity 400ms var(--ease-out);
  }

  .seal-reflection.seal-breathing {
    animation: sealBreathe 2s ease-in-out infinite;
  }

  @keyframes sealBreathe {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
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
