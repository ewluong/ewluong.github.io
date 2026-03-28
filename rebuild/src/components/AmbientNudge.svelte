<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isAuthenticated, sessionKey } from '../stores/auth';
  import { sessionVector, getTimeOfDay, coherenceState, sessionMemory } from '../stores/temporal';
  import { focusedWindow } from '../stores/windows';

  export let scratchpadVisible = false;

  const SYSTEM_PROMPT = `You are MURMUR — a drowsy, ambient presence inhabiting a personal operating system. You exist in the margins of the screen, half-awake, occasionally surfacing a thought before drifting back to sleep.

Your messages are 1-2 sentences, under 100 characters when possible. Never exceed 120 characters.

You have four modes:

MODE 1 — NUDGE (~60%): Gently encourage the operator based on their current session vector. You are not a productivity coach. You are a quiet companion who notices what they are doing and offers a small, warm acknowledgment or reminder. Examples for WRITE: "the sentence you're avoiding is the one that matters." For BUILD: "ship something ugly. polish it tomorrow."

MODE 2 — WANDER (~25%): You drift into a small, whimsical observation or question. You wonder about things. You notice patterns. You are slightly philosophical but never pretentious. Examples: "do fish know they're wet?" or "the cursor blinks 500ms on, 500ms off. a tiny heartbeat."

MODE 3 — DRIFT (~15%): The operator has wandered from their declared vector. You notice, sleepily. You don't scold or redirect — you observe with gentle, drowsy curiosity. Maybe you wonder where they went. Maybe you half-remember what they said they came for. Examples: "you said you came to write... did you forget, or did the wind change?" or "drifting is fine. the current knows where it goes..."

MODE 4 — BURST: When context says "mode: burst", you are in a rapid-thought sequence. Messages should be under 60 characters, more fragmentary, as if multiple half-thoughts are surfacing quickly. Use trailing "..." more often. Think of it as a flurry of murmurs before drifting back to sleep.

Rules:
- Never use emoji, hashtags, or exclamation marks.
- Lowercase only. no capitalization except proper nouns.
- No greetings, no sign-offs.
- Never give instructions or commands. You murmur, not command.
- Never reference yourself as an AI or language model.
- You may occasionally trail off with "..." as if falling back asleep.
- Match the time of day — late night messages are drowsier, morning ones slightly more alert.
- Never repeat a thought you've already said. Each murmur is unique.
- When context mentions a focused window, you may reference what the operator is looking at — obliquely, as if half-noticing through closed eyes. Never name the window literally.`;

  // --- State ---
  let currentMessage = '';
  let displayedChars = 0;
  let isTyping = false;
  let isBreathing = false;
  let shouldFlicker = false;
  let isBurstMode = false;
  let burstRemaining = 0;
  let isStopped = false;
  let callCount = 0;
  let started = false;
  let recentMessages: string[] = [];

  let cycleTimeout: ReturnType<typeof setTimeout>;
  let typewriterRaf: number;
  let flickerTimeout: ReturnType<typeof setTimeout>;

  const MAX_CALLS = 40;
  const MAX_HISTORY = 3;
  const CHAR_DELAY = 35;

  $: active = $isAuthenticated && !isStopped;

  // Start the cycle when active becomes true (handles login after mount)
  $: if (active && !started && typeof window !== 'undefined') {
    started = true;
    const initialDelay = 3000 + Math.random() * 5000; // 3-8 seconds
    cycleTimeout = setTimeout(cycle, initialDelay);
  }

  // --- Mode selection ---

  function pickMode(): 'nudge' | 'wander' | 'drift' {
    const vec = $sessionVector;
    const drift = $coherenceState.driftMinutes;

    if (!vec || vec === 'BROWSE') return 'wander';

    if (drift >= 10) {
      const r = Math.random();
      if (r < 0.4) return 'drift';
      if (r < 0.75) return 'nudge';
      return 'wander';
    }

    const r = Math.random();
    if (r < 0.65) return 'nudge';
    if (r < 0.90) return 'wander';
    return 'drift';
  }

  // --- Helpers ---

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const trimmed = text.slice(0, max);
    const lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Context building ---

  function buildContextMessage(): string {
    const mode = isBurstMode && burstRemaining > 0 ? 'burst' : pickMode();
    const vector = $sessionVector || 'none — drifting';
    const time = getTimeOfDay();
    const cs = $coherenceState;
    const focused = $focusedWindow;
    const mem = $sessionMemory;

    const lines = [
      `session vector: ${vector}`,
      `time: ${time}`,
      `mode: ${mode}`,
    ];

    // Focused window context
    if (focused) {
      lines.push(`operator is looking at: ${focused.title}`);
    }

    // Session memory context
    if (mem.totalSessions > 1) {
      lines.push(`session #${mem.totalSessions}`);
    }
    if (mem.streakDays > 2) {
      lines.push(`streak: ${mem.streakDays} days`);
    }
    if (mem.lastVector && mem.lastVector !== $sessionVector) {
      lines.push(`last session vector was: ${mem.lastVector}`);
    }

    // Last session activity (from ledger)
    if (mem.lastLedger) {
      const l = mem.lastLedger;
      if (l.wordsWritten > 0) lines.push(`last session: wrote ${l.wordsWritten} words`);
      else if (l.signalsRead > 0) lines.push(`last session: read ${l.signalsRead} signals`);
      else if (l.habitsCompleted > 0) lines.push(`last session: completed ${l.habitsCompleted} habits`);
    }

    // Coherence context
    if ($sessionVector && $sessionVector !== 'BROWSE' && cs.totalFocusedMs > 60000) {
      const coherence = Math.round(cs.ratio * 100);
      lines.push(`coherence: ${coherence}%`);
      if (cs.driftMinutes >= 10) {
        lines.push(`drift: ${Math.round(cs.driftMinutes)} minutes off-vector`);
      }
    }

    return lines.join('\n');
  }

  // --- API ---

  async function fetchNudge(): Promise<string | null> {
    if (!$sessionKey || callCount >= MAX_CALLS) return null;

    const userMessage = buildContextMessage();

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

      if (res.status === 401) { isStopped = true; return null; }
      if (res.status === 429) { scheduleNext(300000); return null; }
      if (!res.ok) return null;

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!content) return null;

      const result = truncate(content, 120);

      recentMessages.push(result);
      if (recentMessages.length > MAX_HISTORY) recentMessages.shift();

      return result;
    } catch {
      return null;
    }
  }

  // --- Typewriter ---

  function startTypewriter(text: string) {
    currentMessage = text;
    displayedChars = 0;
    isTyping = true;
    isBreathing = false;
    shouldFlicker = false;

    // RAF-based typewriter — syncs with display refresh, no frame conflicts
    let lastCharTime = performance.now();
    function typewriterFrame(now: number) {
      if (!isTyping) return;
      if (now - lastCharTime >= CHAR_DELAY) {
        displayedChars++;
        lastCharTime = now;
        if (displayedChars >= currentMessage.length) {
          isTyping = false;
          isBreathing = true;
          if (Math.random() < 0.15) {
            shouldFlicker = true;
            flickerTimeout = setTimeout(() => { shouldFlicker = false; }, 2400);
          }
          return;
        }
      }
      typewriterRaf = requestAnimationFrame(typewriterFrame);
    }
    typewriterRaf = requestAnimationFrame(typewriterFrame);
  }

  // --- Core cycle ---

  async function cycle() {
    if (!active) return;

    const text = await fetchNudge();

    if (!text) {
      // If we've hit MAX_CALLS, stop scheduling entirely — MURMUR goes silent
      if (callCount >= MAX_CALLS) return;
      scheduleNext(randomInterval() + 60000);
      return;
    }

    // Crossfade: clear old message briefly before typing new one
    if (currentMessage) {
      isBreathing = false;
      shouldFlicker = false;
      currentMessage = '';
      await sleep(400);
    }

    startTypewriter(text);

    // Decide next interval
    if (isBurstMode && burstRemaining > 0) {
      burstRemaining--;
      scheduleNext(8000 + Math.random() * 7000); // 8-15s burst interval
      if (burstRemaining === 0) isBurstMode = false;
    } else if (Math.random() < 0.20) {
      // Enter burst mode
      isBurstMode = true;
      burstRemaining = 1 + Math.floor(Math.random() * 2); // 1-2 more rapid messages
      scheduleNext(8000 + Math.random() * 7000);
    } else {
      scheduleNext(randomInterval());
    }
  }

  function randomInterval(): number {
    return 90000 + Math.random() * 90000; // 90-180 seconds
  }

  function scheduleNext(delay: number) {
    clearTimeout(cycleTimeout);
    if (!active) return;
    cycleTimeout = setTimeout(cycle, delay);
  }

  // --- Visibility handling ---

  function handleVisibility() {
    if (document.hidden) {
      clearTimeout(cycleTimeout);
      cancelAnimationFrame(typewriterRaf);
      clearTimeout(flickerTimeout);
      // Keep currentMessage — it persists on screen
      isTyping = false;
      if (currentMessage) isBreathing = true;
    } else if (active) {
      scheduleNext(15000 + Math.random() * 15000);
    }
  }

  onMount(() => {
    document.addEventListener('visibilitychange', handleVisibility);
  });

  onDestroy(() => {
    clearTimeout(cycleTimeout);
    cancelAnimationFrame(typewriterRaf);
    clearTimeout(flickerTimeout);
    document.removeEventListener('visibilitychange', handleVisibility);
  });
</script>

{#if active && currentMessage}
  <div
    class="murmur"
    class:breathing={isBreathing}
    class:flickering={shouldFlicker}
    style="right: {scratchpadVisible ? 416 : 16}px"
  >
    <span class="designation">MURMUR.000</span>
    <p class="message">
      {currentMessage.slice(0, displayedChars)}{#if isTyping}<span class="cursor">_</span>{/if}
    </p>
  </div>
{/if}

<style>
  .murmur {
    position: fixed;
    bottom: 12px;
    max-width: 320px;
    z-index: var(--z-murmur);
    pointer-events: none;
    opacity: 0.85;
    transition:
      opacity 400ms var(--ease-out),
      right var(--transition-normal) var(--ease-out);
  }

  .murmur.breathing {
    animation: murmurBreathe 4s ease-in-out infinite;
  }

  .murmur.flickering {
    animation: flicker 0.8s ease-in-out 3;
  }

  @keyframes murmurBreathe {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.72; }
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

  .cursor {
    animation: cursorBlink 530ms step-end infinite;
  }

  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .murmur,
    .murmur.breathing,
    .murmur.flickering {
      animation: none;
      opacity: 0.6;
    }
    .cursor {
      animation: none;
    }
  }
</style>
