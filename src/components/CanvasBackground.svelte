<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { rmsLevel } from '../stores/audio';
  import { bootPhase } from '../stores/system';
  import { weather, type WeatherCondition } from '../stores/weather';
  import { vectorModifiers, driftModifiers } from '../stores/temporal';
  import { palimpsestDays, liveMarks, setCurrentFrame, type PalimpsestDay, type PalimpsestMark, type LiveMark } from '../stores/palimpsest';
  import { silenceActive } from '../stores/silence';

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

  // Grid cache — drawn once to offscreen canvas, composited per frame
  let gridCanvas: HTMLCanvasElement | null = null;

  // Desaturated accent color for deep drift (blended toward gray)
  $: desaturatedAccent = (() => {
    if (currentDriftLevel < 4) return accentColor;
    // Parse hex accent and blend toward mid-gray
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const blend = currentDriftLevel >= 5 ? 0.6 : 0.35; // more gray at level 5
    const gray = Math.round((r + g + b) / 3);
    const nr = Math.round(r + (gray - r) * blend);
    const ng = Math.round(g + (gray - g) * blend);
    const nb = Math.round(b + (gray - b) * blend);
    return `rgb(${nr}, ${ng}, ${nb})`;
  })();

  // Clock memoization — only recompute when the second changes
  let lastClockSecond = -1;

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
  let currentDriftLevel = 0;
  const unsubDriftMod = driftModifiers.subscribe(dm => {
    driftPerturbation = dm.shapePerturbation;
    currentDriftLevel = dm.driftLevel;
  });

  // Subscribe to palimpsest data (cached locally, no per-frame reads)
  let archivedDays: PalimpsestDay[] = [];
  let currentLiveMarks: LiveMark[] = [];
  let frameCount = 0;
  const unsubArchive = palimpsestDays.subscribe(days => { archivedDays = days; });
  const unsubLive = liveMarks.subscribe(marks => { currentLiveMarks = marks; });

  // Subscribe to silence mode
  let isSilent = false;
  let silenceFade = 1.0; // 1.0 = fully visible, 0.0 = silent
  const unsubSilence = silenceActive.subscribe(v => { isSilent = v; });

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

    // Stars — batched: group by quantized alpha (5 bins), single beginPath per bin
    if (weatherIsNight && (weatherCondition === 'clear' || weatherCondition === 'cloudy')) {
      ctx.fillStyle = '#d4d6dc';
      // Batch stars into alpha bins for fewer draw calls
      const bins: Star[][] = [[], [], [], [], []];
      for (const star of stars) {
        const twinkle = star.baseOpacity + Math.sin(weatherTime * star.twinkleSpeed + star.phase) * 0.15;
        const alpha = Math.max(0, twinkle);
        const bin = Math.min(4, Math.floor(alpha * 5));
        bins[bin].push(star);
      }
      for (let b = 0; b < 5; b++) {
        if (bins[b].length === 0) continue;
        ctx.globalAlpha = (b + 0.5) / 5;
        ctx.beginPath();
        for (const star of bins[b]) {
          ctx.moveTo(star.x + star.radius, star.y);
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Rain — batched: single beginPath, group by quantized opacity
    if (weatherCondition === 'rain' || weatherCondition === 'thunderstorm') {
      ctx.strokeStyle = '#8a8da2';
      ctx.lineWidth = 1;
      // Group drops by quantized opacity (4 bins)
      const bins: RainDrop[][] = [[], [], [], []];
      for (const drop of rainDrops) {
        const bin = Math.min(3, Math.floor(drop.opacity * 4));
        bins[bin].push(drop);
        drop.y += drop.speed;
        drop.x -= 0.5;
        if (drop.y > h) { drop.y = -drop.length; drop.x = Math.random() * w; }
      }
      for (let b = 0; b < 4; b++) {
        if (bins[b].length === 0) continue;
        ctx.globalAlpha = (b + 0.5) / 4;
        ctx.beginPath();
        for (const drop of bins[b]) {
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 2, drop.y + drop.length);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Snow — batched: single beginPath with shared alpha
    if (weatherCondition === 'snow') {
      ctx.fillStyle = '#d4d6dc';
      // Average alpha is ~0.15 with ±0.08 variation — batch at mean alpha
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      for (const flake of snowflakes) {
        ctx.moveTo(flake.x + flake.radius, flake.y);
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        flake.y += flake.speed;
        flake.x += Math.sin(weatherTime * flake.drift + flake.phase) * 0.5;
        if (flake.y > h) { flake.y = -flake.radius; flake.x = Math.random() * w; }
      }
      ctx.fill();
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

  function buildGridCache(w: number, h: number) {
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = w;
    gridCanvas.height = h;
    const gctx = gridCanvas.getContext('2d');
    if (!gctx) return;

    const centerX = w / 2;
    const centerY = h / 2;

    gctx.strokeStyle = accentColor;
    gctx.lineWidth = 0.5;

    for (let x = GRID_SPACING; x < w; x += GRID_SPACING) {
      const distFromCenter = Math.abs(x - centerX) / centerX;
      const alpha = 0.035 * (1 - distFromCenter * 0.7);
      if (alpha <= 0) continue;
      gctx.globalAlpha = alpha;
      gctx.beginPath();
      gctx.moveTo(x, 0);
      gctx.lineTo(x, h);
      gctx.stroke();
    }

    for (let y = GRID_SPACING; y < h; y += GRID_SPACING) {
      const distFromCenter = Math.abs(y - centerY) / centerY;
      const alpha = 0.035 * (1 - distFromCenter * 0.7);
      if (alpha <= 0) continue;
      gctx.globalAlpha = alpha;
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(w, y);
      gctx.stroke();
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    if (gridCanvas) {
      ctx.drawImage(gridCanvas, 0, 0);
    }
  }

  function drawConnections(ctx: CanvasRenderingContext2D) {
    const strokeColor = currentDriftLevel >= 4 ? desaturatedAccent : accentColor;
    ctx.strokeStyle = strokeColor;
    // Connection lines thin out during deep drift
    ctx.lineWidth = currentDriftLevel >= 5 ? 0.3 : 0.5;
    const alphaMultiplier = currentDriftLevel >= 5 ? 0.4 : currentDriftLevel >= 4 ? 0.6 : 1.0;
    const maxDistSq = CONNECTION_DIST * CONNECTION_DIST;

    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const a = shapes[i];
        const b = shapes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          ctx.globalAlpha = (1 - dist / CONNECTION_DIST) * 0.08 * alphaMultiplier;
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
    // Deep drift: occasional glitch skip at level 5
    let drawX = shape.x;
    let drawY = shape.y;
    if (currentDriftLevel >= 5 && Math.random() < 0.008) {
      drawX += (Math.random() - 0.5) * 10;
      drawY += (Math.random() - 0.5) * 10;
    }

    ctx.beginPath();
    for (let i = 0; i <= shape.sides; i++) {
      const angle = (i / shape.sides) * Math.PI * 2 + shape.rotation;
      const x = drawX + Math.cos(angle) * shape.radius;
      const y = drawY + Math.sin(angle) * shape.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Deep drift level 4+: desaturate accent toward grayscale
    const strokeColor = currentDriftLevel >= 4 ? desaturatedAccent : accentColor;
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = shape.opacity;
    ctx.lineWidth = shape.depth > 1.2 ? 1.5 : 1;
    ctx.stroke();

    // Coordinate readout for selected shapes
    if (shape.showCoords) {
      ctx.font = '14px monospace';
      ctx.fillStyle = strokeColor;
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

      // Mouse repulsion — skip when mouse is offscreen
      if (mouseX > -500) {
        const dx = shape.x - mouseX;
        const dy = shape.y - mouseY;
        const distSq = dx * dx + dy * dy;
        const repelSq = MOUSE_REPEL_RADIUS * MOUSE_REPEL_RADIUS;
        if (distSq < repelSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_FORCE;
          shape.vx += (dx / dist) * force;
          shape.vy += (dy / dist) * force;
        }
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

  // Clock string cache — only recompute when second changes
  let cachedClockSecond = -1;
  let cachedTimeStr = '';
  let cachedDateStr = '';
  let cachedProgressStr = '';
  let cachedYearProgress = 0;

  function drawClock(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!isReady) return;

    const now = new Date();
    const currentSecond = now.getSeconds();
    const dockOffset = 184;
    const centerX = dockOffset + (w - dockOffset) / 2;
    const centerY = h / 2 - 30;

    const secondFrac = now.getMilliseconds() / 1000;
    const pulse = 0.45 + Math.sin(secondFrac * Math.PI * 2) * 0.08;

    // Only recompute strings when the second changes
    if (currentSecond !== cachedClockSecond) {
      cachedClockSecond = currentSecond;
      cachedTimeStr = now.toTimeString().slice(0, 8);
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      cachedDateStr = `${days[now.getDay()]} — ${year}.${month}.${date}`;
      const startOfYear = new Date(year, 0, 1);
      const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
      const totalDays = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
      cachedYearProgress = dayOfYear / totalDays;
      cachedProgressStr = `DAY ${String(dayOfYear).padStart(3, '0')} OF ${totalDays} — ${(cachedYearProgress * 100).toFixed(1)}%`;
    }

    // Horizontal rule above clock
    const ruleWidth = 360;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(centerX - ruleWidth / 2, centerY - 60);
    ctx.lineTo(centerX + ruleWidth / 2, centerY - 60);
    ctx.stroke();

    ctx.font = '18px VT323, monospace';
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.25;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('— SYSTEM TIME —', centerX, centerY - 42);

    ctx.font = '96px VT323, monospace';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse;
    ctx.fillText(cachedTimeStr, centerX, centerY + 10);

    ctx.font = '26px VT323, monospace';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillText(cachedDateStr, centerX, centerY + 62);

    ctx.font = '20px VT323, monospace';
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = pulse * 0.55;
    ctx.fillText(cachedProgressStr, centerX, centerY + 94);

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
    ctx.fillRect(barX, barY, barWidth * cachedYearProgress, barHeight);

    // Tick mark at current position
    ctx.fillStyle = textColor;
    ctx.globalAlpha = pulse * 0.9;
    ctx.fillRect(barX + barWidth * cachedYearProgress - 1, barY - 3, 2, barHeight + 6);

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

  // Helper: render a single palimpsest mark at given position and alpha
  function renderMark(ctx: CanvasRenderingContext2D, mark: PalimpsestMark, dx: number, dy: number, alpha: number, w: number, h: number) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = accentColor;
    ctx.fillStyle = accentColor;

    switch (mark.type) {
      case 'line': {
        const len = 20 + mark.intensity * 40;
        const angle = mark.angle ?? 0;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(dx - Math.cos(angle) * len / 2, dy - Math.sin(angle) * len / 2);
        ctx.lineTo(dx + Math.cos(angle) * len / 2, dy + Math.sin(angle) * len / 2);
        ctx.stroke();
        break;
      }
      case 'node': {
        const r = 2 + mark.intensity * 1.5;
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
        if (mark.intensity > 0.5) {
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = alpha * 0.6;
          const stubAngle = mark.x * Math.PI * 4;
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(dx + Math.cos(stubAngle) * 15, dy + Math.sin(stubAngle) * 15);
          ctx.stroke();
        }
        break;
      }
      case 'ripple': {
        const radius = (mark.radius ?? 0.05) * Math.min(w, h);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(dx, dy, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (mark.intensity > 0.4) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.arc(dx, dy, radius * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'dot': {
        const r = 1.5 + mark.intensity;
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // Cached date values for palimpsest — refreshed once per second, not per frame
  let palimpsestTodayMs = 0;
  let palimpsestLastSecond = -1;

  function drawPalimpsest(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Early exit if nothing to draw
    if (archivedDays.length === 0 && currentLiveMarks.length === 0) return;

    // Refresh date cache once per second (not per frame)
    const nowSecond = Math.floor(Date.now() / 1000);
    if (nowSecond !== palimpsestLastSecond) {
      palimpsestLastSecond = nowSecond;
      const today = new Date();
      palimpsestTodayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    }

    // --- Layer 1: Archived marks (past days, fading with age) ---
    if (archivedDays.length > 0) {
      // Only render every 3rd frame for archived marks (they barely move)
      if (frameCount % 3 === 0 || frameCount < 10) {
        for (const day of archivedDays) {
          const dayMs = new Date(day.date + 'T00:00:00').getTime();
          const ageInDays = Math.max(0, (palimpsestTodayMs - dayMs) / 86400000);
          const ageFade = Math.max(0.15, 1 - ageInDays / 7);

          for (const mark of day.marks) {
            const baseAlpha = (0.02 + mark.intensity * 0.04) * ageFade;
            if (baseAlpha < 0.005) continue; // Skip invisible marks
            const mx = mark.x * w;
            const my = mark.y * h;
            const drift = Math.sin(frameCount * 0.001 + mark.x * 10 + mark.y * 7) * 1.5;
            renderMark(ctx, mark, mx + drift, my + drift * 0.7, baseAlpha, w, h);
          }
        }
      }
    }

    // --- Layer 2: Live marks (this session, flash → settle → archive) ---
    for (const mark of currentLiveMarks) {
      const age = frameCount - mark.birthFrame;

      let alpha: number;
      if (age < 30) {
        alpha = 0.12 - (age / 30) * 0.04;
      } else if (age < 3600) {
        const t = (age - 30) / 3570;
        alpha = 0.08 * (1 - t) + 0.03 * t;
      } else {
        alpha = 0.03;
      }

      if (alpha < 0.005) continue; // Skip invisible marks

      const mx = mark.x * w;
      const my = mark.y * h;
      const drift = Math.sin(frameCount * 0.002 + mark.x * 8 + mark.y * 5) * 1.0;
      renderMark(ctx, mark, mx + drift, my + drift * 0.7, alpha, w, h);
    }

    ctx.globalAlpha = 1;
  }

  // Pre-sorted shape array — depth never changes, sort once
  let sortedShapes: Shape[] = [];

  function render() {
    if (!ctx || !canvas) return;
    frameCount++;
    setCurrentFrame(frameCount);
    const w = canvas.width;
    const h = canvas.height;

    const transitioning = isSilent || silenceFade < 0.99;

    // Only compute silence fade when actually transitioning
    if (transitioning) {
      const silenceTarget = isSilent ? 0 : 1;
      silenceFade += (silenceTarget - silenceFade) * 0.02;
      if (Math.abs(silenceFade - silenceTarget) < 0.005) silenceFade = silenceTarget;
    }

    ctx.clearRect(0, 0, w, h);

    if (transitioning) {
      // Silence transition path — apply globalAlpha wrapping
      if (silenceFade > 0.01) {
        ctx.globalAlpha = silenceFade;
        drawGrid(ctx);
        drawWeather(ctx, w, h);
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = Math.max(0.3, silenceFade);
      drawClock(ctx, w, h);
      ctx.globalAlpha = 1;

      if (silenceFade > 0.05) {
        ctx.globalAlpha = silenceFade;
        drawWeatherInfo(ctx, w, h);
        ctx.globalAlpha = 1;
      }
    } else {
      // Normal fast path — no globalAlpha wrapping needed
      drawGrid(ctx);
      drawWeather(ctx, w, h);
      drawClock(ctx, w, h);
      drawWeatherInfo(ctx, w, h);
    }

    // Palimpsest — always visible
    drawPalimpsest(ctx, w, h);

    // Shapes and connections
    if (!transitioning || silenceFade > 0.02) {
      update(w, h);
      drawConnections(ctx);

      if (transitioning) {
        for (const shape of sortedShapes) {
          const origOpacity = shape.opacity;
          shape.opacity *= silenceFade;
          drawShape(ctx, shape);
          shape.opacity = origOpacity;
        }
      } else {
        for (const shape of sortedShapes) {
          drawShape(ctx, shape);
        }
      }
    }

    animationId = requestAnimationFrame(render);
  }

  function handleResize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initWeatherParticles(canvas.width, canvas.height);
    buildGridCache(canvas.width, canvas.height);
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

    // Create shapes with depth variation — sort once by depth (never changes)
    shapes = Array.from({ length: SHAPE_COUNT }, (_, i) =>
      createShape(canvas.width, canvas.height, i)
    );
    sortedShapes = [...shapes].sort((a, b) => a.depth - b.depth);

    // Initialize weather particles and grid cache
    initWeatherParticles(canvas.width, canvas.height);
    buildGridCache(canvas.width, canvas.height);

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
    unsubArchive();
    unsubLive();
    unsubSilence();
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
