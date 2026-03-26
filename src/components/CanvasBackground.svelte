<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { rmsLevel } from '../stores/audio';
  import { bootPhase } from '../stores/system';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let animationId: number;
  let shapes: Shape[] = [];
  let mouseX = -1000;
  let mouseY = -1000;
  let currentRms = 0;

  // Subscribe to RMS
  const unsubRms = rmsLevel.subscribe(v => currentRms = v);

  interface Shape {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    baseRadius: number;
    sides: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
  }

  const SHAPE_COUNT = 6;
  const MOUSE_REPEL_RADIUS = 120;
  const MOUSE_REPEL_FORCE = 0.3;
  const BASE_SPEED = 0.15;
  const DAMPING = 0.998;

  function createShape(w: number, h: number): Shape {
    const sides = Math.random() > 0.5 ? 6 : 5; // hexagons and pentagons
    const baseRadius = 20 + Math.random() * 40;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * BASE_SPEED,
      vy: (Math.random() - 0.5) * BASE_SPEED,
      radius: baseRadius,
      baseRadius,
      sides,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      opacity: 0.04 + Math.random() * 0.06,
    };
  }

  function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.beginPath();
    for (let i = 0; i <= shape.sides; i++) {
      const angle = (i / shape.sides) * Math.PI * 2 + shape.rotation;
      const x = shape.x + Math.cos(angle) * shape.radius;
      const y = shape.y + Math.sin(angle) * shape.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Get accent color from CSS custom properties
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = shape.opacity;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function update(w: number, h: number) {
    for (const shape of shapes) {
      // Audio-reactive radius (smooth breathing)
      shape.radius = shape.baseRadius + currentRms * shape.baseRadius * 0.5;

      // Mouse repulsion
      const dx = shape.x - mouseX;
      const dy = shape.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_REPEL_RADIUS && dist > 0) {
        const force = (1 - dist / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_FORCE;
        shape.vx += (dx / dist) * force;
        shape.vy += (dy / dist) * force;
      }

      // Damping
      shape.vx *= DAMPING;
      shape.vy *= DAMPING;

      // Move
      shape.x += shape.vx;
      shape.y += shape.vy;
      shape.rotation += shape.rotationSpeed;

      // Wrap around edges
      if (shape.x < -shape.radius) shape.x = w + shape.radius;
      if (shape.x > w + shape.radius) shape.x = -shape.radius;
      if (shape.y < -shape.radius) shape.y = h + shape.radius;
      if (shape.y > h + shape.radius) shape.y = -shape.radius;
    }
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    update(w, h);
    for (const shape of shapes) {
      drawShape(ctx, shape);
    }
    animationId = requestAnimationFrame(render);
  }

  function handleResize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    handleResize();

    // Create shapes
    shapes = Array.from({ length: SHAPE_COUNT }, () =>
      createShape(canvas.width, canvas.height)
    );

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    render();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    unsubRms();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    }
  });
</script>

<canvas bind:this={canvas} class="canvas-bg"></canvas>

<style>
  .canvas-bg {
    position: fixed;
    inset: 0;
    z-index: var(--z-canvas);
    pointer-events: none;
  }
</style>
