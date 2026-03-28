<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isIdle, initIdleDetector, destroyIdleDetector } from '../lib/idleDetector';

  const STORAGE_KEY = 'ewluong-os-screensaver';

  type ScreensaverMode = 'geometric' | 'matrix' | 'clock' | 'cycle';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animId: number | null = null;
  let mode: ScreensaverMode = 'cycle';
  let currentMode: 'geometric' | 'matrix' | 'clock' = 'geometric';
  let cycleInterval: ReturnType<typeof setInterval>;
  let visible = false;
  let opacity = 0;
  let fadeDir: 'in' | 'out' | null = null;
  let time = 0;
  let fadeInterval: ReturnType<typeof setInterval> | null = null;

  // Matrix columns
  let matrixColumns: number[] = [];
  const MATRIX_CHARS = '0123456789ABCDEF:NERVSEELEMAGI01';
  const MATRIX_FONT_SIZE = 16;

  function loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.mode) mode = parsed.mode;
    } catch {}
  }

  function pickMode(): 'geometric' | 'matrix' | 'clock' {
    if (mode !== 'cycle') return mode as any;
    const modes: Array<'geometric' | 'matrix' | 'clock'> = ['geometric', 'matrix', 'clock'];
    return modes[Math.floor(Math.random() * modes.length)];
  }

  function initMatrix(w: number) {
    const cols = Math.floor(w / MATRIX_FONT_SIZE);
    matrixColumns = new Array(cols).fill(0).map(() => Math.random() * -50);
  }

  function drawGeometric(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const cx = w / 2;
    const cy = h / 2;

    for (let ring = 0; ring < 6; ring++) {
      const baseRadius = 40 + ring * 50;
      const pulseRadius = baseRadius + Math.sin(t * 0.5 + ring * 0.8) * 15;
      const rotation = t * 0.1 * (ring % 2 === 0 ? 1 : -1);
      const sides = ring < 3 ? 6 : 8;
      const alpha = 0.08 + Math.sin(t * 0.3 + ring) * 0.04;

      ctx.strokeStyle = `rgba(212, 160, 68, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotation;
        const x = cx + Math.cos(angle) * pulseRadius;
        const y = cy + Math.sin(angle) * pulseRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Center dot
    const dotAlpha = 0.3 + Math.sin(t * 0.8) * 0.2;
    ctx.fillStyle = `rgba(212, 160, 68, ${dotAlpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMatrix(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Semi-transparent black overlay for trail effect
    ctx.fillStyle = 'rgba(10, 10, 20, 0.08)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${MATRIX_FONT_SIZE}px 'VT323', monospace`;

    for (let i = 0; i < matrixColumns.length; i++) {
      const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      const x = i * MATRIX_FONT_SIZE;
      const y = matrixColumns[i] * MATRIX_FONT_SIZE;

      // Head character brighter
      ctx.fillStyle = `rgba(212, 160, 68, ${0.6 + Math.random() * 0.4})`;
      ctx.fillText(char, x, y);

      if (y > h && Math.random() > 0.98) {
        matrixColumns[i] = 0;
      }
      matrixColumns[i] += 0.4 + Math.random() * 0.3;
    }
  }

  function drawClock(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const breathe = 0.5 + Math.sin(t * 0.3) * 0.15;

    ctx.fillStyle = `rgba(212, 160, 68, ${breathe})`;
    ctx.font = "120px 'VT323', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, w / 2, h / 2);

    // Date below
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    ctx.fillStyle = `rgba(212, 160, 68, ${breathe * 0.4})`;
    ctx.font = "28px 'VT323', monospace";
    ctx.fillText(dateStr, w / 2, h / 2 + 70);

    // SEELE MODE label
    ctx.fillStyle = `rgba(212, 160, 68, ${breathe * 0.2})`;
    ctx.font = "18px 'VT323', monospace";
    ctx.fillText('SEELE MODE', w / 2, h / 2 - 80);
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    time += 0.016;

    if (currentMode !== 'matrix') {
      ctx.clearRect(0, 0, w, h);
    }

    if (currentMode === 'geometric') drawGeometric(ctx, w, h, time);
    else if (currentMode === 'matrix') drawMatrix(ctx, w, h);
    else if (currentMode === 'clock') drawClock(ctx, w, h, time);

    animId = requestAnimationFrame(render);
  }

  function startScreensaver() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    currentMode = pickMode();
    time = 0;

    if (currentMode === 'matrix') {
      initMatrix(canvas.width);
      // Clear canvas to black for matrix
      if (ctx) {
        ctx.fillStyle = 'rgba(10, 10, 20, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    visible = true;
    fadeDir = 'in';
    opacity = 0;

    // Clear any existing fade before starting new one
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      opacity = Math.min(1, opacity + 0.04);
      if (opacity >= 1) {
        if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
        fadeDir = null;
      }
    }, 16);

    render();

    // Cycle mode every 60s if in cycle mode
    if (mode === 'cycle') {
      cycleInterval = setInterval(() => {
        currentMode = pickMode();
        time = 0;
        if (currentMode === 'matrix' && canvas && ctx) {
          initMatrix(canvas.width);
          ctx.fillStyle = 'rgba(10, 10, 20, 1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }, 60000);
    }
  }

  function stopScreensaver() {
    fadeDir = 'out';
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      opacity = Math.max(0, opacity - 0.06);
      if (opacity <= 0) {
        if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
        fadeDir = null;
        visible = false;
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        clearInterval(cycleInterval);
      }
    }, 16);
  }

  // React to idle state
  $: if ($isIdle) {
    startScreensaver();
  } else if (visible) {
    stopScreensaver();
  }

  onMount(() => {
    loadSettings();
    initIdleDetector();
  });

  onDestroy(() => {
    destroyIdleDetector();
    if (animId) cancelAnimationFrame(animId);
    if (fadeInterval) clearInterval(fadeInterval);
    clearInterval(cycleInterval);
  });
</script>

{#if visible}
  <div class="screensaver" style="opacity: {opacity}">
    <canvas bind:this={canvas}></canvas>
  </div>
{/if}

<style>
  .screensaver {
    position: fixed;
    inset: 0;
    z-index: 450;
    background: var(--bg-primary);
    cursor: none;
    transition: opacity 300ms;
  }

  canvas {
    width: 100%;
    height: 100%;
  }
</style>
