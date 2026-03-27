<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { rmsLevel } from '../stores/audio';
  import { bootPhase } from '../stores/system';
  import { weather, type WeatherCondition } from '../stores/weather';
  import { vectorModifiers, driftModifiers } from '../stores/temporal';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  let animationId: number;
  let shapes: Shape[] = [];
  let mouseX = -1000;
  let mouseY = -1000;
  let currentRms = 0;
  let accentColor = '#d4a044';
  let textColor = '#c8cad0';
  let dimColor = '#3d3f4e';
  let isReady = false;

  // Vector/drift atmosphere modifiers
  let vecShapeSpeed = 1.0;
  let vecParticleDensity = 1.0;
  let driftPerturbation = 0;

  // Weather state
  let weatherCondition: WeatherCondition = 'unknown';
  let weatherTemp: number | null = null;
  let weatherIsNight = false;
  let weatherLocation = '';

  const unsubBoot = bootPhase.subscribe(v => isReady = v === 'ready');

  // Subscribe to RMS
  const unsubRms = rmsLevel.subscribe(v => currentRms = v);

  // Subscribe to weather
  const unsubWeather = weather.subscribe(w => {
    weatherCondition = w.condition;
    weatherTemp = w.temp;
    weatherIsNight = w.isNight;
    weatherLocation = w.location;
  });

  // Subscribe to vector modifiers
  const unsubVecMod = vectorModifiers.subscribe(vm => {
    vecShapeSpeed = vm.shapeSpeed;
    vecParticleDensity = vm.particleDensity;
  });

  // Subscribe to drift modifiers
  const unsubDriftMod = driftModifiers.subscribe(dm => {
    driftPerturbation = dm.shapePerturbation;
  });

  // --- Weather particle systems ---

  interface RainDrop { x: number; y: number; speed: number; length: number; opacity: number; }
  interface Snowflake { x: number; y: number; speed: number; radius: number; drift: number; phase: number; }
  interface Star { x: number; y: number; radius: number; twinkleSpeed: number; phase: number; baseOpacity: number; }

  let rainDrops: RainDrop[] = [];
  let snowflakes: Snowflake[] = [];
  let stars: Star[] = [];
  let lightningTimer = 0;
  let lightningFlash = 0;

  function initWeatherParticles(w: number, h: number) {
    // Rain
    rainDrops = Array.from({ length: 100 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 4 + Math.random() * 6,
      length: 10 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.2,
    }));

    // Snow
    snowflakes = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 0.5 + Math.random() * 1.5,
      radius: 1 + Math.random() * 3,
      drift: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }));

    // Stars
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 0.5 + Math.random() * 1.5,
      twinkleSpeed: 0.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.15 + Math.random() * 0.35,
    }));
  }

  let weatherTime = 0;

  function drawWeather(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (weatherCondition === 'unknown') return;
    weatherTime += 0.016;

    // Stars — night + clear/cloudy only
    if (weatherIsNight && (weatherCondition === 'clear' || weatherCondition === 'cloudy')) {
      for (const star of stars) {
        const twinkle = star.baseOpacity + Math.sin(weatherTime * star.twinkleSpeed + star.phase) * 0.15;
        ctx.fillStyle = '#d4d6dc';
        ctx.globalAlpha = Math.max(0, twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Rain
    if (weatherCondition === 'rain' || weatherCondition === 'thunderstorm') {
      ctx.strokeStyle = '#8a8da2';
      ctx.lineWidth = 1;
      for (const drop of rainDrops) {
        ctx.globalAlpha = drop.opacity;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.5;
        if (drop.y > h) {
          drop.y = -drop.length;
          drop.x = Math.random() * w;
        }
      }
      ctx.globalAlpha = 1;
    }

    // Snow
    if (weatherCondition === 'snow') {
      ctx.fillStyle = '#d4d6dc';
      for (const flake of snowflakes) {
        const alpha = 0.15 + Math.sin(weatherTime + flake.phase) * 0.08;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();

        flake.y += flake.speed;
        flake.x += Math.sin(weatherTime * flake.drift + flake.phase) * 0.5;
        if (flake.y > h) {
          flake.y = -flake.radius;
          flake.x = Math.random() * w;
        }
      }
      ctx.globalAlpha = 1;
    }

    // Lightning flash (thunderstorm only)
    if (weatherCondition === 'thunderstorm') {
      lightningTimer += 0.016;
      if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash * 0.12})`;
        ctx.fillRect(0, 0, w, h);
        lightningFlash = Math.max(0, lightningFlash - 0.08);
      } else if (lightningTimer > 8 + Math.random() * 15) {
        lightningFlash = 1;
        lightningTimer = 0;
      }
    }

    // Fog overlay
    if (weatherCondition === 'fog') {
      const fogAlpha = 0.03 + Math.sin(weatherTime * 0.2) * 0.01;
      ctx.fillStyle = `rgba(100, 100, 120, ${fogAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawWeatherInfo(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!isReady || weatherCondition === 'unknown') return;

    const dockOffset = 184;
    const centerX = dockOffset + (w - dockOffset) / 2;
    const baseY = h / 2 - 30; // same as clock centerY

    const pulse = 0.45 + Math.sin(Date.now() / 1000 * Math.PI * 2) * 0.08;

    // Weather condition icon (text-based)
    const condIcons: Record<WeatherCondition, string> = {
      clear: weatherIsNight ? '☾ CLEAR' : '☀ CLEAR',
      cloudy: '☁ CLOUDY',
      rain: '⛆ RAIN',
      snow: '❄ SNOW',
      thunderstorm: '⚡ STORM',
      fog: '≋ FOG',
      unknown: '',
    };

    const condText = condIcons[weatherCondition];
    const tempText = weatherTemp !== null ? `${weatherTemp}°C` : '';
    const infoStr = [tempText, condText].filter(Boolean).join(' — ');

    ctx.font = '20px VT323, monospace';
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = pulse * 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(infoStr, centerX, baseY + 150);

    if (weatherLocation) {
      ctx.font = '16px VT323, monospace';
      ctx.globalAlpha = pulse * 0.25;
      ctx.fillText(weatherLocation.toUpperCase(), centerX, baseY + 170);
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

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
    depth: number;
    showCoords: boolean;
  }

  const SHAPE_COUNT = 10;
  const MOUSE_REPEL_RADIUS = 120;
  const MOUSE_REPEL_FORCE = 0.3;
  const BASE_SPEED = 0.15;
  const DAMPING = 0.998;
  const GRID_SPACING = 80;
  const CONNECTION_DIST = 200;

  function createShape(w: number, h: number, index: number): Shape {
    const sides = Math.random() > 0.5 ? 6 : 5;
    const depth = 0.5 + Math.random() * 1.0; // 0.5 (far) to 1.5 (near)
    const baseRadius = (20 + Math.random() * 40) * (depth < 0.8 ? 0.6 : depth > 1.2 ? 1.3 : 1.0);
    const speedMult = depth < 0.8 ? 0.5 : depth > 1.2 ? 1.2 : 1.0;
    const opacityMult = depth < 0.8 ? 0.5 : depth > 1.2 ? 1.2 : 1.0;

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * BASE_SPEED * speedMult,
      vy: (Math.random() - 0.5) * BASE_SPEED * speedMult,
      radius: baseRadius,
      baseRadius,
      sides,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      opacity: (0.08 + Math.random() * 0.10) * opacityMult,
      depth,
      showCoords: index < 3, // first 3 shapes show coordinates
    };
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const centerX = w / 2;
    const centerY = h / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = GRID_SPACING; x < w; x += GRID_SPACING) {
      const distFromCenter = Math.abs(x - centerX) / centerX;
      const alpha = 0.035 * (1 - distFromCenter * 0.7);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = GRID_SPACING; y < h; y += GRID_SPACING) {
      const distFromCenter = Math.abs(y - centerY) / centerY;
      const alpha = 0.035 * (1 - distFromCenter * 0.7);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function drawConnections(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 0.5;

    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const a = shapes[i];
        const b = shapes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          ctx.globalAlpha = (1 - dist / CONNECTION_DIST) * 0.08;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
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

    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = shape.opacity;
    ctx.lineWidth = shape.depth > 1.2 ? 1.5 : 1;
    ctx.stroke();

    // Coordinate readout for selected shapes
    if (shape.showCoords) {
      ctx.font = '14px monospace';
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.12;
      ctx.fillText(
        `${shape.x.toFixed(0)},${shape.y.toFixed(0)}`,
        shape.x + shape.radius + 6,
        shape.y - 4
      );
    }

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

      // Drift perturbation: add small random velocity jitter when drifting
      if (driftPerturbation > 0) {
        shape.vx += (Math.random() - 0.5) * 0.02 * driftPerturbation;
        shape.vy += (Math.random() - 0.5) * 0.02 * driftPerturbation;
      }

      // Damping
      shape.vx *= DAMPING;
      shape.vy *= DAMPING;

      // Move — speed modulated by vector
      shape.x += shape.vx * vecShapeSpeed;
      shape.y += shape.vy * vecShapeSpeed;
      shape.rotation += shape.rotationSpeed * vecShapeSpeed;

      // Wrap around edges
      if (shape.x < -shape.radius) shape.x = w + shape.radius;
      if (shape.x > w + shape.radius) shape.x = -shape.radius;
      if (shape.y < -shape.radius) shape.y = h + shape.radius;
      if (shape.y > h + shape.radius) shape.y = -shape.radius;
    }
  }

  function drawClock(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!isReady) return;

    const now = new Date();
    const dockOffset = 184;
    const centerX = dockOffset + (w - dockOffset) / 2;
    const centerY = h / 2 - 30;

    const secondFrac = now.getMilliseconds() / 1000;
    const pulse = 0.45 + Math.sin(secondFrac * Math.PI * 2) * 0.08;

    // Horizontal rule above clock
    const ruleWidth = 360;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(centerX - ruleWidth / 2, centerY - 60);
    ctx.lineTo(centerX + ruleWidth / 2, centerY - 60);
    ctx.stroke();

    // Small NERV-style label above time
    ctx.font = '18px VT323, monospace';
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.25;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('— SYSTEM TIME —', centerX, centerY - 42);

    // Time — large and visible
    const timeStr = now.toTimeString().slice(0, 8);
    ctx.font = '96px VT323, monospace';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse;
    ctx.fillText(timeStr, centerX, centerY + 10);

    // Day and date
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = days[now.getDay()];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dateStr = `${dayName} — ${year}.${month}.${date}`;

    ctx.font = '26px VT323, monospace';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillText(dateStr, centerX, centerY + 62);

    // Day of year progress
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const totalDays = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
    const yearProgress = dayOfYear / totalDays;
    const progressStr = `DAY ${String(dayOfYear).padStart(3, '0')} OF ${totalDays} — ${(yearProgress * 100).toFixed(1)}%`;

    ctx.font = '20px VT323, monospace';
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = pulse * 0.55;
    ctx.fillText(progressStr, centerX, centerY + 94);

    // Progress bar — wider and taller
    const barWidth = 340;
    const barHeight = 6;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 112;

    // Background bar
    ctx.fillStyle = dimColor;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Filled bar
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = pulse * 0.7;
    ctx.fillRect(barX, barY, barWidth * yearProgress, barHeight);

    // Tick mark at current position
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse * 0.9;
    ctx.fillRect(barX + barWidth * yearProgress - 1, barY - 3, 2, barHeight + 6);

    // Horizontal rule below
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(centerX - ruleWidth / 2, centerY + 132);
    ctx.lineTo(centerX + ruleWidth / 2, centerY + 132);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw grid first (behind everything)
    drawGrid(ctx, w, h);

    // Draw weather particles (behind clock)
    drawWeather(ctx, w, h);

    // Draw clock (behind shapes)
    drawClock(ctx, w, h);

    // Draw weather info below clock
    drawWeatherInfo(ctx, w, h);

    // Update physics
    update(w, h);

    // Draw connection lines between nearby shapes
    drawConnections(ctx);

    // Draw shapes (sorted by depth — far shapes first)
    const sorted = [...shapes].sort((a, b) => a.depth - b.depth);
    for (const shape of sorted) {
      drawShape(ctx, shape);
    }

    animationId = requestAnimationFrame(render);
  }

  function handleResize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initWeatherParticles(canvas.width, canvas.height);
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

    // Read colors from CSS
    const styles = getComputedStyle(document.documentElement);
    accentColor = styles.getPropertyValue('--accent').trim() || '#d4a044';
    textColor = styles.getPropertyValue('--text-primary').trim() || '#c8cad0';
    dimColor = styles.getPropertyValue('--text-dim').trim() || '#525568';

    // Create shapes with depth variation
    shapes = Array.from({ length: SHAPE_COUNT }, (_, i) =>
      createShape(canvas.width, canvas.height, i)
    );

    // Initialize weather particles
    initWeatherParticles(canvas.width, canvas.height);

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    render();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    unsubRms();
    unsubBoot();
    unsubWeather();
    unsubVecMod();
    unsubDriftMod();
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
