document.addEventListener("DOMContentLoaded", () => {
  console.log("All features initialized: Enlarging boxes on hover, project modals, glitch effects, music and minigame buttons, chatbox, and retro music player.");

  pickAsciiBunnyCatPanda();
  initCanvas();
  initDodecagonCanvas();
  initSectionObserver(); // sets data-scheme so hover backgrounds change
  onScrollTypeAscii();
  initBlogPosts();

  initMinigamePrompt();
  initMusicPrompt();
  initChatbox();
  initProjectModal();
  initRetroMusicPlayer();

  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScrollTypeAscii);
});

/* ======== SCHEMES: ORANGE+BLACK, BLACK+ORANGE ======== */
const colorSchemes = [
  { bg: "#ff5e00", text: "#000000" },
  { bg: "#000000", text: "#ff5e00" }
];

/* ======== ASCII: BUNNY, CAT, PANDA; typed as we scroll ======== */
let asciiFull = "";
function pickAsciiBunnyCatPanda() {
  const bunny = ["  (\\(\\ ", " ( -.- )", "  o(\")(\")"];
  const cat   = ["  /\\__/\\", " (  o.o  )", "  >  ^  < "];
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
  let ratio = 0;
  if (docHeight > 0) {
    ratio = scrollTop / docHeight;
  }
  const revealCount = Math.floor(asciiFull.length * ratio);
  asciiCorner.textContent = asciiFull.substring(0, revealCount);
}

/* ======== BACKGROUND CANVAS: BOUNCING + REPELLING SHAPES ======== */
let canvas, ctx;
let w, h;
const numShapes = 8;
let shapes = [];
const shapeTypes = ["circle", "square", "triangle"];
let currentShapeIndex = 0;

let mouseX = -9999;
let mouseY = -9999;
const repelRadius = 100;
const repelForce = 0.03;

function initCanvas() {
  canvas = document.getElementById("bgCanvas");
  ctx = canvas.getContext("2d");
  onResize();

  for (let i = 0; i < numShapes; i++) {
    let baseSize = 20 + Math.random() * 40;
    let vx = (Math.random() * 2 - 1) * 1;
    let vy = (Math.random() * 2 - 1) * 1;
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
  });

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

  shapes.forEach((shape) => {
    shape.breathFactor += 0.02;
    let breathSize = shape.baseSize * (1 + 0.1 * Math.sin(shape.breathFactor));

    shape.x += shape.vx;
    shape.y += shape.vy;

    // Repel from mouse
    let dx = shape.x - mouseX;
    let dy = shape.y - mouseY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < repelRadius) {
      let angle = Math.atan2(dy, dx);
      shape.x += Math.cos(angle) * repelForce * (repelRadius - dist);
      shape.y += Math.sin(angle) * repelForce * (repelRadius - dist);
    }

    // bounce edges
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

  // collision detection
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      resolveCollision(shapes[i], shapes[j]);
    }
  }

  shapes.forEach((shape) => {
    let breathSize = shape.baseSize * (1 + 0.1 * Math.sin(shape.breathFactor));
    drawBackgroundShape(shapeTypes[currentShapeIndex], shape.x, shape.y, breathSize);
  });

  requestAnimationFrame(animateBackground);
}

function drawBackgroundShape(type, x, y, size) {
  ctx.beginPath();
  ctx.lineWidth = 2;

  let textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();
  let { r, g, b } = parseHexToRgb(textColor);

  let edgeStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
  let spokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;

  ctx.strokeStyle = edgeStyle;

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
  let dx = s2.x - s1.x;
  let dy = s2.y - s1.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let minDist = r1 + r2;

  if (dist < minDist) {
    let overlap = (minDist - dist) / 2;
    let nx = dx / dist;
    let ny = dy / dist;

    s1.x -= overlap * nx;
    s1.y -= overlap * ny;
    s2.x += overlap * nx;
    s2.y += overlap * ny;

    let tempVx = s1.vx;
    let tempVy = s1.vy;
    s1.vx = s2.vx;
    s1.vy = s2.vy;
    s2.vx = tempVx;
    s2.vy = tempVy;
  }
}

function parseHexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/* ======== DODECAGON (Breathing Animation) ======== */
let dCanvas, dCtx;
let dWidth = 400;
let dHeight = 400;
let rotation = 0;

// Breathing Variables
let breathePhase = 0;
const breatheSpeed = 0.02; // Adjust for breathing speed
const breatheAmplitude = 0.1; // Adjust for breathing intensity

function initDodecagonCanvas() {
  dCanvas = document.getElementById("dodecagonCanvas");
  dCtx = dCanvas.getContext("2d");
  dWidth = dCanvas.width;
  dHeight = dCanvas.height;

  window.addEventListener("mousemove", (e) => {
    rotation = (e.clientX + e.clientY) * 0.01;
  });

  requestAnimationFrame(drawDodecagonLoop);
}

function drawDodecagonLoop() {
  dCtx.clearRect(0, 0, dWidth, dHeight);

  let cx = dWidth / 2;
  let cy = dHeight / 2;
  
  // Update Breathing Phase
  breathePhase += breatheSpeed;
  let breathScale = 1 + breatheAmplitude * Math.sin(breathePhase);
  
  let baseRadius = 100;
  let currentRadius = baseRadius * breathScale;
  
  drawDodecagon(cx, cy, currentRadius, rotation);

  requestAnimationFrame(drawDodecagonLoop);
}

function drawDodecagon(cx, cy, radius, rot) {
  let sides = 12;
  let angleStep = (Math.PI * 2) / sides;

  let textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();
  let { r, g, b } = parseHexToRgb(textColor);

  let edgeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
  let spokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;

  dCtx.lineWidth = 2;
  dCtx.strokeStyle = edgeStyle;

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

  // Spokes
  dCtx.lineWidth = 1.5;
  dCtx.strokeStyle = spokeStyle;
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

/* ======== SECTION OBSERVER + BG/TEXT COLOR SWAP ======== */
function initSectionObserver() {
  const sections = document.querySelectorAll(".section");
  const options = { threshold: 0.6 }; // Increased threshold for better accuracy

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const sectionIndex = Array.from(sections).indexOf(entry.target);

        // Switch background & text color
        const scheme = colorSchemes[sectionIndex % colorSchemes.length];
        document.documentElement.style.setProperty("--bg-color", scheme.bg);
        document.documentElement.style.setProperty("--text-color", scheme.text);

        // Set data-scheme for hover-based color changes
        if (scheme.bg === "#ff5e00") {
          document.documentElement.setAttribute("data-scheme", "orange");
        } else {
          document.documentElement.setAttribute("data-scheme", "black");
        }

        // Switch shape type
        currentShapeIndex = sectionIndex % shapeTypes.length;
      }
    });
  }, options);

  sections.forEach((section) => observer.observe(section));
}

/* ======== BLOG SECTION LOGIC (Modal with Typewriter fix) ======== */
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

  // Prevent dragging when clicking close button
  closeBtn.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
}

function typeWriterEffect(text, element) {
  element.textContent = "";
  let index = 0;

  function typeChar() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      typeTimer = setTimeout(typeChar, 15);
    } else {
      typeTimer = null;
    }
  }
  typeChar();
}

/* ======== MINIGAME PROMPT LOGIC ======== */
let dinoGameStarted = false;
function initMinigamePrompt() {
  const minigameButton = document.getElementById("minigamePrompt");
  const minigameCanvas = document.getElementById("miniDinoGame");

  minigameButton.addEventListener("click", () => {
    if (minigameCanvas.classList.contains("hidden")) {
      minigameCanvas.classList.remove("hidden");
      startDinoGame();
    } else {
      minigameCanvas.classList.add("hidden");
    }
  });
}

function startDinoGame() {
  if (dinoGameStarted) return;
  dinoGameStarted = true;
  initMiniDinoGame();
}

function initMiniDinoGame() {
  const canvas = document.getElementById("miniDinoGame");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  let dinoX = 30;
  let dinoY = H - 10;
  let dinoW = 15;
  let dinoH = 15;
  let dinoVy = 0;
  let isJumping = false;
  const gravity = 0.5;
  const jumpPower = 8;

  let obstacles = [];
  let frameCount = 0;

  function drawDino() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(dinoX, dinoY - dinoH, dinoW, dinoH);
  }

  function spawnObstacle() {
    obstacles.push({
      x: W,
      y: H - 10,
      width: 10,
      height: 10
    });
  }

  function drawObstacle(obs) {
    ctx.fillStyle = "red";
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }

  function update() {
    if (canvas.classList.contains("hidden")) return;

    ctx.clearRect(0, 0, W, H);

    if (dinoY < H - 10) { // Adjusted to prevent going below ground
      dinoVy -= gravity;
    }
    dinoY -= dinoVy;

    if (dinoY > H - 10) {
      dinoY = H - 10;
      dinoVy = 0;
      isJumping = false;
    }

    obstacles.forEach(obs => {
      obs.x -= 2;
    });
    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

    obstacles.forEach(obs => {
      if (
        dinoX < obs.x + obs.width &&
        (dinoX + dinoW) > obs.x &&
        (dinoY - dinoH) < (obs.y + obs.height) &&
        dinoY > obs.y
      ) {
        obstacles = [];
        dinoX = 30;
        dinoY = H - 10;
        dinoVy = 0;
        isJumping = false;
        alert("Game Over! Dino reset.");
      }
    });

    drawDino();
    obstacles.forEach(drawObstacle);

    frameCount++;
    if (frameCount % 100 === 0) {
      spawnObstacle();
    }

    requestAnimationFrame(update);
  }

  window.addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "ArrowUp") && !isJumping && !canvas.classList.contains("hidden")) {
      dinoVy = jumpPower;
      isJumping = true;
    }
  });

  update();
}

/* ======== MUSIC PROMPT LOGIC ======== */
function initMusicPrompt() {
  const musicButton = document.getElementById("musicPrompt");
  const retroMusicPlayer = document.getElementById("retroMusicPlayer");

  musicButton.addEventListener("click", () => {
    retroMusicPlayer.classList.toggle("hidden");
  });
}

/* ======== CHATBOX MODAL LOGIC ======== */
function initChatbox() {
  const chatboxPrompt = document.getElementById("chatboxPrompt");
  const chatboxModal = document.getElementById("chatboxModal");
  const chatboxCloseBtn = chatboxModal.querySelector(".chatbox-close");
  const chatboxSendBtn = document.getElementById("chatboxSendBtn");
  const chatboxInput = document.getElementById("chatboxInput");
  const chatboxMessages = chatboxModal.querySelector(".chatbox-messages");
  const chatboxInterface = chatboxModal.querySelector(".chatbox-interface");

  // Toggle chatbox modal on chat button click
  chatboxPrompt.addEventListener("click", () => {
      const isHidden = chatboxModal.classList.contains("hidden");
      if (isHidden) {
          chatboxModal.classList.remove("hidden");
          chatboxInput.focus();
      } else {
          chatboxModal.classList.add("hidden");
      }
  });

  // Close chatbox modal on close button click
  chatboxCloseBtn.addEventListener("click", () => {
      chatboxModal.classList.add("hidden");
  });

  // Prevent dragging when clicking close button
  chatboxCloseBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
  });

  // Handle sending message
  chatboxSendBtn.addEventListener("click", () => {
      const message = chatboxInput.value.trim();
      if (!message) return;

      // Append user message
      appendMessageToChat("user", message);

      // Send the message to the chatbot API using a relative URL instead of 127.0.0.1
      fetch("/chat", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ message })
      })
          .then((response) => response.json())
          .then((data) => {
              if (data.response) {
                  // Append bot response
                  appendMessageToChat("bot", data.response);
              } else {
                  appendMessageToChat("bot", "I'm sorry, but I didn't receive a proper response.");
              }
          })
          .catch((error) => {
              console.error("Error communicating with the chatbot API:", error);
              appendMessageToChat("bot", "An error occurred. Please try again later.");
          });

      // Clear input field
      chatboxInput.value = "";
  });

  // Allow sending message on Enter key
  chatboxInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
          chatboxSendBtn.click();
      }
  });

  /**
   * Append a message to the chatbox messages container.
   * @param {string} role - "user" or "bot".
   * @param {string} content - The message content.
   */
  function appendMessageToChat(role, content) {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("chatbox-message", role);
      messageDiv.textContent = content;
      chatboxMessages.appendChild(messageDiv);
      chatboxMessages.scrollTop = chatboxMessages.scrollHeight; // Scroll to bottom
  }

  /* ======== Make Chatbox Draggable ======== */
  makeElementDraggable(chatboxInterface);
}

/* ======== Make Element Draggable ======== */
function makeElementDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;

  // Only allow dragging when mousedown on header, excluding close buttons
  const dragHandle = element.querySelector(".chatbox-header, .music-header");
  if (dragHandle) {
    dragHandle.addEventListener("mousedown", (e) => {
      // If the target is a close button, do not initiate drag
      if (e.target.closest('.chatbox-close') || e.target.closest('.modal-close')) {
        return;
      }
      isDragging = true;

      // Get the current position
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Remove the transform to allow accurate positioning
      element.style.transform = 'none';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;

      element.classList.add('dragging');
      document.body.style.userSelect = 'none'; // Prevent text selection
    });
  }

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // Prevent the element from moving out of the viewport
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
      document.body.style.userSelect = 'auto'; // Re-enable text selection
    }
  });
}

/* ======== PROJECT MODAL LOGIC ======== */
function initProjectModal() {
  const projectCards = document.querySelectorAll(".project-card");
  const projectModal = document.getElementById("projectModal");
  const projectModalTitle = projectModal.querySelector(".modal-title");
  const projectModalBody = projectModal.querySelector(".modal-body");
  const projectModalClose = projectModal.querySelector(".modal-close");

  projectCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      const file = card.getAttribute("data-file");
      const projectTitle = card.querySelector("h2").textContent;

      projectModalTitle.textContent = projectTitle;
      projectModalBody.innerHTML = ""; // Clear previous content

      if (file.endsWith(".md")) {
        // Fetch and parse Markdown file
        fetch(`docs/${file}`)
          .then(response => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.text();
          })
          .then(mdText => {
            const htmlContent = marked.parse(mdText);
            const markdownDiv = document.createElement("div");
            markdownDiv.classList.add("markdown-content");
            markdownDiv.innerHTML = htmlContent;
            projectModalBody.appendChild(markdownDiv);
          })
          .catch(error => {
            projectModalBody.textContent = "Error loading the document.";
            console.error("There has been a problem with your fetch operation:", error);
          });
      } else if (file.endsWith(".pdf") || file.endsWith(".html")) {
        // Embed PDF or HTML in iframe
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

  // Prevent dragging when clicking close button
  projectModalClose.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
}

/* ======== RETRO-STYLED MUSIC PLAYER ======== */
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
  const favoritesDropdown = retroMusicPlayer.querySelector(".favorites-dropdown");
  const favoritesList = document.getElementById("favoritesList");
  const audioPlayer = document.getElementById("audioPlayer");

  // List of available songs
  const songs = [
    {
      id: 1,
      name: "Sunrise Symphony",
      artist: "Luna Beats",
      filePath: "docs/sample.mp3"
    },
    {
      id: 2,
      name: "Midnight Groove",
      artist: "Solaris",
      filePath: "docs/sample2.mp3"
    },
    {
      id: 3,
      name: "Her Eyes",
      artist: "Narvent",
      filePath: "docs/sample3.mp3"
    },
    {
      id: 4,
      name: "Depression",
      artist: "Sun",
      filePath: "docs/sample3.mp3"
    }
    // Add more songs as needed
  ];

  let currentSongIndex = 0;

  let isPlaying = false;
  let audioContext, analyser, source, dataArray, bufferLength;
  let animationId;

  let lastBackwardClick = 0; // Timestamp for backward button double-click

  // Initialize Audio Context for Waveform
  function initAudioContext() {
    if (audioContext) return; // Prevent multiple initializations
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }

  // Draw Waveform
  function drawWaveform() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    const canvasCtx = waveformCanvas.getContext('2d');
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;

    // Change visualizer color based on color scheme
    let visualizerColor;
    const currentScheme = document.documentElement.getAttribute("data-scheme");
    if (currentScheme === "orange") {
      visualizerColor = '#ff5e00';
      canvasCtx.fillStyle = '#000000';
    } else {
      visualizerColor = '#000000';
      canvasCtx.fillStyle = '#ff5e00';
    }

    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = visualizerColor;

    canvasCtx.beginPath();

    let sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {

      let v = dataArray[i] / 128.0;
      let y = v * height/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(width, height/2);
    canvasCtx.stroke();

    animationId = requestAnimationFrame(drawWaveform);
  }

  // Load song
  function loadSong(index) {
    if (index < 0 || index >= songs.length) return;
    currentSongIndex = index;
    audioPlayer.src = songs[currentSongIndex].filePath;
    songTitle.textContent = songs[currentSongIndex].name;
    songArtist.textContent = songs[currentSongIndex].artist;
    songAlbum.textContent = "Album/Playlist"; // You can set dynamically if needed

    // Reset progress bar
    progressBar.value = 0;
    currentTimeSpan.textContent = "0:00";
    totalTimeSpan.textContent = "0:00";

    // If audio is playing, continue visualization
    if (!audioContext) {
      initAudioContext();
      drawWaveform();
    }

    // Reset visualizer by clearing previous data
    if (analyser && dataArray) {
      analyser.getByteTimeDomainData(dataArray);
    }

    // Load the new song
    audioPlayer.load();
  }

  // Play/Pause Toggle
  btnPlayPause.addEventListener("click", () => {
    if (!isPlaying) {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  });

  // Play
  audioPlayer.addEventListener("play", () => {
    isPlaying = true;
    btnPlayPause.classList.remove("play");
    btnPlayPause.classList.add("pause");
    btnPlayPause.classList.add("breathing"); // Start breathing
    if (!audioContext) {
      initAudioContext();
      drawWaveform();
    }
  });

  // Pause
  audioPlayer.addEventListener("pause", () => {
    isPlaying = false;
    btnPlayPause.classList.remove("pause");
    btnPlayPause.classList.add("play");
    btnPlayPause.classList.remove("breathing"); // Stop breathing
    // Visualizer continues updating
  });

  // Forward (Next Track)
  btnForward.addEventListener("click", () => {
    nextSong();
  });

  // Backward (Restart or Previous Track)
  btnBackward.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastBackwardClick < 500) { // 500ms threshold for double-click
      previousSong();
      lastBackwardClick = 0; // Reset
    } else {
      restartSong();
      lastBackwardClick = now;
    }
  });

  // Update Progress Bar
  audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressBar.value = progress;
      currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
      totalTimeSpan.textContent = formatTime(audioPlayer.duration);
    }
  });

  // Seek
  progressBar.addEventListener("input", () => {
    const seekTime = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
  });

  // Format Time
  function formatTime(time) {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }

  // Favorite
  btnFavorite.addEventListener("click", () => {
    const currentSong = songs[currentSongIndex];
    addFavorite(currentSong);
  });

  // Add favorite to list and localStorage
  function addFavorite(song) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Check if song is already in favorites
    if (favorites.some(fav => fav.id === song.id)) {
      alert("This song is already in your favorites.");
      return;
    }

    favorites.push(song);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    populateFavorites();
  }

  // Populate favorites dropdown
  function populateFavorites() {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favoritesList.innerHTML = ""; // Clear existing list

    if (favorites.length === 0) {
      const li = document.createElement('li');
      li.textContent = "No favorites yet.";
      favoritesList.appendChild(li);
      return;
    }

    favorites.forEach((fav) => {
      const songIndex = songs.findIndex(song => song.id === fav.id);
      if (songIndex === -1) return; // Skip if song not found

      const li = document.createElement('li');
      li.textContent = `${fav.name} by ${fav.artist}`;
      li.dataset.index = songIndex; // Store song index
      li.addEventListener("click", () => {
        const index = parseInt(li.dataset.index);
        if (!isNaN(index) && index >= 0 && index < songs.length) {
          loadSong(index);
          audioPlayer.play();
        } else {
          alert("Selected song not found.");
        }
      });
      favoritesList.appendChild(li);
    });
  }

  // Toggle favorites dropdown
  btnFavoritesToggle.addEventListener("click", () => {
    favoritesDropdown.classList.toggle('hidden');
  });

  /* ======== Make Music Player Draggable ======== */
  makeElementDraggable(retroMusicPlayer);

  // Load next song
  function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadSong(currentSongIndex);
    audioPlayer.play();
  }

  // Load previous song
  function previousSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
    audioPlayer.play();
  }

  // Restart current song
  function restartSong() {
    audioPlayer.currentTime = 0;
  }

  // Handle automatic next song on track end
  audioPlayer.addEventListener("ended", () => {
    nextSong();
  });

  // Initialize Retro Music Player
  function initRetroMusicPlayerFunc() {
    loadSong(currentSongIndex);
    populateFavorites();
  }

  initRetroMusicPlayerFunc();
}

/* ======== Make Element Draggable ======== */
/* (Already defined above, but included again for completeness) */
/* This function ensures that the draggable elements (chatbox and music player) align correctly when dragged */
function makeElementDraggable(element) {
  let isDragging = false;
  let offsetX, offsetY;

  // Only allow dragging when mousedown on header, excluding close buttons
  const dragHandle = element.querySelector(".chatbox-header, .music-header");
  if (dragHandle) {
    dragHandle.addEventListener("mousedown", (e) => {
      // If the target is a close button, do not initiate drag
      if (e.target.closest('.chatbox-close') || e.target.closest('.modal-close')) {
        return;
      }
      isDragging = true;

      // Get the current position
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Remove the transform to allow accurate positioning
      element.style.transform = 'none';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;

      element.classList.add('dragging');
      document.body.style.userSelect = 'none'; // Prevent text selection
    });
  }

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      let newLeft = e.clientX - offsetX;
      let newTop = e.clientY - offsetY;

      // Prevent the element from moving out of the viewport
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
      document.body.style.userSelect = 'auto'; // Re-enable text selection
    }
  });
}
