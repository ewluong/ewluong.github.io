<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    tracks,
    currentTrackIndex,
    currentTrack,
    isPlaying,
    favorites,
  } from '../stores/audio';
  import { windowStore } from '../stores/windows';
  import * as engine from '../lib/audioEngine';

  let audioEl: HTMLAudioElement;
  let currentTime = 0;
  let duration = 0;
  let progressPercent = 0;
  let showFavorites = false;

  $: isFav = $favorites.has($currentTrack.src);
  $: favTracks = tracks.filter(t => $favorites.has(t.src));

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
  }

  function prevTrack() {
    const prev = ($currentTrackIndex - 1 + tracks.length) % tracks.length;
    currentTrackIndex.set(prev);
    engine.setTrack(tracks[prev].src);
  }

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement;
    engine.seek(parseFloat(target.value) / 100);
  }

  function toggleFavorite() {
    favorites.toggle($currentTrack.src);
  }

  function toggleFavList() {
    showFavorites = !showFavorites;
  }

  function selectTrack(index: number) {
    currentTrackIndex.set(index);
    engine.setTrack(tracks[index].src);
  }

  function openVisualizer() {
    windowStore.toggle('visualizer');
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

  onMount(() => {
    engine.init(audioEl);
    audioEl.addEventListener('timeupdate', updateTime);
    audioEl.addEventListener('loadedmetadata', updateTime);
    audioEl.addEventListener('ended', nextTrack);
  });

  onDestroy(() => {
    audioEl?.removeEventListener('timeupdate', updateTime);
    audioEl?.removeEventListener('loadedmetadata', updateTime);
    audioEl?.removeEventListener('ended', nextTrack);
  });
</script>

<div class="music-player">
  <!-- Hidden audio element -->
  <audio bind:this={audioEl} src={$currentTrack.src} preload="none"></audio>

  <!-- Track info -->
  <div class="track-info">
    <span class="track-title">{$currentTrack.title}</span>
    <span class="track-artist">{$currentTrack.artist}</span>
  </div>

  <!-- Controls -->
  <div class="controls">
    <button class="ctrl-btn" on:click={prevTrack} aria-label="Previous track">
      &lt;&lt;
    </button>
    <button class="ctrl-btn play-btn" on:click={togglePlay} aria-label={$isPlaying ? 'Pause' : 'Play'}>
      {$isPlaying ? '||' : '>>'}
    </button>
    <button class="ctrl-btn" on:click={nextTrack} aria-label="Next track">
      &gt;&gt;
    </button>
    <button
      class="ctrl-btn fav-btn"
      class:active={isFav}
      on:click={toggleFavorite}
      aria-label="Favorite"
    >
      {isFav ? '*' : 'o'}
    </button>
    <button class="ctrl-btn" on:click={toggleFavList} aria-label="Show favorites">
      [...]
    </button>
  </div>

  <!-- Progress -->
  <div class="progress-row">
    <span class="time">{formatTime(currentTime)}</span>
    <div class="progress-bar-container">
      <label for="music-progress" class="visually-hidden">Audio progress</label>
      <input
        id="music-progress"
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={progressPercent}
        on:input={handleSeek}
        class="progress-bar"
      />
      <div class="progress-fill" style="width: {progressPercent}%"></div>
    </div>
    <span class="time">{formatTime(duration)}</span>
  </div>

  <!-- Visualizer link -->
  <button class="visualizer-link" on:click={openVisualizer}>
    waveform >>>
  </button>

  <!-- Favorites dropdown -->
  {#if showFavorites}
    <div class="favorites-panel">
      <p class="panel-label">FAVORITES</p>
      {#if favTracks.length === 0}
        <p class="empty-msg">No favorites yet</p>
      {:else}
        {#each favTracks as fav}
          <button
            class="fav-item"
            class:playing={fav.src === $currentTrack.src}
            on:click={() => selectTrack(tracks.indexOf(fav))}
          >
            {fav.title}
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- Track list -->
  <div class="track-list">
    <p class="panel-label">TRACKS</p>
    {#each tracks as track, i}
      <button
        class="track-item"
        class:playing={i === $currentTrackIndex}
        on:click={() => selectTrack(i)}
      >
        <span class="track-indicator">{i === $currentTrackIndex && $isPlaying ? '>' : ' '}</span>
        {track.title}
      </button>
    {/each}
  </div>
</div>

<style>
  .music-player {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }

  .track-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .track-title {
    color: var(--text-primary);
    font-size: var(--text-base);
  }

  .track-artist {
    color: var(--text-dim);
    font-size: var(--text-xs);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .ctrl-btn {
    padding: var(--space-1) var(--space-2);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    transition: color var(--transition-fast);
  }

  .ctrl-btn:hover {
    color: var(--text-primary);
  }

  .play-btn {
    color: var(--accent);
    font-size: var(--text-base);
  }

  .fav-btn.active {
    color: var(--accent);
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .time {
    font-size: var(--text-xs);
    color: var(--text-dim);
    min-width: 36px;
  }

  .progress-bar-container {
    flex: 1;
    position: relative;
    height: 4px;
    background: var(--border);
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--accent-dim);
    pointer-events: none;
    transition: width 0.1s linear;
  }

  .progress-bar {
    position: absolute;
    top: -6px;
    left: 0;
    width: 100%;
    height: 16px;
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }

  .visualizer-link {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: left;
    transition: color var(--transition-fast);
  }

  .visualizer-link:hover {
    color: var(--accent-dim);
  }

  .panel-label {
    font-size: 11px;
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-2);
  }

  .favorites-panel {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .fav-item, .track-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: var(--space-1) 0;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    transition: color var(--transition-fast);
  }

  .fav-item:hover, .track-item:hover {
    color: var(--text-primary);
  }

  .fav-item.playing, .track-item.playing {
    color: var(--accent);
  }

  .track-list {
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .track-indicator {
    display: inline-block;
    width: 12px;
    color: var(--accent);
  }

  .empty-msg {
    color: var(--text-dim);
    font-size: var(--text-xs);
  }
</style>
