// script.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("Stationary dodecagon with a wheel design, rotating on mouse move!");
  
  pickAsciiBunnyCatPanda(); 
  initCanvas();           // background shapes
  initDodecagonCanvas();  // new dodecagon logic
  initSectionObserver();
  onScrollTypeAscii();

  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScrollTypeAscii);
});

//
// ======== SCHEMES: ORANGE+BLACK, BLACK+ORANGE ========
const colorSchemes = [
  { bg: "#ff5e00", text: "#000000" }, 
  { bg: "#000000", text: "#ff5e00" }  
];

//
// ======== ASCII: BUNNY, CAT, PANDA; typed as we scroll ========
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

//
// ======== BACKGROUND CANVAS: BOUNCING + BREATHING SHAPES ========
let canvas, ctx;
let w, h;
const numShapes = 8;
let shapes = [];
const shapeTypes = ["circle", "square", "triangle"];
let currentShapeIndex = 0;

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
  animateBackground();
}

function onResize() {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
}

function animateBackground() {
  ctx.clearRect(0, 0, w, h);

  shapes.forEach((shape) => {
    shape.breathFactor += 0.02;
    let breathSize = shape.baseSize * (1 + 0.1 * Math.sin(shape.breathFactor));

    shape.x += shape.vx;
    shape.y += shape.vy;

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

  // collisions
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      resolveCollision(shapes[i], shapes[j]);
    }
  }

  // draw shapes
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
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;

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

// collision detection
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
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

//
// ======== DODECAGON CANVAS (Stationary in center, spins on mouse move) ========
let dCanvas, dCtx;
let dWidth = 400;
let dHeight = 400;
let rotation = 0;

function initDodecagonCanvas() {
  dCanvas = document.getElementById("dodecagonCanvas");
  dCtx = dCanvas.getContext("2d");

  // Listen for mouse moves anywhere in the window
  window.addEventListener("mousemove", (e) => {
    // Let rotation be influenced by mouse X or Y
    rotation = (e.clientX + e.clientY) * 0.01;
  });

  // Start the loop to draw the stationary dodecagon in the center
  requestAnimationFrame(drawDodecagonLoop);
}

function drawDodecagonLoop() {
  dCtx.clearRect(0, 0, dWidth, dHeight);

  // Always center the shape at (dWidth/2, dHeight/2)
  let cx = dWidth / 2;
  let cy = dHeight / 2;
  let radius = 100; // radius of the dodecagon

  drawDodecagon(cx, cy, radius, rotation);

  requestAnimationFrame(drawDodecagonLoop);
}

/**
 * Draw a 12-sided polygon with "wheel" lines from center to each vertex,
 * using current text color, and rotating by 'rot'.
 */
function drawDodecagon(cx, cy, radius, rot) {
  let sides = 12;
  let angleStep = (Math.PI * 2) / sides;

  // Grab text color for stroke
  let textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();
  let { r, g, b } = parseHexToRgb(textColor);

  // We'll do a full color line for edges
  let edgeStyle = `rgba(${r}, ${g}, ${b}, 1)`;
  // And a half opacity for center spokes
  let spokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;

  dCtx.lineWidth = 2;
  dCtx.strokeStyle = edgeStyle;

  dCtx.beginPath();

  // Move around the polygon
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

  // Spokes from center to each vertex
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

//
// ======== SECTION OBSERVER FOR HEADERS + BG/TEXT COLOR SWAP ========
function initSectionObserver() {
  const sections = document.querySelectorAll(".section");
  const options = { threshold: 0.2 };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const header = entry.target.querySelector(".section-header");
      if (!header) return;

      if (entry.isIntersecting) {
        const sectionIndex = Array.from(sections).indexOf(entry.target);

        // Switch shape type (background shapes)
        currentShapeIndex = sectionIndex % shapeTypes.length;

        // Flip background & text color
        const scheme = colorSchemes[sectionIndex % 2];
        document.documentElement.style.setProperty("--bg-color", scheme.bg);
        document.documentElement.style.setProperty("--text-color", scheme.text);

        if (!header.classList.contains("glitch-intro")) {
          header.classList.add("glitch-intro");
        }
      } else {
        header.classList.remove("glitch-intro");
      }
    });
  }, options);

  sections.forEach((section) => observer.observe(section));
}

//
// ======== CONTACT FORM ========
const contactForm = document.querySelector(".contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thanks for reaching out!");
  });
}
