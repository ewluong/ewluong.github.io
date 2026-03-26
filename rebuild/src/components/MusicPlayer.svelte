<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    tracks,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    favorites,
    frequencyData,
  } from '../stores/audio';
  import { systemStats } from '../stores/system';
  import * as engine from '../lib/audioEngine';

  let audioEl: HTMLAudioElement;
  let currentTime = 0;
  let duration = 0;
  let progressPercent = 0;
  let showTracklist = true;

  // Visualizer
  let vizCanvas: HTMLCanvasElement;
  let vizCtx: CanvasRenderingContext2D | null;
  let animId: number;
  let freqData = new Uint8Array(0);
  let vizMode: 'bars' | 'wave' | 'ring' = 'bars';

  const unsub = frequencyData.subscribe(d => freqData = d);

  $: isFav = $favorites.has($currentTrack.src);
  $: favTracks = tracks.filter(t => $favorites.has(t.src));
  $: trackNum = String($currentTrackIndex + 1).padStart(3, '0');
  $: trackTotal = String(tracks.length).padStart(3, '0');

  function togglePlay() {
    if ($isPlaying) {
      engine.pause();
    } else {
      engine.play();
    }
  }

  function nextTrack() {
    const next = ($currentTrackIndex + 1) % tracks.length;
    currentTrackIndex.set(next);
    engine.setTrack(tracks[next].src);
    systemStats.update(s => ({ ...s, tracksPlayed: s.tracksPlayed + 1 }));
  }

  function prevTrack() {
    const prev = ($currentTrackIndex - 1 + tracks.length) % tracks.length;
    currentTrackIndex.set(prev);
    engine.setTrack(tracks[prev].src);
    systemStats.update(s => ({ ...s, tracksPlayed: s.tracksPlayed + 1 }));
  }

  function handleSeek(e: MouseEvent) {
    const bar = (e.currentTarget as HTMLElement);
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    engine.seek(pct);
  }

  function toggleFavorite() {
    favorites.toggle($currentTrack.src);
  }

  function selectTrack(index: number) {
    currentTrackIndex.set(index);
    engine.setTrack(tracks[index].src);
  }

  function cycleVizMode() {
    const modes: typeof vizMode[] = ['bars', 'wave', 'ring'];
    const i = modes.indexOf(vizMode);
    vizMode = modes[(i + 1) % modes.length];
  }

  function formatTime(s: number): string {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function updateTime() {
    if (!audioEl) return;
    currentTime = audioEl.currentTime;
    duration = audioEl.duration || 0;
    progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  }

  // --- Visualizer rendering ---
  function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const barCount = Math.min(freqData.length, 64);
    const gap = 2;
    const barWidth = (w - gap * barCount) / barCount;
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    const accentDim = styles.getPropertyValue('--accent-dim').trim();

    for (let i = 0; i < barCount; i++) {
      const val = freqData[i] / 255;
      const barHeight = val * h * 0.85;
      const x = i * (barWidth + gap);
      const y = h - barHeight;

      // Mirror bars from center
      ctx.fillStyle = val > 0.5 ? accent : accentDim;
      ctx.globalAlpha = 0.4 + val * 0.6;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Reflection (dim, flipped)
      ctx.globalAlpha = 0.08 + val * 0.08;
      ctx.fillRect(x, h, barWidth, -barHeight * 0.3);
    }

    // Horizontal center line
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawWave(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    const accentDim = styles.getPropertyValue('--accent-dim').trim();
    const count = Math.min(freqData.length, 128);
    const mid = h / 2;

    // Main waveform
    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;

    for (let i = 0; i < count; i++) {
      const x = (i / count) * w;
      const val = (freqData[i] / 255 - 0.5) * h * 0.8;
      if (i === 0) ctx.moveTo(x, mid + val);
      else ctx.lineTo(x, mid + val);
    }
    ctx.stroke();

    // Mirror waveform (inverted, dim)
    ctx.beginPath();
    ctx.strokeStyle = accentDim;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;

    for (let i = 0; i < count; i++) {
      const x = (i / count) * w;
      const val = (freqData[i] / 255 - 0.5) * h * 0.4;
      if (i === 0) ctx.moveTo(x, mid - val);
      else ctx.lineTo(x, mid - val);
    }
    ctx.stroke();

    // Center axis
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }

  function drawRing(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim();
    const accentDim = styles.getPropertyValue('--accent-dim').trim();
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.3;
    const count = Math.min(freqData.length, 64);

    // Outer ring
    ctx.beginPath();
    ctx.strokeStyle = accentDim;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.globalAlpha = 0.08;
    ctx.arc(cx, cy, baseRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Frequency spokes
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const val = freqData[i] / 255;
      const innerR = baseRadius * 0.5;
      const outerR = baseRadius + val * baseRadius * 0.7;

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * outerR;
      const y2 = cy + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.strokeStyle = val > 0.5 ? accent : accentDim;
      ctx.lineWidth = val > 0.5 ? 2 : 1;
      ctx.globalAlpha = 0.3 + val * 0.7;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.6;
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawViz() {
    if (!vizCtx || !vizCanvas) return;
    const w = vizCanvas.width;
    const h = vizCanvas.height;
    vizCtx.clearRect(0, 0, w, h);

    if (freqData.length > 0 && $isPlaying) {
      if (vizMode === 'bars') drawBars(vizCtx, w, h);
      else if (vizMode === 'wave') drawWave(vizCtx, w, h);
      else drawRing(vizCtx, w, h);
    } else {
      // Idle state — dim ring
      const styles = getComputedStyle(document.documentElement);
      const accentDim = styles.getPropertyValue('--accent-dim').trim();
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.25;

      vizCtx.beginPath();
      vizCtx.strokeStyle = accentDim;
      vizCtx.lineWidth = 1;
      vizCtx.globalAlpha = 0.12;
      vizCtx.arc(cx, cy, r, 0, Math.PI * 2);
      vizCtx.stroke();

      vizCtx.globalAlpha = 0.06;
      vizCtx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      vizCtx.stroke();
    }

    vizCtx.globalAlpha = 1;
    animId = requestAnimationFrame(drawViz);
  }

  function resizeViz() {
    if (!vizCanvas) return;
    const rect = vizCanvas.parentElement?.getBoundingClientRect();
    if (rect) {
      vizCanvas.width = rect.width;
      vizCanvas.height = rect.height;
    }
  }

  onMount(() => {
    engine.init(audioEl);
    // Set initial track src so play button works immediately
    audioEl.src = $currentTrack.src;
    audioEl.addEventListener('timeupdate', updateTime);
    audioEl.addEventListener('loadedmetadata', updateTime);
    audioEl.addEventListener('ended', nextTrack);

    vizCtx = vizCanvas.getContext('2d');
    resizeViz();
    window.addEventListener('resize', resizeViz);
    drawViz();
  });

  onDestroy(() => {
    audioEl?.removeEventListener('timeupdate', updateTime);
    audioEl?.removeEventListener('loadedmetadata', updateTime);
    audioEl?.removeEventListener('ended', nextTrack);
    cancelAnimationFrame(animId);
    unsub();
    window.removeEventListener('resize', resizeViz);
  });
</script>

<div class="music-player">
  <audio bind:this={audioEl} preload="none"></audio>

  <!-- Visualizer -->
  <div class="viz-section">
    <div class="viz-canvas-wrap">
      <canvas bind:this={vizCanvas}></canvas>
      {#if !$isPlaying}
        <div class="viz-idle">
          <div class="idle-ring"></div>
          <span class="idle-text">STANDBY</span>
        </div>
      {/if}
    </div>
    <div class="viz-controls">
      <button class="viz-mode-btn" on:click={cycleVizMode}>
        MODE: {vizMode.toUpperCase()}
      </button>
      <span class="viz-status" class:active={$isPlaying}>
        {$isPlaying ? 'SIGNAL ACTIVE' : 'NO SIGNAL'}
      </span>
    </div>
  </div>

  <!-- Now playing -->
  <div class="now-playing">
    <div class="np-header">
      <span class="np-label">NOW PLAYING</span>
      <span class="np-counter">[{trackNum}/{trackTotal}]</span>
    </div>
    <div class="np-track">
      <span class="np-title">{$currentTrack.title}</span>
      <span class="np-artist">{$currentTrack.artist}</span>
    </div>
  </div>

  <!-- Transport controls -->
  <div class="transport">
    <div class="transport-buttons">
      <button class="transport-btn" on:click={prevTrack} aria-label="Previous">
        <span class="btn-icon">|&lt;</span>
      </button>
      <button class="transport-btn play-btn" class:playing={$isPlaying} on:click={togglePlay} aria-label={$isPlaying ? 'Pause' : 'Play'}>
        <span class="btn-icon">{$isPlaying ? '||' : '>'}</span>
        <span class="btn-ring"></span>
      </button>
      <button class="transport-btn" on:click={nextTrack} aria-label="Next">
        <span class="btn-icon">&gt;|</span>
      </button>
      <button
        class="transport-btn fav-btn"
        class:active={isFav}
        on:click={toggleFavorite}
        aria-label="Favorite"
      >
        <span class="btn-icon">{isFav ? '★' : '☆'}</span>
      </button>
    </div>
  </div>

  <!-- Progress / seek bar -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="seek-section">
    <div class="seek-bar" on:click={handleSeek}>
      <div class="seek-track"></div>
      <div class="seek-fill" style="width: {progressPercent}%"></div>
      <div class="seek-head" style="left: {progressPercent}%"></div>
    </div>
    <div class="seek-times">
      <span class="time">{formatTime(currentTime)}</span>
      <span class="time">{formatTime(duration)}</span>
    </div>
  </div>

  <!-- Track list -->
  <div class="tracklist-section">
    <button class="tracklist-toggle" on:click={() => showTracklist = !showTracklist}>
      {showTracklist ? '▼' : '▶'} TRANSMISSION LOG ({tracks.length})
    </button>

    {#if showTracklist}
      <div class="tracklist">
        {#each tracks as track, i}
          {@const isActive = i === $currentTrackIndex}
          {@const isFavTrack = $favorites.has(track.src)}
          <button
            class="track-row"
            class:active={isActive}
            on:click={() => selectTrack(i)}
          >
            <span class="track-index">{String(i + 1).padStart(2, '0')}</span>
            <span class="track-indicator">{isActive && $isPlaying ? '▶' : isActive ? '■' : '·'}</span>
            <span class="track-name">{track.title}</span>
            {#if isFavTrack}
              <span class="track-fav">★</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .music-player {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-size: var(--text-sm);
    height: 100%;
  }

  /* ========== VISUALIZER ========== */

  .viz-section {
    flex-shrink: 0;
  }

  .viz-canvas-wrap {
    position: relative;
    height: 160px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .viz-canvas-wrap canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .viz-idle {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .idle-ring {
    width: 48px;
    height: 48px;
    border: 1px solid var(--accent-dim);
    border-radius: 50%;
    opacity: 0.2;
    animation: idlePulse 4s ease-in-out infinite;
  }

  @keyframes idlePulse {
    0%, 100% { transform: scale(1); opacity: 0.15; }
    50% { transform: scale(1.08); opacity: 0.25; }
  }

  .idle-text {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.16em;
  }

  .viz-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-1);
  }

  .viz-mode-btn {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .viz-mode-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .viz-status {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .viz-status.active {
    color: var(--status-nominal);
    animation: statusBlink 2s ease-in-out infinite;
  }

  @keyframes statusBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ========== NOW PLAYING ========== */

  .now-playing {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .np-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .np-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.14em;
  }

  .np-counter {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
  }

  .np-track {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .np-title {
    font-size: var(--text-lg);
    color: var(--text-primary);
    letter-spacing: 0.02em;
  }

  .np-artist {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  /* ========== TRANSPORT ========== */

  .transport {
    display: flex;
    justify-content: center;
  }

  .transport-buttons {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .transport-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
    position: relative;
  }

  .transport-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent-dim);
    background: var(--bg-surface-hover);
  }

  .transport-btn:active {
    transform: scale(0.92);
  }

  .play-btn {
    width: 52px;
    height: 52px;
    border-color: var(--accent-dim);
    color: var(--accent);
    font-size: var(--text-lg);
  }

  .play-btn:hover {
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--accent-glow);
  }

  .play-btn.playing {
    border-color: var(--accent);
    box-shadow: 0 0 20px var(--accent-glow);
  }

  .play-btn .btn-ring {
    position: absolute;
    inset: -4px;
    border: 1px solid var(--accent-dim);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .play-btn:hover .btn-ring,
  .play-btn.playing .btn-ring {
    opacity: 0.4;
  }

  .play-btn.playing .btn-ring {
    animation: ringPulse 2s ease-in-out infinite;
  }

  @keyframes ringPulse {
    0%, 100% { inset: -4px; opacity: 0.4; }
    50% { inset: -8px; opacity: 0.1; }
  }

  .fav-btn.active {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .btn-icon {
    position: relative;
    z-index: 1;
  }

  /* ========== SEEK BAR ========== */

  .seek-section {
    padding: 0;
  }

  .seek-bar {
    position: relative;
    height: 8px;
    cursor: pointer;
    margin-bottom: var(--space-1);
  }

  .seek-track {
    position: absolute;
    inset: 0;
    background: var(--border);
  }

  .seek-fill {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: var(--accent-dim);
    transition: width 0.15s linear;
  }

  .seek-head {
    position: absolute;
    top: -3px;
    width: 3px;
    height: 14px;
    background: var(--accent);
    transform: translateX(-1px);
    transition: left 0.15s linear;
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .seek-bar:hover .seek-head {
    width: 5px;
    top: -4px;
    height: 16px;
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .seek-times {
    display: flex;
    justify-content: space-between;
  }

  .time {
    font-size: var(--text-xs);
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  /* ========== TRACKLIST ========== */

  .tracklist-section {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .tracklist-toggle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) 0;
    margin-bottom: var(--space-2);
    transition: color var(--transition-fast);
    text-align: left;
  }

  .tracklist-toggle:hover {
    color: var(--text-secondary);
  }

  .tracklist {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    text-align: left;
    border-left: 2px solid transparent;
  }

  .track-row:hover {
    color: var(--text-primary);
    background: var(--bg-surface-hover);
    border-left-color: var(--border-active);
  }

  .track-row.active {
    color: var(--accent);
    border-left-color: var(--accent);
    background: var(--bg-surface);
  }

  .track-index {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    min-width: 20px;
  }

  .track-row.active .track-index {
    color: var(--accent-dim);
  }

  .track-indicator {
    min-width: 14px;
    color: var(--accent);
    text-align: center;
  }

  .track-name {
    flex: 1;
  }

  .track-fav {
    color: var(--accent-dim);
    font-size: var(--text-xs);
  }
</style>
