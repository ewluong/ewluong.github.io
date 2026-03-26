<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { frequencyData, isPlaying, currentTrack } from '../stores/audio';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let animId: number;
  let freqData = new Uint8Array(0);

  const unsub = frequencyData.subscribe(d => freqData = d);

  function draw() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (freqData.length === 0) {
      animId = requestAnimationFrame(draw);
      return;
    }

    const barCount = freqData.length;
    const barWidth = w / barCount;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const accentDim = getComputedStyle(document.documentElement).getPropertyValue('--accent-dim').trim();

    // Draw frequency bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = (freqData[i] / 255) * h * 0.8;
      const x = i * barWidth;
      const y = h - barHeight;

      ctx.fillStyle = barHeight > h * 0.4 ? accentColor : accentDim;
      ctx.globalAlpha = 0.6 + (freqData[i] / 255) * 0.4;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw center line
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(draw);
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    draw();
  });

  onDestroy(() => {
    cancelAnimationFrame(animId);
    unsub();
    window.removeEventListener('resize', resize);
  });
</script>

<div class="visualizer">
  <div class="viz-header">
    <span class="viz-label">WAVEFORM</span>
    <span class="viz-track">{$isPlaying ? $currentTrack.title : 'idle'}</span>
  </div>
  <div class="viz-canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
  {#if !$isPlaying}
    <p class="viz-idle">play a track to see the waveform</p>
  {/if}
</div>

<style>
  .visualizer {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: var(--space-2);
  }

  .viz-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .viz-label {
    font-size: 11px;
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .viz-track {
    font-size: var(--text-xs);
    color: var(--text-dim);
  }

  .viz-canvas-wrap {
    flex: 1;
    min-height: 120px;
    position: relative;
    background: var(--bg-primary);
    border: 1px solid var(--border);
  }

  .viz-canvas-wrap canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .viz-idle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: center;
  }
</style>
