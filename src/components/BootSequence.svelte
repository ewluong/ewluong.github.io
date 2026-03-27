<script lang="ts">
  import { onMount } from 'svelte';
  import { bootPhase, bootMessages, statusMessage, bootTime, systemStats } from '../stores/system';
  import { playBoot } from '../lib/uiSounds';
  import { seededRng } from '../lib/bibleVerses';

  let visible = true;
  let lines: Array<{ text: string; type: 'hex' | 'check' | 'clearance' | 'final' }> = [];
  let phase: 'hex' | 'verify' | 'clearance' | 'done' = 'hex';

  // Phase 1: Hex memory initialization
  const HEX_LINES = [
    '0x7F3A:0200  MEMCHK .................. OK',
    '0xE100:FACE  STACK ALLOC ............. OK',
    '0x0042:DEAD  COGNITIVE MAP ........... LOADED',
    '0xBEEF:C0DE  SYMBOL TABLE ............ OK',
    '0x00FF:1CE0  SENSORY BUFFER .......... ALLOCATED',
    '0xCAFE:BABE  CONTEXT FRAME ........... OK',
    '0xDEAD:F00D  EPISODIC MEMORY ......... SYNCED',
    '0x1337:7331  PATTERN ENGINE .......... READY',
  ];

  // Phase 2: System verification
  const VERIFY_LINES = [
    '[SYS.001] COGNITIVE FRAMEWORK .............. NOMINAL',
    '[SYS.002] AUDIO SUBSYSTEM .................. ACTIVE',
    '[SYS.003] CANVAS RENDER PIPELINE ........... READY',
    '[SYS.004] CONTENT COLLECTION SYNC .......... VERIFIED',
    '[SYS.005] PATTERN CLASSIFICATION ........... CONFIRMED',
    '[SYS.006] SESSION STATE .................... RESTORING',
  ];

  // Phase 3: Final clearance
  const CLEARANCE_LINES = [
    'MAGI CONSENSUS: UNANIMOUS',
    'CLASSIFICATION: PATTERN BLUE — CONFIRMED',
  ];

  // Grounding phrases — deterministic by date. The same phrase accompanies the same day.
  const GROUNDING_PHRASES = [
    'just chasing the wind...',
    'be still, and know.',
    'the unexamined life is not worth living.',
    'existence precedes essence.',
    'one must imagine Sisyphus happy.',
    'in the midst of winter — an invincible summer.',
    'all is vanity. all is grace.',
    'what has been will be again.',
    'walk humbly. act justly. love mercy.',
    'the wind blows where it wishes.',
    'to live is to be slowly born.',
    'we are what we repeatedly do.',
    'fear and trembling.',
    'not all who wander are lost.',
    'the center cannot hold.',
    'there is a crack in everything.',
    'amor fati.',
    'faith is the substance of things hoped for.',
    'the only way out is through.',
    'I think, therefore I am — therefore I doubt.',
    'between stimulus and response, there is a space.',
    'to whom much is given, much is required.',
    'memento mori.',
    'he who has ears, let him hear.',
    'the truth will set you free.',
    'we see through a glass, darkly.',
    'selah.',
    'sufficient unto the day is the evil thereof.',
    'soli deo gloria.',
    'this too shall pass — and this too is grace.',
  ];

  function getDailyPhrase(): string {
    const today = new Date().toISOString().slice(0, 10);
    const rng = seededRng(today + '-ewluong-os-boot');
    const index = Math.floor(rng() * GROUNDING_PHRASES.length);
    return GROUNDING_PHRASES[index];
  }

  const FINAL_LINE = '> ' + getDailyPhrase();

  const HEX_DELAY = 80;
  const VERIFY_DELAY = 400;
  const CLEARANCE_DELAY = 300;
  const FADE_DELAY = 800;

  onMount(() => {
    bootPhase.set('booting');
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let destroyed = false;

    function safeTimeout(fn: () => void, ms: number) {
      if (destroyed) return;
      const id = setTimeout(fn, ms);
      timeouts.push(id);
    }

    // Phase 1: Hex scroll
    let hexIndex = 0;
    const hexInterval = setInterval(() => {
      if (destroyed) { clearInterval(hexInterval); return; }
      if (hexIndex < HEX_LINES.length) {
        lines = [...lines, { text: HEX_LINES[hexIndex], type: 'hex' }];
        hexIndex++;
      } else {
        clearInterval(hexInterval);
        phase = 'verify';

        // Phase 2: System verification
        let verifyIndex = 0;
        function verifyTick() {
          if (destroyed) return;
          if (verifyIndex < VERIFY_LINES.length) {
            lines = [...lines, { text: VERIFY_LINES[verifyIndex], type: 'check' }];
            verifyIndex++;
            safeTimeout(verifyTick, VERIFY_DELAY);
          } else {
            phase = 'clearance';
            playBoot();

            // Phase 3: Clearance
            let clearIndex = 0;
            function clearTick() {
              if (destroyed) return;
              if (clearIndex < CLEARANCE_LINES.length) {
                lines = [...lines, { text: CLEARANCE_LINES[clearIndex], type: 'clearance' }];
                clearIndex++;
                safeTimeout(clearTick, CLEARANCE_DELAY);
              } else {
                // Final line
                safeTimeout(() => {
                  if (destroyed) return;
                  lines = [...lines, { text: FINAL_LINE, type: 'final' }];
                  bootMessages.set(lines.map(l => l.text));

                  // Fade out and transition to ready
                  safeTimeout(() => {
                    if (destroyed) return;
                    visible = false;
                    const now = Date.now();
                    bootPhase.set('ready');
                    bootTime.set(now);
                    systemStats.update(s => ({ ...s, bootTime: now }));
                    statusMessage.set(getDailyPhrase());
                  }, FADE_DELAY);
                }, 400);
              }
            }
            safeTimeout(clearTick, CLEARANCE_DELAY);
          }
        }
        safeTimeout(verifyTick, VERIFY_DELAY);
      }
    }, HEX_DELAY);

    return () => {
      destroyed = true;
      clearInterval(hexInterval);
      timeouts.forEach(clearTimeout);
    };
  });

  /** Extract the status word (last word) from a check/hex line for accent coloring */
  function splitStatus(text: string): { prefix: string; status: string } {
    const match = text.match(/^(.+\.\.\.*\s+)(\S+)$/);
    if (match) return { prefix: match[1], status: match[2] };
    return { prefix: text, status: '' };
  }
</script>

{#if visible}
  <div class="boot-overlay" class:fading={!visible}>
    <div class="boot-terminal">
      {#each lines as line, i}
        <div
          class="boot-line boot-{line.type}"
          style="animation-delay: {i * 20}ms"
        >
          {#if line.type === 'hex' || line.type === 'check'}
            {@const parts = splitStatus(line.text)}
            <span class="line-prefix">{parts.prefix}</span><span class="line-status">{parts.status}</span>
          {:else if line.type === 'clearance'}
            {line.text}
          {:else}
            {line.text}
          {/if}
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

  .boot-overlay::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.06) 2px,
      rgba(0, 0, 0, 0.06) 4px
    );
  }

  .boot-overlay.fading {
    opacity: 0;
    pointer-events: none;
  }

  .boot-terminal {
    font-family: var(--font-system);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    max-width: 580px;
    width: 100%;
    padding: var(--space-8);
  }

  .boot-line {
    opacity: 0;
    animation: fadeIn var(--transition-normal) var(--ease-out) forwards;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
  }

  /* Hex lines — dense, dim, fast */
  .boot-hex {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .boot-hex .line-prefix {
    color: var(--text-dim);
  }

  .boot-hex .line-status {
    color: var(--status-nominal);
  }

  /* System verification — structured, important */
  .boot-check {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .boot-check .line-prefix {
    color: var(--text-secondary);
  }

  .boot-check .line-status {
    color: var(--accent);
    font-weight: bold;
  }

  /* Clearance — bright, authoritative */
  .boot-clearance {
    font-size: var(--text-sm);
    color: var(--accent);
    margin-top: var(--space-2);
    letter-spacing: 0.05em;
    text-shadow: 0 0 10px var(--accent-glow);
  }

  /* Final line — the personal touch */
  .boot-final {
    color: var(--accent);
    font-size: var(--text-lg);
    margin-top: var(--space-4);
    text-shadow: 0 0 14px var(--accent-glow);
    animation: fadeIn var(--transition-normal) var(--ease-out) forwards, flicker 5s linear 1s infinite;
  }

  .boot-cursor {
    display: inline-block;
    color: var(--accent);
    animation: blink 1s step-end infinite;
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .line-status {
    /* fallback */
  }

  .line-prefix {
    /* fallback */
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
