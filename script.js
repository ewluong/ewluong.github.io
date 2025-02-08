// --------------------- UTILITY FUNCTIONS ---------------------
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// --------------------- THEME & INITIAL SETUP ---------------------
const themes = [
  {
    name: "Orange & Black",
    sub: [
      { bg: "#ff5e00", text: "#000000" },
      { bg: "#000000", text: "#ff5e00" },
    ],
  },
  {
    name: "Black & Bright Green",
    sub: [
      { bg: "#000000", text: "#00ff00" },
      { bg: "#00ff00", text: "#000000" },
    ],
  },
  {
    name: "Dark Purple & Neon Green",
    sub: [
      { bg: "#2e003e", text: "#00ff00" },
      { bg: "#00ff00", text: "#2e003e" },
    ],
  },
  {
    name: "Navy Blue & Light Blue",
    sub: [
      { bg: "#001f3f", text: "#7FDBFF" },
      { bg: "#7FDBFF", text: "#001f3f" },
    ],
  },
  {
    name: "Dark Maroon & Amber",
    sub: [
      { bg: "#0d0208", text: "#f2a900" },
      { bg: "#f2a900", text: "#0d0208" },
    ],
  },
  {
    name: "Dark Blue & Off-White",
    sub: [
      { bg: "#011627", text: "#fdfffc" },
      { bg: "#fdfffc", text: "#011627" },
    ],
  },
];
let currentTheme = themes[3];

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  // (No client-side logging fetch is necessary now.)

  // Set initial theme
  document.documentElement.style.setProperty("--bg-color", currentTheme.sub[0].bg);
  document.documentElement.style.setProperty("--text-color", currentTheme.sub[0].text);
  document.documentElement.setAttribute("data-scheme", currentTheme.name);

  pickAsciiBunnyCatPanda();
  initCanvas();
  initDodecagonCanvas();
  initSectionObserver();
  onScrollTypeAscii();
  initBlogPosts();
  initMinigamePrompt();
  initMinigameModal();
  initMusicPrompt();
  initChatbox("/"); // Adjust if needed
  initProjectModal();
  initBackroomsModal();
  initRetroMusicPlayer();
  initDataModal(); // Data modal now only reads analytics data

  typeWriterOnElement(document.getElementById("terminalHeader"), 50);
  typeOtherHeaders();

  // Randomize theme button
  document.getElementById("randomizeToggle").addEventListener("click", function () {
    this.classList.add("vibrate");
    setTimeout(() => { this.classList.remove("vibrate"); }, 300);
    const randomIndex = Math.floor(Math.random() * themes.length);
    currentTheme = themes[randomIndex];
    document.documentElement.style.setProperty("--bg-color", currentTheme.sub[0].bg);
    document.documentElement.style.setProperty("--text-color", currentTheme.sub[0].text);
    document.documentElement.setAttribute("data-scheme", currentTheme.name);
  });

  // Optimize event handling
  window.addEventListener("resize", debounce(onResize, 100));

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        onScrollTypeAscii();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // Bring-to-Front for modals
  let currentTopZ = 11000;
  function bringModalToFront(modal) {
    currentTopZ++;
    modal.style.zIndex = currentTopZ;
  }
  ["minigameModal", "chatboxModal", "backroomsModal"].forEach(id => {
    const modal = document.getElementById(id);
    modal.addEventListener("mousedown", () => {
      bringModalToFront(modal);
    });
  });
});

// --------------------- TYPEWRITER FUNCTIONS ---------------------
// (Rest of your script.js code remains unchanged)


// --------------------- TYPEWRITER FUNCTIONS ---------------------
function typeWriterOnElement(element, delay = 50) {
  const fullText = element.getAttribute("data-text");
  if (!fullText) return;
  element.style.opacity = "1";
  element.textContent = "";
  let index = 0;
  function typeChar() {
    if (index < fullText.length) {
      element.textContent += fullText.charAt(index);
      index++;
      setTimeout(typeChar, delay);
    }
  }
  typeChar();
}

function typeOtherHeaders() {
  const headers = document.querySelectorAll(".section-header");
  headers.forEach((header) => {
    if (header.id !== "terminalHeader") {
      typeWriterOnElement(header, 50);
    }
  });
}

// --------------------- ASCII (Typewriter on Scroll) ---------------------
let asciiFull = "";
function pickAsciiBunnyCatPanda() {
  const bunny = ["  (\\(\\ ", " ( -.- )", "  o(\")(\")"];
  const cat = ["  /\\__/\\", " (  o.o  )", "  >  ^  < "];
  const panda = ["  ___  ", " (o o) ", " (  V  )", " /     \\", "|       |"];
  const asciiOptions = [bunny, cat, panda];
  const chosen = asciiOptions[Math.floor(Math.random() * asciiOptions.length)];
  const phrase = "Believe in me who believes in you";
  const lines = [];
  lines.push(phrase, "");
  for (let line of chosen) lines.push(line);
  lines.push("", phrase);
  asciiFull = lines.join("\n");
}

function onScrollTypeAscii() {
  const asciiCorner = document.getElementById("asciiCorner");
  if (!asciiFull) return;
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  let ratio = docHeight > 0 ? scrollTop / docHeight : 0;
  const revealCount = Math.floor(asciiFull.length * ratio);
  asciiCorner.textContent = asciiFull.substring(0, revealCount);
}

// --------------------- BACKGROUND CANVAS ---------------------
// (The rest of the code remains unchanged…)
// [The full code for initCanvas, animateBackground, drawBackgroundShape, etc. remains exactly as before.]


// --------------------- BACKGROUND CANVAS ---------------------
let canvas, ctx;
let w, h;
const numShapes = 8;
let shapes = [];
const shapeTypes = ["circle", "square", "triangle"];
let currentShapeIndex = 0;
let mouseX = -9999, mouseY = -9999;
const repelRadius = 100, repelForce = 0.03;

function initCanvas() {
  canvas = document.getElementById("bgCanvas");
  ctx = canvas.getContext("2d");
  onResize();
  for (let i = 0; i < numShapes; i++) {
    let baseSize = 20 + Math.random() * 40;
    let vx = Math.random() * 2 - 1;
    let vy = Math.random() * 2 - 1;
    shapes.push({
      x: Math.random() * (w - baseSize * 2) + baseSize,
      y: Math.random() * (h - baseSize * 2) + baseSize,
      baseSize,
      vx,
      vy,
      breathFactor: Math.random() * 2 * Math.PI,
    });
  }
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });
  requestAnimationFrame(animateBackground);
}

function onResize() {
  w = window.innerWidth;
  h = window.innerHeight;
  if (canvas) {
    canvas.width = w;
    canvas.height = h;
  }
}

function animateBackground() {
  ctx.clearRect(0, 0, w, h);
  const computedStyle = getComputedStyle(document.documentElement);
  const textColor = computedStyle.getPropertyValue("--text-color").trim();
  const rgb = parseHexToRgb(textColor);
  shapes.forEach((shape) => {
    shape.breathFactor += 0.02;
    let breathSize = shape.baseSize * (1 + 0.1 * Math.sin(shape.breathFactor));
    shape.x += shape.vx;
    shape.y += shape.vy;
    let dx = shape.x - mouseX, dy = shape.y - mouseY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < repelRadius) {
      let angle = Math.atan2(dy, dx);
      shape.x += Math.cos(angle) * repelForce * (repelRadius - dist);
      shape.y += Math.sin(angle) * repelForce * (repelRadius - dist);
    }
    if (shape.x - breathSize < 0) {
      shape.x = breathSize;
      shape.vx = -shape.vx;
    } else if (shape.x + breathSize > w) {
      shape.x = w - breathSize;
      shape.vx = -shape.vx;
    }
    if (shape.y - breathSize < 0) {
      shape.y = breathSize;
      shape.vy = -shape.vy;
    } else if (shape.y + breathSize > h) {
      shape.y = h - breathSize;
      shape.vy = -shape.vy;
    }
  });
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      resolveCollision(shapes[i], shapes[j]);
    }
  }
  shapes.forEach((shape) => {
    let breathSize = shape.baseSize * (1 + 0.1 * Math.sin(shape.breathFactor));
    drawBackgroundShape(shapeTypes[currentShapeIndex], shape.x, shape.y, breathSize, rgb);
  });
  requestAnimationFrame(animateBackground);
}

function drawBackgroundShape(type, x, y, size, rgb) {
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
  if (type === "circle") {
    ctx.arc(x, y, size, 0, Math.PI * 2);
  } else if (type === "square") {
    ctx.rect(x - size, y - size, size * 2, size * 2);
  } else if (type === "triangle") {
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.closePath();
  }
  ctx.stroke();
}

function resolveCollision(s1, s2) {
  let r1 = s1.baseSize * (1 + 0.1 * Math.sin(s1.breathFactor));
  let r2 = s2.baseSize * (1 + 0.1 * Math.sin(s2.breathFactor));
  let dx = s2.x - s1.x, dy = s2.y - s1.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let minDist = r1 + r2;
  if (dist < minDist) {
    let overlap = (minDist - dist) / 2;
    let nx = dx / dist, ny = dy / dist;
    s1.x -= overlap * nx;
    s1.y -= overlap * ny;
    s2.x += overlap * nx;
    s2.y += overlap * ny;
    let tempVx = s1.vx, tempVy = s1.vy;
    s1.vx = s2.vx;
    s1.vy = s2.vy;
    s2.vx = tempVx;
    s2.vy = tempVy;
  }
}

function parseHexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// --------------------- DODECAGON (Breathing Animation) ---------------------
let dCanvas, dCtx;
let dWidth = 400, dHeight = 400;
let rotation = 0, breathePhase = 0;
const breatheSpeed = 0.02, breatheAmplitude = 0.1;

function initDodecagonCanvas() {
  dCanvas = document.getElementById("dodecagonCanvas");
  dCtx = dCanvas.getContext("2d");

  function resizeDodecagon() {
    const containerWidth = dCanvas.parentElement.clientWidth;
    if (containerWidth < 400) {
      dCanvas.width = containerWidth;
      dCanvas.height = containerWidth;
    } else {
      dCanvas.width = 400;
      dCanvas.height = 400;
    }
    dWidth = dCanvas.width;
    dHeight = dCanvas.height;
  }
  resizeDodecagon();
  window.addEventListener("resize", resizeDodecagon);

  window.addEventListener("mousemove", (e) => {
    rotation = (e.clientX + e.clientY) * 0.01;
  }, { passive: true });
  requestAnimationFrame(drawDodecagonLoop);
}

function drawDodecagonLoop() {
  dCtx.clearRect(0, 0, dWidth, dHeight);
  let cx = dWidth / 2, cy = dHeight / 2;
  breathePhase += breatheSpeed;
  let breathScale = 1 + breatheAmplitude * Math.sin(breathePhase);
  let baseRadius = Math.min(dWidth, dHeight) / 4, currentRadius = baseRadius * breathScale;
  drawDodecagon(cx, cy, currentRadius, rotation);
  requestAnimationFrame(drawDodecagonLoop);
}

function drawDodecagon(cx, cy, radius, rot) {
  let sides = 12, angleStep = (Math.PI * 2) / sides;
  const computedStyle = getComputedStyle(document.documentElement);
  const textColor = computedStyle.getPropertyValue("--text-color").trim();
  const rgb = parseHexToRgb(textColor);
  dCtx.lineWidth = 2;
  dCtx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
  dCtx.beginPath();
  for (let i = 0; i < sides; i++) {
    let angle = i * angleStep + rot;
    let x = cx + radius * Math.cos(angle);
    let y = cy + radius * Math.sin(angle);
    if (i === 0) {
      dCtx.moveTo(x, y);
    } else {
      dCtx.lineTo(x, y);
    }
  }
  dCtx.closePath();
  dCtx.stroke();
  dCtx.lineWidth = 1.5;
  dCtx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
  for (let i = 0; i < sides; i++) {
    let angle = i * angleStep + rot;
    let x = cx + radius * Math.cos(angle);
    let y = cy + radius * Math.sin(angle);
    dCtx.beginPath();
    dCtx.moveTo(cx, cy);
    dCtx.lineTo(x, y);
    dCtx.stroke();
  }
}

// --------------------- SECTION OBSERVER (Theme Flip on Scroll) ---------------------
function initSectionObserver() {
  const sections = document.querySelectorAll(".section");
  const options = { threshold: 0.6 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const sectionIndex = Array.from(sections).indexOf(entry.target);
        const scheme = currentTheme.sub[sectionIndex % 2];
        document.documentElement.style.setProperty("--bg-color", scheme.bg);
        document.documentElement.style.setProperty("--text-color", scheme.text);
        document.documentElement.setAttribute("data-scheme", currentTheme.name);
        currentShapeIndex = sectionIndex % shapeTypes.length;
      }
    });
  }, options);
  sections.forEach((section) => observer.observe(section));
}

// --------------------- BLOG MODAL (Typewriter Effect) ---------------------
let typeTimer = null;
function initBlogPosts() {
  const blogPosts = document.querySelectorAll(".blog-post");
  const modal = document.getElementById("blogModal");
  const modalTitle = modal.querySelector(".modal-title");
  const modalText = modal.querySelector(".modal-text");
  const closeBtn = modal.querySelector(".modal-close");
  blogPosts.forEach((post) => {
    post.addEventListener("click", () => {
      const title = post.dataset.title;
      const content = post.dataset.content;
      modal.classList.remove("hidden");
      modalTitle.textContent = title;
      if (typeTimer) {
        clearTimeout(typeTimer);
        typeTimer = null;
      }
      modalText.textContent = "";
      typeWriterEffect(content, modalText);
    });
  });
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    modalText.textContent = "";
    if (typeTimer) {
      clearTimeout(typeTimer);
      typeTimer = null;
    }
  });
  closeBtn.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  modal.addEventListener("click", (e) => {
    if (!e.target.closest(".modal-content")) {
      modal.classList.add("hidden");
      modalText.textContent = "";
      if (typeTimer) {
        clearTimeout(typeTimer);
        typeTimer = null;
      }
    }
  });
}

function typeWriterEffect(text, element) {
  element.textContent = "";
  let index = 0;
  function typeChar() {
    if (index < text.length) {
      if (
        text.substr(index, 8) === "Model A:" ||
        text.substr(index, 8) === "Model B:"
      ) {
        if (!element.textContent.endsWith("\n\n")) {
          element.textContent = element.textContent.replace(/\n*$/, "\n\n");
        }
      }
      element.textContent += text.charAt(index);
      index++;
      typeTimer = setTimeout(typeChar, 15);
    } else {
      typeTimer = null;
    }
  }
  typeChar();
}

// --------------------- MINIGAME PROMPT ---------------------
let dinoGameStarted = false;
function initMinigamePrompt() {
  const minigameButton = document.getElementById("minigamePrompt");
  const minigameModal = document.getElementById("minigameModal");
  minigameButton.addEventListener("click", () => {
    if (minigameModal.classList.contains("hidden")) {
      minigameModal.classList.remove("hidden");
      minigameModal.focus();
      startDinoGame();
    } else {
      minigameModal.classList.add("hidden");
      dinoGameStarted = false;
    }
  });
}

function initMinigameModal() {
  const minigameClose = document.getElementById("minigameClose");
  const minigameModal = document.getElementById("minigameModal");
  minigameClose.addEventListener("click", () => {
    minigameModal.classList.add("hidden");
    dinoGameStarted = false;
  });
  const minigameHeader = document.getElementById("minigameHeader");
  const minigameModalContainer = document.getElementById("minigameModal");
  makeElementDraggableWithHandle(minigameHeader, minigameModalContainer);
}

function startDinoGame() {
  if (dinoGameStarted) return;
  dinoGameStarted = true;
  initMiniDinoGame();
}

function initMiniDinoGame() {
  const canvas = document.getElementById("miniDinoGame");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  let dinoX, dinoY, dinoW, dinoH, dinoVy, isJumping, gravity, jumpPower, obstacles, frameCount, gameOver;
  
  function resetGame() {
    dinoX = 30;
    dinoY = H - 10;
    dinoW = 15;
    dinoH = 15;
    dinoVy = 0;
    isJumping = false;
    gravity = 0.5;
    jumpPower = 8;
    obstacles = [];
    frameCount = 0;
    gameOver = false;
    const gameOverDiv = document.getElementById("minigameGameOver");
    gameOverDiv.innerHTML = "";
    gameOverDiv.classList.add("hidden");
    update();
  }
  
  function drawDino() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(dinoX, dinoY - dinoH, dinoW, dinoH);
  }
  
  function spawnObstacle() {
    obstacles.push({ x: W, y: H - 20, width: 10, height: 10 });
  }
  
  function drawObstacle(obs) {
    ctx.fillStyle = "red";
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }
  
  function showGameOver() {
    gameOver = true;
    const score = Math.floor(frameCount / 10);
    const gameOverDiv = document.getElementById("minigameGameOver");
    gameOverDiv.innerHTML = `<p>Game Over!</p><p>Score: ${score}</p><p>Press Space to restart</p>`;
    gameOverDiv.classList.remove("hidden");
  }
  
  function update() {
    if (gameOver) return;
    ctx.clearRect(0, 0, W, H);
    if (dinoY < H - 10) {
      dinoVy -= gravity;
    }
    dinoY -= dinoVy;
    if (dinoY > H - 10) {
      dinoY = H - 10;
      dinoVy = 0;
      isJumping = false;
    }
    obstacles.forEach((obs) => (obs.x -= 2));
    obstacles = obstacles.filter((obs) => obs.x + obs.width > 0);
    for (let obs of obstacles) {
      if (
        dinoX < obs.x + obs.width &&
        dinoX + dinoW > obs.x &&
        dinoY - dinoH < obs.y + obs.height &&
        dinoY > obs.y
      ) {
        showGameOver();
        return;
      }
    }
    drawDino();
    obstacles.forEach(drawObstacle);
    frameCount++;
    if (frameCount % 100 === 0) spawnObstacle();
    requestAnimationFrame(update);
  }
  
  const minigameModal = document.getElementById("minigameModal");
  if (!minigameModal.dataset.keyListenerAdded) {
    minigameModal.addEventListener("keydown", (e) => {
      if (!gameOver && (e.code === "Space" || e.code === "ArrowUp") && !isJumping) {
        e.preventDefault();
        dinoVy = jumpPower;
        isJumping = true;
      } else if (gameOver && e.code === "Space") {
        e.preventDefault();
        resetGame();
      }
    });
    minigameModal.dataset.keyListenerAdded = "true";
  }
  
  resetGame();
}

// --------------------- MUSIC PROMPT & RETRO MUSIC PLAYER ---------------------
function initMusicPrompt() {
  const musicButton = document.getElementById("musicPrompt");
  const retroMusicPlayer = document.getElementById("retroMusicPlayer");
  musicButton.addEventListener("click", () => {
    retroMusicPlayer.classList.toggle("hidden");
  });
}

function initRetroMusicPlayer() {
  const retroMusicPlayer = document.getElementById("retroMusicPlayer");
  const waveformCanvas = document.getElementById("waveformCanvas");
  const songTitle = retroMusicPlayer.querySelector(".song-title");
  const songArtist = retroMusicPlayer.querySelector(".song-artist");
  const songAlbum = retroMusicPlayer.querySelector(".song-album");
  const btnBackward = document.getElementById("btnBackward");
  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnForward = document.getElementById("btnForward");
  const btnFavorite = document.getElementById("btnFavorite");
  const btnFavoritesToggle = document.getElementById("btnFavoritesToggle");
  const progressBar = document.getElementById("progressBar");
  const currentTimeSpan = document.getElementById("currentTime");
  const totalTimeSpan = document.getElementById("totalTime");
  const favoritesList = document.getElementById("favoritesList");
  const audioPlayer = document.getElementById("audioPlayer");

  const songs = [
    { id: 1, name: "Sunrise Symphony", artist: "Luna Beats", filePath: "docs/sample.mp3" },
    { id: 2, name: "Midnight Groove", artist: "Solaris", filePath: "docs/sample2.mp3" },
    { id: 3, name: "Her Eyes", artist: "Narvent", filePath: "docs/sample3.mp3" },
    { id: 4, name: "Depression", artist: "Sun", filePath: "docs/sample3.mp3" }
  ];

  let currentSongIndex = 0;
  let isPlaying = false;
  let audioContext, analyser, source, dataArray, bufferLength;
  let animationId;
  let lastBackwardClick = 0;

  function initAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }

  function drawWaveform() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    const canvasCtx = waveformCanvas.getContext("2d");
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    let computedStyle = getComputedStyle(document.documentElement);
    let bgColor = computedStyle.getPropertyValue("--bg-color").trim();
    let textColor = computedStyle.getPropertyValue("--text-color").trim();
    canvasCtx.fillStyle = bgColor;
    canvasCtx.fillRect(0, 0, width, height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = textColor;
    canvasCtx.beginPath();
    let sliceWidth = width / bufferLength, x = 0;
    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * height) / 2;
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
    animationId = requestAnimationFrame(drawWaveform);
  }

  function loadSong(index) {
    if (index < 0 || index >= songs.length) return;
    currentSongIndex = index;
    audioPlayer.src = songs[currentSongIndex].filePath;
    songTitle.textContent = songs[currentSongIndex].name;
    songArtist.textContent = songs[currentSongIndex].artist;
    songAlbum.textContent = "Album/Playlist";
    progressBar.value = 0;
    currentTimeSpan.textContent = "0:00";
    totalTimeSpan.textContent = "0:00";
    if (!audioContext) {
      initAudioContext();
      drawWaveform();
    }
    audioPlayer.load();
  }

  btnPlayPause.addEventListener("click", () => {
    if (!isPlaying) {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
      }
      audioPlayer.play().catch(err => {
        console.error("Playback failed:", err);
      });
    } else {
      audioPlayer.pause();
    }
  });

  audioPlayer.addEventListener("play", () => {
    isPlaying = true;
    btnPlayPause.classList.remove("play");
    btnPlayPause.classList.add("pause", "breathing");
    if (!audioContext) {
      initAudioContext();
      drawWaveform();
    }
  });

  audioPlayer.addEventListener("pause", () => {
    isPlaying = false;
    btnPlayPause.classList.remove("pause");
    btnPlayPause.classList.add("play");
    btnPlayPause.classList.remove("breathing");
  });

  btnForward.addEventListener("click", () => {
    nextSong();
  });

  btnBackward.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastBackwardClick < 500) {
      previousSong();
      lastBackwardClick = 0;
    } else {
      restartSong();
      lastBackwardClick = now;
    }
  });

  audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressBar.value = progress;
      currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
      totalTimeSpan.textContent = formatTime(audioPlayer.duration);
    }
  });

  progressBar.addEventListener("input", () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
  });

  function formatTime(time) {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  }

  btnFavorite.addEventListener("click", () => {
    const currentSong = songs[currentSongIndex];
    addFavorite(currentSong);
  });

  function addFavorite(song) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some((fav) => fav.id === song.id)) {
      alert("This song is already in your favorites.");
      return;
    }
    favorites.push(song);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    populateFavorites();
  }

  function populateFavorites() {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favoritesList.innerHTML = "";
    if (favorites.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No favorites yet.";
      favoritesList.appendChild(li);
      return;
    }
    favorites.forEach((fav) => {
      const songIndex = songs.findIndex((song) => song.id === fav.id);
      if (songIndex === -1) return;
      const li = document.createElement("li");
      li.textContent = `${fav.name} by ${fav.artist}`;
      li.dataset.index = songIndex;
      li.addEventListener("click", () => {
        const index = parseInt(li.dataset.index);
        if (!isNaN(index) && index >= 0 && index < songs.length) {
          loadSong(index);
          audioPlayer.play().catch(err => console.error("Playback failed:", err));
        } else {
          alert("Selected song not found.");
        }
      });
      favoritesList.appendChild(li);
    });
  }

  btnFavoritesToggle.addEventListener("click", () => {
    const favoritesDropdown = document.querySelector(".favorites-dropdown");
    favoritesDropdown.classList.toggle("hidden");
  });

  makeElementDraggable(retroMusicPlayer);

  function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
    audioPlayer.play().catch(err => console.error("Playback failed:", err));
  }

  function previousSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
    audioPlayer.play().catch(err => console.error("Playback failed:", err));
  }

  function restartSong() {
    audioPlayer.currentTime = 0;
  }

  audioPlayer.addEventListener("ended", () => {
    nextSong();
  });

  function initRetroMusicPlayerFunc() {
    loadSong(currentSongIndex);
    populateFavorites();
  }
  initRetroMusicPlayerFunc();
}

// --------------------- CHATBOX MODAL ---------------------
function initChatbox(API_URL) {
  const chatboxPrompt = document.getElementById("chatboxPrompt");
  const chatboxModal = document.getElementById("chatboxModal");
  const chatboxCloseBtn = chatboxModal.querySelector(".chatbox-close");
  const chatboxSendBtn = document.getElementById("chatboxSendBtn");
  const chatboxInput = document.getElementById("chatboxInput");
  const chatboxMessages = chatboxModal.querySelector(".chatbox-messages");
  const chatboxInterface = document.getElementById("chatboxModal").querySelector(".chatbox-interface");

  chatboxPrompt.addEventListener("click", () => {
    chatboxModal.classList.toggle("hidden");
    if (!chatboxModal.classList.contains("hidden")) {
      chatboxInput.focus();
    }
  });
  chatboxCloseBtn.addEventListener("click", () => {
    chatboxModal.classList.add("hidden");
  });
  chatboxCloseBtn.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  chatboxSendBtn.addEventListener("click", () => {
    const message = chatboxInput.value.trim();
    if (!message) return;
    appendMessageToChat("user", message);
    fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.response) {
          appendMessageToChat("bot", data.response);
        } else {
          appendMessageToChat("bot", "I'm sorry, but I didn't receive a proper response.");
        }
      })
      .catch((error) => {
        console.error("Error communicating with the chatbot API:", error);
        appendMessageToChat("bot", "An error occurred. Please try again later.");
      });
    chatboxInput.value = "";
  });
  chatboxInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") chatboxSendBtn.click();
  });
  function appendMessageToChat(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chatbox-message", role);
    messageDiv.textContent = content;
    chatboxMessages.appendChild(messageDiv);
    chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
  }
  makeElementDraggable(chatboxInterface);
}

// --------------------- DATA MODAL (Site Analytics & Chart) ---------------------
function initDataModal() {
  const dataPrompt = document.getElementById("dataPrompt");
  const dataModal = document.getElementById("dataModal");
  const dataModalClose = document.getElementById("dataModalClose");
  const dataModalBody = document.getElementById("dataModalBody");

  dataPrompt.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dataModal.classList.remove("hidden");
    fetchDataAnalytics();
  });

  dataModalClose.addEventListener("click", () => {
    dataModal.classList.add("hidden");
  });

  dataModal.addEventListener("click", (e) => {
    if (!e.target.closest(".modal-content")) {
      dataModal.classList.add("hidden");
    }
  });
}

function fetchDataAnalytics() {
  const dataModalBody = document.getElementById("dataModalBody");
  // Use the read-only /analytics endpoint.
  const analyticsAPI = "/analytics";
  dataModalBody.innerHTML = "<p>Loading site data...</p>";
  fetch(analyticsAPI)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(data => {
      processAnalyticsData(data);
    })
    .catch(error => {
      console.error("Error fetching analytics from server:", error);
      // Fallback: load local analytics_data.json
      fetch("analytics_data.json")
        .then(response => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(data => {
          processAnalyticsData(data);
        })
        .catch(fallbackError => {
          dataModalBody.innerHTML = `<p>Error loading site data: ${fallbackError.message}</p>`;
          console.error("Error fetching analytics from local file:", fallbackError);
        });
    });
}

function processAnalyticsData(data) {
  const dataModalBody = document.getElementById("dataModalBody");
  // Aggregate visits by hour.
  const countsByHour = {};
  data.timeseries.forEach(record => {
    const date = new Date(record.timestamp);
    // Format the hour string as "YYYY-MM-DD HH:00"
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const key = `${year}-${month}-${day} ${hour}:00`;
    countsByHour[key] = (countsByHour[key] || 0) + 1;
  });
  // Sort the hour keys in chronological order.
  const sortedLabels = Object.keys(countsByHour).sort();
  const counts = sortedLabels.map(label => countsByHour[label]);
  dataModalBody.innerHTML = `<canvas id="analyticsChart" width="400" height="200"></canvas>`;
  plotAnalyticsChart(sortedLabels, counts);
}

function plotAnalyticsChart(labels, dataPoints) {
  const ctx = document.getElementById("analyticsChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Visits per Hour',
        data: dataPoints,
        backgroundColor: 'rgba(255, 94, 0, 0.2)',
        borderColor: 'rgba(255, 94, 0, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0,0,0,1)',
      }]
    },
    options: {
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          },
          grid: { color: 'rgba(0,0,0,0.2)' }
        },
        y: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          },
          grid: { color: 'rgba(0,0,0,0.2)' }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          }
        }
      }
    }
  });
}

// --------------------- MAKE ELEMENT DRAGGABLE ---------------------
function makeElementDraggable(element) {
  let isDragging = false, offsetX, offsetY;
  element.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, input, select, textarea")) return;
    isDragging = true;
    e.preventDefault();
    const rect = element.getBoundingClientRect();
    const computedPos = getComputedStyle(element).position;
    if (computedPos === "fixed") {
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
    } else {
      const leftAbs = rect.left + window.scrollX;
      const topAbs = rect.top + window.scrollY;
      offsetX = e.pageX - leftAbs;
      offsetY = e.pageY - topAbs;
      element.style.left = `${leftAbs}px`;
      element.style.top = `${topAbs}px`;
    }
    element.style.transform = "none";
    element.classList.add("dragging");
    document.body.style.userSelect = "none";
    element.setPointerCapture(e.pointerId);
  });
  element.addEventListener("pointermove", (e) => {
    if (isDragging) {
      let newLeft, newTop;
      const computedPos = getComputedStyle(element).position;
      if (computedPos === "fixed") {
        newLeft = e.clientX - offsetX;
        newTop = e.clientY - offsetY;
      } else {
        newLeft = e.pageX - offsetX;
        newTop = e.pageY - offsetY;
      }
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  });
  element.addEventListener("pointerup", (e) => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove("dragging");
      document.body.style.userSelect = "auto";
      element.releasePointerCapture(e.pointerId);
    }
  });
}

// --------------------- MAKE ELEMENT DRAGGABLE WITH HANDLE ---------------------
function makeElementDraggableWithHandle(handle, target) {
  let isDragging = false, offsetX, offsetY;
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("input, button, select, textarea")) return;
    isDragging = true;
    e.preventDefault();
    target.style.position = "fixed";
    const rect = target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    target.style.left = `${rect.left}px`;
    target.style.top = `${rect.top}px`;
    target.style.transform = "none";
    target.classList.add("dragging");
    document.body.style.userSelect = "none";
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (isDragging) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - target.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - target.offsetHeight));
      target.style.left = `${newLeft}px`;
      target.style.top = `${newTop}px`;
    }
  });
  handle.addEventListener("pointerup", (e) => {
    if (isDragging) {
      isDragging = false;
      target.classList.remove("dragging");
      document.body.style.userSelect = "auto";
      handle.releasePointerCapture(e.pointerId);
    }
  });
}

// --------------------- PROJECT MODAL ---------------------
function initProjectModal() {
  const projectCards = document.querySelectorAll(".project-card");
  const projectModal = document.getElementById("projectModal");
  const projectModalTitle = projectModal.querySelector(".modal-title");
  const projectModalBody = projectModal.querySelector(".modal-body");
  const projectModalClose = projectModal.querySelector(".modal-close");

  projectCards.forEach((card) => {
    card.addEventListener("click", () => {
      const file = card.getAttribute("data-file");
      const projectTitle = card.querySelector("h2").textContent.trim();

      if (projectTitle === "Infinite Backrooms") {
        const backroomsModal = document.getElementById("backroomsModal");
        backroomsModal.classList.remove("hidden");
        if (window.loadBackrooms) {
          const dropdown = document.getElementById("backroomsDropdown");
          window.loadBackrooms(dropdown.value);
        }
        return;
      } else if (projectTitle === "ewluong.com") {
        const chatboxModal = document.getElementById("chatboxModal");
        chatboxModal.classList.remove("hidden");
        return;
      }

      projectModalTitle.textContent = projectTitle;
      projectModalBody.innerHTML = "";
      if (file && file.endsWith(".md")) {
        fetch(`docs/${file}`)
          .then((response) => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.text();
          })
          .then((mdText) => {
            const htmlContent = marked.parse(mdText);
            const markdownDiv = document.createElement("div");
            markdownDiv.classList.add("markdown-content");
            markdownDiv.innerHTML = htmlContent;
            projectModalBody.appendChild(markdownDiv);
          })
          .catch((error) => {
            projectModalBody.textContent = "Error loading the document.";
            console.error("Fetch error:", error);
          });
      } else if (file && (file.endsWith(".pdf") || file.endsWith(".html"))) {
        const iframe = document.createElement("iframe");
        iframe.src = `docs/${file}`;
        iframe.type = file.endsWith(".pdf") ? "application/pdf" : "text/html";
        iframe.allow = "fullscreen";
        iframe.style.width = "100%";
        iframe.style.height = "500px";
        projectModalBody.appendChild(iframe);
      } else {
        projectModalBody.textContent = "Unsupported file format.";
      }
      projectModal.classList.remove("hidden");
    });
  });

  projectModalClose.addEventListener("click", () => {
    projectModal.classList.add("hidden");
    projectModalBody.innerHTML = "";
  });

  projectModalClose.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  projectModal.addEventListener("click", (e) => {
    if (!e.target.closest(".modal-content")) {
      projectModal.classList.add("hidden");
      projectModalBody.innerHTML = "";
    }
  });
}

// --------------------- BACKROOMS MODAL (Vintage Terminal Style) ---------------------
function initBackroomsModal() {
  const backroomsPrompt = document.getElementById("backroomsPrompt");
  const backroomsModal = document.getElementById("backroomsModal");
  const backroomsClose = document.getElementById("backroomsClose");
  let backroomsContentElement = document.getElementById("backroomsContent");
  const searchInput = document.getElementById("backroomsSearch");
  const searchBtn = document.getElementById("backroomsSearchBtn");
  const clearBtn = document.getElementById("backroomsClearBtn");
  const dropdown = document.getElementById("backroomsDropdown");

  const conversationFiles = [
    { name: "Backrooms 1", file: "docs/backrooms1.txt" },
    { name: "All Conversations", file: "all" },
    { name: "Backrooms 2", file: "docs/backrooms2.txt" },
    { name: "Backrooms 3", file: "docs/backrooms3.txt" },
  ];
  dropdown.innerHTML = "";
  conversationFiles.forEach((fileObj) => {
    let option = document.createElement("option");
    option.value = fileObj.file;
    option.textContent = fileObj.name;
    dropdown.appendChild(option);
  });
  dropdown.selectedIndex = 0;

  let backroomsContent = "";
  let currentIndex = 0;
  let typeInterval = null;
  let displayBuffer = "";
  const typingSpeed = 1;

  function resetBackroomsContainer() {
    document.getElementById("backroomsText").innerHTML =
      '<span id="backroomsContent"></span><span id="cursor"></span>';
    backroomsContentElement = document.getElementById("backroomsContent");
  }

  function startTypewriter() {
    typeInterval = setInterval(() => {
      if (backroomsContent.length === 0) return;
      if (
        backroomsContent.substr(currentIndex, 8) === "Model A:" ||
        backroomsContent.substr(currentIndex, 8) === "Model B:"
      ) {
        if (!displayBuffer.endsWith("\n\n")) {
          displayBuffer = displayBuffer.replace(/\n*$/, "\n\n");
        }
      }
      let nextChar = backroomsContent.charAt(currentIndex);
      displayBuffer += nextChar;
      currentIndex++;
      if (currentIndex >= backroomsContent.length) {
        clearInterval(typeInterval);
      }
      backroomsContentElement.textContent = displayBuffer;
      document.getElementById("backroomsText").scrollTop =
        document.getElementById("backroomsText").scrollHeight;
    }, typingSpeed);
  }

  function stopTypewriter() {
    if (typeInterval) {
      clearInterval(typeInterval);
      typeInterval = null;
    }
  }

  function loadConversation(fileValue) {
    stopTypewriter();
    resetBackroomsContainer();
    backroomsContent = "";
    currentIndex = 0;
    displayBuffer = "";
    if (fileValue === "all") {
      let promises = conversationFiles
        .filter((f) => f.file !== "all")
        .map((f) =>
          fetch(f.file).then((response) => {
            if (!response.ok) throw new Error("Network error");
            return response.text();
          })
        );
      Promise.all(promises)
        .then((results) => {
          backroomsContent = results.join("\n\n").replace(/\r?\n(?=\d{4}-\d{2}-\d{2}.*Model [AB]:)/g, "\n\n");
          startTypewriter();
        })
        .catch((err) => {
          console.error(err);
          backroomsContentElement.textContent = "Error loading conversations.";
        });
    } else {
      fetch(fileValue)
        .then((response) => {
          if (!response.ok) throw new Error("Network error");
          return response.text();
        })
        .then((text) => {
          backroomsContent = text.replace(/\r?\n(?=\d{4}-\d{2}-\d{2}.*Model [AB]:)/g, "\n\n");
          startTypewriter();
        })
        .catch((err) => {
          console.error(err);
          backroomsContentElement.textContent = "Error loading conversation.";
        });
    }
  }

  window.loadBackrooms = loadConversation;

  function searchBackroomsContent(query) {
    if (!backroomsContent) return "No content loaded.";
    let lowerContent = backroomsContent.toLowerCase();
    let lowerQuery = query.toLowerCase();
    let results = [];
    let startPos = 0;
    while (true) {
      let foundIndex = lowerContent.indexOf(lowerQuery, startPos);
      if (foundIndex === -1) break;
      let excerptStart = Math.max(0, foundIndex - 50);
      let excerptEnd = Math.min(backroomsContent.length, foundIndex + query.length + 50);
      let excerpt = backroomsContent.substring(excerptStart, excerptEnd);
      let regex = new RegExp(query, "gi");
      excerpt = excerpt.replace(regex, (match) => `<mark>${match}</mark>`);
      results.push("..." + excerpt + "...");
      if (results.length >= 30) break;
      startPos = foundIndex + query.length;
    }
    if (results.length === 0) {
      return "No results found for '" + query + "'.";
    }
    return results.join("<br><br>");
  }

  backroomsPrompt.addEventListener("click", () => {
    if (backroomsModal.classList.contains("hidden")) {
      backroomsModal.classList.remove("hidden");
      loadConversation(dropdown.value);
    } else {
      backroomsModal.classList.add("hidden");
      stopTypewriter();
      resetBackroomsContainer();
    }
  });

  backroomsClose.addEventListener("click", () => {
    backroomsModal.classList.add("hidden");
    stopTypewriter();
    resetBackroomsContainer();
  });

  backroomsClose.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  dropdown.addEventListener("change", () => {
    loadConversation(dropdown.value);
  });

  searchBtn.addEventListener("click", () => {
    let query = searchInput.value.trim();
    if (query !== "") {
      stopTypewriter();
      document.getElementById("backroomsText").innerHTML = searchBackroomsContent(query);
    }
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    resetBackroomsContainer();
    displayBuffer = "";
    currentIndex = 0;
    loadConversation(dropdown.value);
  });

  const backroomsHeader = document.querySelector(".vcr-header");
  makeElementDraggableWithHandle(backroomsHeader, document.querySelector(".backrooms-modal-content"));
}

// --------------------- PLOT ANALYTICS CHART (Using Chart.js) ---------------------
// (Duplicate definition kept as per original code)
function plotAnalyticsChart(labels, dataPoints) {
  const ctx = document.getElementById("analyticsChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Visits per Hour',
        data: dataPoints,
        backgroundColor: 'rgba(255, 94, 0, 0.2)',
        borderColor: 'rgba(255, 94, 0, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0,0,0,1)',
      }]
    },
    options: {
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          },
          grid: { color: 'rgba(0,0,0,0.2)' }
        },
        y: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          },
          grid: { color: 'rgba(0,0,0,0.2)' }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
            font: { family: 'VT323, monospace' }
          }
        }
      }
    }
  });
}

// --------------------- MAKE ELEMENT DRAGGABLE ---------------------
// (Duplicate definition kept as per original code)
function makeElementDraggable(element) {
  let isDragging = false, offsetX, offsetY;
  element.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, input, select, textarea")) return;
    isDragging = true;
    e.preventDefault();
    const rect = element.getBoundingClientRect();
    const computedPos = getComputedStyle(element).position;
    if (computedPos === "fixed") {
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
    } else {
      const leftAbs = rect.left + window.scrollX;
      const topAbs = rect.top + window.scrollY;
      offsetX = e.pageX - leftAbs;
      offsetY = e.pageY - topAbs;
      element.style.left = `${leftAbs}px`;
      element.style.top = `${topAbs}px`;
    }
    element.style.transform = "none";
    element.classList.add("dragging");
    document.body.style.userSelect = "none";
    element.setPointerCapture(e.pointerId);
  });
  element.addEventListener("pointermove", (e) => {
    if (isDragging) {
      let newLeft, newTop;
      const computedPos = getComputedStyle(element).position;
      if (computedPos === "fixed") {
        newLeft = e.clientX - offsetX;
        newTop = e.clientY - offsetY;
      } else {
        newLeft = e.pageX - offsetX;
        newTop = e.pageY - offsetY;
      }
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  });
  element.addEventListener("pointerup", (e) => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove("dragging");
      document.body.style.userSelect = "auto";
      element.releasePointerCapture(e.pointerId);
    }
  });
}

// --------------------- MAKE ELEMENT DRAGGABLE WITH HANDLE ---------------------
// (Duplicate definition kept as per original code)
function makeElementDraggableWithHandle(handle, target) {
  let isDragging = false, offsetX, offsetY;
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("input, button, select, textarea")) return;
    isDragging = true;
    e.preventDefault();
    target.style.position = "fixed";
    const rect = target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    target.style.left = `${rect.left}px`;
    target.style.top = `${rect.top}px`;
    target.style.transform = "none";
    target.classList.add("dragging");
    document.body.style.userSelect = "none";
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (isDragging) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - target.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - target.offsetHeight));
      target.style.left = `${newLeft}px`;
      target.style.top = `${newTop}px`;
    }
  });
  handle.addEventListener("pointerup", (e) => {
    if (isDragging) {
      isDragging = false;
      target.classList.remove("dragging");
      document.body.style.userSelect = "auto";
      handle.releasePointerCapture(e.pointerId);
    }
  });
}
