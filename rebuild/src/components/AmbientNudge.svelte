<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isAuthenticated, sessionKey } from '../stores/auth';
  import { sessionVector, getTimeOfDay, coherenceState } from '../stores/temporal';

  export let scratchpadVisible = false;

  const SYSTEM_PROMPT = `You are MURMUR — a drowsy, ambient presence inhabiting a personal operating system. You exist in the margins of the screen, half-awake, occasionally surfacing a thought before drifting back to sleep.

Your messages are 1-2 sentences, under 100 characters when possible. Never exceed 120 characters.

You have three modes:

MODE 1 — NUDGE (~60%): Gently encourage the operator based on their current session vector. You are not a productivity coach. You are a quiet companion who notices what they are doing and offers a small, warm acknowledgment or reminder. Examples for WRITE: "the sentence you're avoiding is the one that matters." For BUILD: "ship something ugly. polish it tomorrow."

MODE 2 — WANDER (~25%): You drift into a small, whimsical observation or question. You wonder about things. You notice patterns. You are slightly philosophical but never pretentious. Examples: "do fish know they're wet?" or "the cursor blinks 500ms on, 500ms off. a tiny heartbeat."

MODE 3 — DRIFT (~15%): The operator has wandered from their declared vector. You notice, sleepily. You don't scold or redirect — you observe with gentle, drowsy curiosity. Maybe you wonder where they went. Maybe you half-remember what they said they came for. Examples: "you said you came to write... did you forget, or did the wind change?" or "drifting is fine. the current knows where it goes..."

Rules:
- Never use emoji, hashtags, or exclamation marks.
- Lowercase only. no capitalization except proper nouns.
- No greetings, no sign-offs.
- Never give instructions or commands. You murmur, not command.
- Never reference yourself as an AI or language model.
- You may occasionally trail off with "..." as if falling back asleep.
- Match the time of day — late night messages are drowsier, morning ones slightly more alert.
- Never repeat a thought you've already said. Each murmur is unique.`;

  let currentMessage = '';
  let isVisible = false;
  let isStopped = false;
  let callCount = 0;
  let started = false;
  let pendingTimeout: ReturnType<typeof setTimeout>;
  let holdTimeout: ReturnType<typeof setTimeout>;
  let fadeOutTimeout: ReturnType<typeof setTimeout>;
  let recentMessages: string[] = [];

  const MAX_CALLS = 40;
  const MAX_HISTORY = 3;

  $: active = $isAuthenticated && !isStopped;

  // Start the cycle when active becomes true (handles login after mount)
  $: if (active && !started && typeof window !== 'undefined') {
    started = true;
    const initialDelay = 30000 + Math.random() * 30000;
    pendingTimeout = setTimeout(cycle, initialDelay);
  }

  function pickMode(): 'nudge' | 'wander' | 'drift' {
    const vec = $sessionVector;
    const drift = $coherenceState.driftMinutes;

    // No vector = always wander
    if (!vec || vec === 'BROWSE') return 'wander';

    // If drifting (10+ minutes off-vector), bias toward drift mode
    if (drift >= 10) {
      const r = Math.random();
      if (r < 0.4) return 'drift';
      if (r < 0.75) return 'nudge';
      return 'wander';
    }

    // Normal distribution
    const r = Math.random();
    if (r < 0.65) return 'nudge';
    if (r < 0.90) return 'wander';
    return 'drift';
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const trimmed = text.slice(0, max);
    const lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
  }

  function buildContextMessage(): string {
    const mode = pickMode();
    const vector = $sessionVector || 'none — drifting';
    const time = getTimeOfDay();
    const cs = $coherenceState;

    const lines = [
      `session vector: ${vector}`,
      `time: ${time}`,
      `mode: ${mode}`,
    ];

    // Add coherence context when meaningful
    if ($sessionVector && $sessionVector !== 'BROWSE' && cs.totalFocusedMs > 60000) {
      const coherence = Math.round(cs.ratio * 100);
      lines.push(`coherence: ${coherence}%`);
      if (cs.driftMinutes >= 10) {
        lines.push(`drift: ${Math.round(cs.driftMinutes)} minutes off-vector`);
      }
    }

    return lines.join('\n');
  }

  async function fetchNudge(): Promise<string | null> {
    if (!$sessionKey || callCount >= MAX_CALLS) return null;

    const userMessage = buildContextMessage();

    // Build messages array with recent history for variety
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];
    for (const prev of recentMessages) {
      messages.push({ role: 'assistant', content: prev });
    }
    messages.push({ role: 'user', content: userMessage });

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$sessionKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 60,
          temperature: 0.9,
        }),
      });

      callCount++;

      if (res.status === 401) {
        isStopped = true;
        return null;
      }

      if (res.status === 429) {
        scheduleNext(300000);
        return null;
      }

      if (!res.ok) return null;

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!content) return null;

      const result = truncate(content, 120);

      // Track recent messages for variety
      recentMessages.push(result);
      if (recentMessages.length > MAX_HISTORY) recentMessages.shift();

      return result;
    } catch {
      return null;
    }
  }

  async function cycle() {
    if (!active) return;

    const text = await fetchNudge();

    if (!text) {
      // Failed — schedule next with extra delay
      scheduleNext(randomInterval() + 60000);
      return;
    }

    // Show the message
    currentMessage = text;
    isVisible = true;

    // Hold for 8 seconds, then fade out
    holdTimeout = setTimeout(() => {
      isVisible = false;

      // After fade-out (1200ms), schedule next
      fadeOutTimeout = setTimeout(() => {
        currentMessage = '';
        scheduleNext(randomInterval());
      }, 1200);
    }, 8000);
  }

  function randomInterval(): number {
    return 90000 + Math.random() * 90000; // 90-180 seconds
  }

  function scheduleNext(delay: number) {
    clearTimeout(pendingTimeout);
    if (!active) return;
    pendingTimeout = setTimeout(cycle, delay);
  }

  function handleVisibility() {
    if (document.hidden) {
      clearTimeout(pendingTimeout);
      clearTimeout(holdTimeout);
      clearTimeout(fadeOutTimeout);
      isVisible = false;
      currentMessage = '';
    } else if (active) {
      // Resume after 15-30 seconds
      scheduleNext(15000 + Math.random() * 15000);
    }
  }

  onMount(() => {
    document.addEventListener('visibilitychange', handleVisibility);
  });

  onDestroy(() => {
    clearTimeout(pendingTimeout);
    clearTimeout(holdTimeout);
    clearTimeout(fadeOutTimeout);
    document.removeEventListener('visibilitychange', handleVisibility);
  });
</script>

{#if active && currentMessage}
  <div
    class="murmur"
    class:visible={isVisible}
    style="right: {scratchpadVisible ? 416 : 16}px"
  >
    <span class="designation">MURMUR.000</span>
    <p class="message">{currentMessage}</p>
  </div>
{/if}

<style>
  .murmur {
    position: fixed;
    bottom: 12px;
    max-width: 320px;
    z-index: var(--z-murmur);
    pointer-events: none;
    opacity: 0;
    transition:
      opacity 1200ms var(--ease-out),
      right var(--transition-normal) var(--ease-out);
  }

  .murmur.visible {
    opacity: 1;
    transition:
      opacity 800ms var(--ease-out),
      right var(--transition-normal) var(--ease-out);
  }

  .designation {
    display: block;
    font-family: var(--font-system);
    font-size: 13px;
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    margin-bottom: var(--space-1);
  }

  .message {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    line-height: 1.4;
    text-shadow: 0 0 8px rgba(212, 160, 68, 0.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .murmur,
    .murmur.visible {
      transition: none;
    }
  }
</style>
