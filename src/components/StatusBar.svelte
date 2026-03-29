<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { statusMessage, bootPhase, bootTime } from '../stores/system';
  import { isPlaying, currentTrack, frequencyData } from '../stores/audio';
  import { focusedWindow } from '../stores/windows';
  import { soundSettings } from '../stores/sound';
  import { sessionMemory, getTimeOfDay, sessionVector, sessionSealMessage, driftModifiers, coherenceState } from '../stores/temporal';
  import { silenceActive } from '../stores/silence';

  function buildStatusMessages(): string[] {
    const base = [
      'just chasing the wind...',
      'the unexamined life is not worth living',
      'one must imagine Sisyphus happy',
      'existence precedes essence',
      'we are condemned to be free',
      'in the midst of winter, I found there was, within me, an invincible summer',
      'DEFCON.0 — ALL SYSTEMS NOMINAL',
      'PATTERN BLUE — NO ANOMALIES',
      'MAGI CONSENSUS: 3/3',
      'AT FIELD: STABLE',
      'SYNC RATIO: 98.2%',
    ];

    // Add time-of-day aware messages
    const tod = getTimeOfDay();
    switch (tod) {
      case 'late-night':
        base.push('the night is long, but finite');
        base.push('NOCTURNAL OPERATIONS ACTIVE');
        break;
      case 'morning':
        base.push('a new cycle begins');
        base.push('MORNING SYSTEMS INITIALIZED');
        break;
      case 'evening':
        base.push('day cycle winding down');
        base.push('TRANSITIONING TO LOW POWER');
        break;
      case 'night':
        base.push('operating in night watch mode');
        break;
    }

    return base;
  }

  let STATUS_MESSAGES = buildStatusMessages();

  let messageIndex = 0;
  let interval: ReturnType<typeof setInterval>;
  let clockInterval: ReturnType<typeof setInterval>;
  let clock = '';
  let uptime = '';

  // Mini waveform bars
  let bars = [0, 0, 0, 0];
  let messageFading = false;
  const FREQ_BINS = [2, 8, 20, 40];

  function updateClock() {
    const now = new Date();
    clock = now.toTimeString().slice(0, 8); // HH:MM:SS

    const btVal = get(bootTime);

    if (btVal > 0) {
      const elapsed = Math.floor((Date.now() - btVal) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      uptime = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
  }

  // Subscribe to frequency data for mini waveform
  let currentFreqData: Uint8Array = new Uint8Array(128);
  const unsubFreq = frequencyData.subscribe(v => {
    currentFreqData = v;
    if ($isPlaying) {
      bars = FREQ_BINS.map(bin => {
        const val = currentFreqData[bin] ?? 0;
        return Math.max(2, (val / 255) * 14);
      });
    } else {
      bars = [2, 2, 2, 2];
    }
  });

  function startIntervals() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    interval = setInterval(() => {
      messageFading = true;
      setTimeout(() => {
        const dl = $driftModifiers.driftLevel;
        if (dl >= 5) {
          statusMessage.set('EXTENDED DRIFT — REORIENT OR SEAL');
        } else if (dl >= 4) {
          const dm = Math.round($coherenceState.driftMinutes);
          const vec = $sessionVector || '—';
          statusMessage.set(`DRIFT: ${dm}m — VECTOR: ${vec}`);
        } else if (dl >= 3 && Math.random() < 0.4) {
          statusMessage.set('DRIFT DETECTED');
        } else {
          messageIndex = (messageIndex + 1) % STATUS_MESSAGES.length;
          statusMessage.set(STATUS_MESSAGES[messageIndex]);
        }
        messageFading = false;
      }, 400);
    }, 15000);
  }

  function stopIntervals() {
    clearInterval(interval);
    clearInterval(clockInterval);
  }

  function handleVisibility() {
    if (document.hidden) {
      stopIntervals();
    } else {
      startIntervals();
    }
  }

  onMount(() => {
    startIntervals();
    document.addEventListener('visibilitychange', handleVisibility);
  });

  onDestroy(() => {
    stopIntervals();
    unsubFreq();
    document.removeEventListener('visibilitychange', handleVisibility);
  });

  $: focusLabel = $focusedWindow ? $focusedWindow.title : 'workspace';
  $: focusDesignation = $focusedWindow?.designation ?? '';
  $: audioLabel = $isPlaying ? `♪ ${$currentTrack.title}` : '';
</script>

{#if $bootPhase === 'ready'}
  <div class="status-bar" class:silence={$silenceActive} role="status" aria-live="polite">
    {#if $silenceActive}
      <!-- Silence mode: minimal display -->
      <div class="status-left"></div>
      <span class="status-message status-silence-label">SILENCE</span>
      <div class="status-right">
        <div class="status-metrics">
          <span class="status-clock">{clock}</span>
          <span class="status-divider">|</span>
          <span class="status-uptime">UP {uptime}</span>
        </div>
      </div>
    {:else}
      <!-- Normal mode -->
      <div class="status-left">
        {#if $sessionVector}
          <span class="status-vector">VECTOR: {$sessionVector}</span>
          <span class="status-sep">|</span>
        {/if}
        {#if focusDesignation}
          <span class="status-designation">[{focusDesignation}]</span>
        {/if}
        <span class="status-focus">{focusLabel}</span>
      </div>

      {#if $sessionSealMessage}
        <span class="status-seal">{$sessionSealMessage}</span>
      {:else}
        <span class="status-message" class:fading={messageFading}>{$statusMessage}</span>
      {/if}

      <div class="status-right">
        <button class="sound-toggle" on:click={() => soundSettings.toggle()} title={$soundSettings.enabled ? 'Mute UI sounds' : 'Enable UI sounds'}>
          {$soundSettings.enabled ? 'SND' : 'MUTE'}
        </button>
        <div class="status-metrics">
          <span class="status-clock">{clock}</span>
          <span class="status-divider">|</span>
          <span class="status-uptime">UP {uptime}</span>
        </div>

        {#if $isPlaying}
          <div class="mini-waveform">
            {#each bars as height}
              <div class="wave-bar" style="height: {height}px"></div>
            {/each}
          </div>
        {/if}

        <span class="status-audio">{audioLabel}</span>
      </div>
    {/if}
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
    padding: var(--space-2) var(--space-4);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    font-size: var(--text-xs);
    color: var(--text-dim);
    height: 38px;
    gap: var(--space-4);
    transition: background 3s var(--ease-out), border-color 3s var(--ease-out);
  }

  .status-bar.silence {
    background: transparent;
    border-bottom-color: transparent;
  }

  .status-silence-label {
    letter-spacing: 0.2em;
    color: var(--text-dim);
    opacity: 0.5;
  }

  .status-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 160px;
  }

  .status-vector {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.1em;
    font-variant-numeric: tabular-nums;
  }

  .status-sep {
    color: var(--border-active);
    font-size: var(--text-xs);
  }

  .status-designation {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    animation: flicker 6s linear infinite;
  }

  .status-focus {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .status-message {
    color: var(--text-secondary);
    font-style: italic;
    transition: opacity 400ms ease-in-out;
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.7;
  }

  .status-message.fading {
    opacity: 0;
  }

  .status-seal {
    color: var(--accent);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 0 8px var(--accent-glow);
    animation: sealFade 3s ease-out forwards;
  }

  @keyframes sealFade {
    0% { opacity: 0; }
    15% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .status-right {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 200px;
    justify-content: flex-end;
  }

  .status-metrics {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
  }

  .status-clock {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .status-divider {
    color: var(--border-active);
  }

  .status-uptime {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .mini-waveform {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 18px;
  }

  .wave-bar {
    width: 3px;
    background: var(--accent);
    border-radius: 1px;
    transition: height 100ms ease-out;
    min-height: 2px;
  }

  .sound-toggle {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: 1px var(--space-2);
    border: 1px solid var(--border);
    transition: color var(--transition-fast), border-color var(--transition-fast);
  }

  .sound-toggle:hover {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
  }

  .status-audio {
    color: var(--accent-dim);
    white-space: nowrap;
  }
</style>
