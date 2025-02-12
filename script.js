// script.js (Refactored for an optimized Retro OS)

class Util {
  static debounce(func, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }
  static parseHexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  static shadeColor(color, percent) {
    let num = parseInt(color.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = ((num >> 8) & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
}

class ThemeManager {
  constructor() {
    this.themes = [
      { name: "Orange & Black", sub: [{ bg: "#ff5e00", text: "#000000" }, { bg: "#000000", text: "#ff5e00" }] },
      { name: "Black & Bright Green", sub: [{ bg: "#000000", text: "#00ff00" }, { bg: "#00ff00", text: "#000000" }] },
      { name: "Dark Purple & Neon Green", sub: [{ bg: "#2e003e", text: "#00ff00" }, { bg: "#00ff00", text: "#2e003e" }] },
      { name: "Navy Blue & Light Blue", sub: [{ bg: "#001f3f", text: "#7FDBFF" }, { bg: "#7FDBFF", text: "#001f3f" }] },
      { name: "Dark Maroon & Amber", sub: [{ bg: "#0d0208", text: "#f2a900" }, { bg: "#f2a900", text: "#0d0208" }] },
      { name: "Dark Blue & Off-White", sub: [{ bg: "#011627", text: "#fdfffc" }, { bg: "#fdfffc", text: "#011627" }] },
    ];
    this.currentTheme = null;
  }
  init() {
    // Default theme: Navy Blue & Light Blue
    this.currentTheme = this.themes[3];
    document.documentElement.style.setProperty("--bg-color", this.currentTheme.sub[0].bg);
    document.documentElement.style.setProperty("--text-color", this.currentTheme.sub[0].text);
    document.documentElement.setAttribute("data-scheme", this.currentTheme.name);
    document.documentElement.style.setProperty("--pulse-color", this.getPulseColor(this.currentTheme.sub[0].text));
  }
  randomizeTheme() {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * this.themes.length);
    } while (this.themes[randomIndex].name === this.currentTheme.name);
    this.currentTheme = this.themes[randomIndex];
    document.documentElement.style.setProperty("--bg-color", this.currentTheme.sub[0].bg);
    document.documentElement.style.setProperty("--text-color", this.currentTheme.sub[0].text);
    document.documentElement.setAttribute("data-scheme", this.currentTheme.name);
    document.documentElement.style.setProperty("--pulse-color", this.getPulseColor(this.currentTheme.sub[0].text));
    RetroOS.instance.tetrisThemeUpdate();
  }
  updateTetrisTheme(scheme) {
    let tetrisBg, tetrisAccent;
    if (scheme) {
      tetrisBg = scheme.bg;
      tetrisAccent = scheme.text;
    } else {
      tetrisBg = this.currentTheme.sub[0].bg;
      tetrisAccent = this.currentTheme.sub[0].text;
    }
    document.documentElement.style.setProperty("--tetris-bg", tetrisBg);
    document.documentElement.style.setProperty("--tetris-accent", tetrisAccent);
    document.documentElement.style.setProperty("--tetris-header-bg", Util.shadeColor(tetrisBg, -20));
  }
  getPulseColor(hexColor, alpha = 0.6) {
    const rgb = Util.parseHexToRgb(hexColor);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
}

class ModalManager {
  constructor() {
    this.currentTopZ = 11000;
    this.currentActiveModal = null;
    this.pendingBringToFrontTimeout = null;
  }
  bringModalToFront(modal) {
    if (modal.id === "retroMusicPlayer") return; // locked in front
    this.currentTopZ++;
    modal.style.zIndex = this.currentTopZ;
  }
}
// Create a singleton instance for global use
ModalManager.instance = new ModalManager();

class Draggable {
  static makeElementDraggable(element) {
    let isDragging = false, offsetX, offsetY;
    element.addEventListener("pointerdown", e => {
      if (e.target.closest("button, input, select, textarea, .folder")) return;
      isDragging = true;
      e.preventDefault();
      if (getComputedStyle(element).position !== "fixed") {
        element.style.position = "fixed";
      }
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.transform = "none";
      element.classList.add("dragging");
      document.body.style.userSelect = "none";
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener("pointermove", e => {
      if (isDragging) {
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
      }
    });
    element.addEventListener("pointerup", e => {
      if (isDragging) {
        isDragging = false;
        element.classList.remove("dragging");
        document.body.style.userSelect = "auto";
        element.releasePointerCapture(e.pointerId);
      }
    });
  }
  static makeElementDraggableWithHandle(handle, target) {
    let isDragging = false, offsetX, offsetY;
    handle.addEventListener("pointerdown", e => {
      if (e.target.closest("input, button, select, textarea, .folder")) return;
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
    handle.addEventListener("pointermove", e => {
      if (isDragging) {
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - target.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - target.offsetHeight));
        target.style.left = `${newLeft}px`;
        target.style.top = `${newTop}px`;
      }
    });
    handle.addEventListener("pointerup", e => {
      if (isDragging) {
        isDragging = false;
        target.classList.remove("dragging");
        document.body.style.userSelect = "auto";
        handle.releasePointerCapture(e.pointerId);
      }
    });
  }
}

class CanvasBackground {
  constructor() {
    this.canvas = document.getElementById("bgCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.w = 0;
    this.h = 0;
    this.shapes = [];
    this.numShapes = 8;
    this.shapeTypes = ["circle", "square", "triangle"];
    // We no longer auto-cycle the shape type; it now updates via scroll.
    this.currentShapeIndex = 0;
    this.mouseX = -9999;
    this.mouseY = -9999;
    this.repelRadius = 100;
    this.repelForce = 0.03;
  }
  init() {
    this.onResize();
    for (let i = 0; i < this.numShapes; i++) {
      let baseSize = 20 + Math.random() * 40;
      let vx = Math.random() * 2 - 1;
      let vy = Math.random() * 2 - 1;
      this.shapes.push({
        x: Math.random() * (this.w - baseSize * 2) + baseSize,
        y: Math.random() * (this.h - baseSize * 2) + baseSize,
        baseSize,
        vx,
        vy,
      });
    }
    window.addEventListener("mousemove", e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }, { passive: true });
    requestAnimationFrame(this.animate.bind(this));
    window.addEventListener("resize", Util.debounce(this.onResize.bind(this), 100));
  }
  onResize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }
  animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue("--text-color").trim();
    const rgb = Util.parseHexToRgb(textColor);
    let musicFactor = window.currentMusicFactor || 0;
    const MUSIC_MULTIPLIER = 60; // Adjust to change pulsing amplitude
    // Update shape positions and sizes based on music factor
    this.shapes.forEach(shape => {
      let dynamicSize = shape.baseSize * (1 + MUSIC_MULTIPLIER * Math.pow(musicFactor, 2));
      shape.x += shape.vx;
      shape.y += shape.vy;
      let dx = shape.x - this.mouseX, dy = shape.y - this.mouseY;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.repelRadius) {
        let angle = Math.atan2(dy, dx);
        shape.x += Math.cos(angle) * this.repelForce * (this.repelRadius - dist);
        shape.y += Math.sin(angle) * this.repelForce * (this.repelRadius - dist);
      }
      if (shape.x - dynamicSize < 0) {
        shape.x = dynamicSize;
        shape.vx = -shape.vx;
      } else if (shape.x + dynamicSize > this.w) {
        shape.x = this.w - dynamicSize;
        shape.vx = -shape.vx;
      }
      if (shape.y - dynamicSize < 0) {
        shape.y = dynamicSize;
        shape.vy = -shape.vy;
      } else if (shape.y + dynamicSize > this.h) {
        shape.y = this.h - dynamicSize;
        shape.vy = -shape.vy;
      }
    });
    // Resolve collisions between shapes
    for (let i = 0; i < this.shapes.length; i++) {
      for (let j = i + 1; j < this.shapes.length; j++) {
        this.resolveCollision(this.shapes[i], this.shapes[j]);
      }
    }
    // Draw shapes using the current shape type (set by scroll via SectionObserver)
    this.shapes.forEach(shape => {
      let dynamicSize = shape.baseSize * (1 + MUSIC_MULTIPLIER * Math.pow(musicFactor, 2));
      this.drawShape(this.shapeTypes[this.currentShapeIndex], shape.x, shape.y, dynamicSize, rgb);
    });
    requestAnimationFrame(this.animate.bind(this));
  }
  drawShape(type, x, y, size, rgb) {
    const ctx = this.ctx;
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
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    ctx.stroke();
  }
  resolveCollision(s1, s2) {
    let effectiveMusicFactor = window.currentMusicFactor || 0;
    const MUSIC_MULTIPLIER = 10;
    let r1 = s1.baseSize * (1 + MUSIC_MULTIPLIER * Math.pow(effectiveMusicFactor, 2));
    let r2 = s2.baseSize * (1 + MUSIC_MULTIPLIER * Math.pow(effectiveMusicFactor, 2));
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
      [s1.vx, s2.vx] = [s2.vx, s1.vx];
      [s1.vy, s2.vy] = [s2.vy, s1.vy];
    }
  }
}

class DodecagonCanvas {
  constructor() {
    this.canvas = document.getElementById("dodecagonCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.dWidth = 400;
    this.dHeight = 400;
  }
  init() {
    this.resize();
    window.addEventListener("resize", this.resize.bind(this));
    requestAnimationFrame(this.loop.bind(this));
  }
  resize() {
    const containerWidth = this.canvas.parentElement.clientWidth;
    if (containerWidth < 400) {
      this.canvas.width = containerWidth;
      this.canvas.height = containerWidth;
    } else {
      this.canvas.width = 400;
      this.canvas.height = 400;
    }
    this.dWidth = this.canvas.width;
    this.dHeight = this.canvas.height;
  }
  loop() {
    this.ctx.clearRect(0, 0, this.dWidth, this.dHeight);
    let cx = this.dWidth / 2, cy = this.dHeight / 2;
    let docHeight = document.body.scrollHeight - window.innerHeight;
    let scrollY = window.scrollY;
    let scrollRatio = docHeight > 0 ? scrollY / docHeight : 0;
    const maxRotation = Math.PI * 7;
    const maxScale = 4;
    let rotation = maxRotation * scrollRatio;
    let baseRadius = Math.min(this.dWidth, this.dHeight) / 4;
    let currentRadius = baseRadius * (1 + (maxScale - 1) * scrollRatio);
    this.drawDodecagon(cx, cy, currentRadius, rotation);
    requestAnimationFrame(this.loop.bind(this));
  }
  drawDodecagon(cx, cy, radius, rot) {
    const sides = 12, angleStep = (Math.PI * 2) / sides;
    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue("--text-color").trim();
    const rgb = Util.parseHexToRgb(textColor);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      let angle = i * angleStep + rot;
      let x = cx + radius * Math.cos(angle);
      let y = cy + radius * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    for (let i = 0; i < sides; i++) {
      let angle = i * angleStep + rot;
      let x = cx + radius * Math.cos(angle);
      let y = cy + radius * Math.sin(angle);
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }
}

class SectionObserver {
  init(themeManager, canvasBackground) {
    const sections = document.querySelectorAll(".section");
    const options = { threshold: 0.6 };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionIndex = Array.from(sections).indexOf(entry.target);
          const scheme = themeManager.currentTheme.sub[sectionIndex % 2];
          document.documentElement.style.setProperty("--bg-color", scheme.bg);
          document.documentElement.style.setProperty("--text-color", scheme.text);
          document.documentElement.setAttribute("data-scheme", themeManager.currentTheme.name);
          document.documentElement.style.setProperty("--pulse-color", themeManager.getPulseColor(scheme.text));
          // Update shape type based on scroll: each section sets the shape type.
          canvasBackground.currentShapeIndex = sectionIndex % canvasBackground.shapeTypes.length;
          themeManager.updateTetrisTheme(scheme);
        }
      });
    }, options);
    sections.forEach(section => observer.observe(section));
  }
}

class BlogModule {
  constructor(modalManager) {
    this.typeTimer = null;
    this.modalManager = modalManager;
  }
  init() {
    const blogPosts = document.querySelectorAll(".blog-post");
    const modal = document.getElementById("blogModal");
    const modalTitle = modal.querySelector(".modal-title");
    const modalText = modal.querySelector(".modal-text");
    const closeBtn = modal.querySelector(".modal-close");
    blogPosts.forEach(post => {
      post.addEventListener("click", () => {
        if (this.modalManager.pendingBringToFrontTimeout) {
          clearTimeout(this.modalManager.pendingBringToFrontTimeout);
          this.modalManager.pendingBringToFrontTimeout = null;
        }
        modal.dataset.openedAt = performance.now();
        modal.classList.remove("hidden");
        this.modalManager.currentActiveModal = modal;
        this.modalManager.bringModalToFront(modal);
        modalTitle.textContent = post.dataset.title;
        if (this.typeTimer) {
          clearTimeout(this.typeTimer);
          this.typeTimer = null;
        }
        modalText.textContent = "";
        this.typeWriterEffect(post.dataset.content, modalText);
      });
    });
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modalText.textContent = "";
      if (this.typeTimer) {
        clearTimeout(this.typeTimer);
        this.typeTimer = null;
      }
    });
    closeBtn.addEventListener("mousedown", e => e.stopPropagation());
    modal.addEventListener("click", e => {
      if (!e.target.closest(".modal-content")) {
        modal.classList.add("hidden");
        modalText.textContent = "";
        if (this.typeTimer) {
          clearTimeout(this.typeTimer);
          this.typeTimer = null;
        }
      }
    });
  }
  typeWriterEffect(text, element) {
    element.textContent = "";
    let index = 0;
    const typeChar = () => {
      if (index < text.length) {
        if (text.substr(index, 8) === "Model A:" || text.substr(index, 8) === "Model B:") {
          if (!element.textContent.endsWith("\n\n")) {
            element.textContent = element.textContent.replace(/\n*$/, "\n\n");
          }
        }
        element.textContent += text.charAt(index);
        index++;
        this.typeTimer = setTimeout(typeChar, 15);
      } else {
        this.typeTimer = null;
      }
    };
    typeChar();
  }
}

class ChatboxModule {
  constructor(modalManager) {
    this.modalManager = modalManager;
  }
  init(apiUrl) {
    const chatboxPrompt = document.getElementById("chatboxPrompt");
    const chatboxModal = document.getElementById("chatboxModal");
    const chatboxCloseBtn = chatboxModal.querySelector(".chatbox-close");
    const chatboxSendBtn = document.getElementById("chatboxSendBtn");
    const chatboxInput = document.getElementById("chatboxInput");
    const chatboxMessages = chatboxModal.querySelector(".chatbox-messages");

    chatboxPrompt.addEventListener("click", () => {
      if (this.modalManager.pendingBringToFrontTimeout) {
        clearTimeout(this.modalManager.pendingBringToFrontTimeout);
        this.modalManager.pendingBringToFrontTimeout = null;
      }
      if (chatboxModal.classList.contains("hidden")) {
        chatboxModal.dataset.openedAt = performance.now();
        chatboxModal.classList.remove("hidden");
        this.modalManager.currentActiveModal = chatboxModal;
        this.modalManager.bringModalToFront(chatboxModal);
        chatboxInput.focus();
        chatboxPrompt.classList.add("active");
      } else {
        chatboxModal.classList.add("hidden");
        chatboxPrompt.classList.remove("active");
      }
    });
    chatboxCloseBtn.addEventListener("click", () => {
      chatboxModal.classList.add("hidden");
      chatboxPrompt.classList.remove("active");
    });
    chatboxCloseBtn.addEventListener("mousedown", e => e.stopPropagation());
    chatboxSendBtn.addEventListener("click", () => {
      const message = chatboxInput.value.trim();
      if (!message) return;
      this.appendMessage("user", message, chatboxMessages);
      fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      })
        .then(response => response.json())
        .then(data => {
          if (data.response) {
            this.appendMessage("bot", data.response, chatboxMessages);
          } else {
            this.appendMessage("bot", "I'm sorry, but I didn't receive a proper response.", chatboxMessages);
          }
        })
        .catch(error => {
          console.error("Error with chatbot API:", error);
          this.appendMessage("bot", "An error occurred. Please try again later.", chatboxMessages);
        });
      chatboxInput.value = "";
    });
    chatboxInput.addEventListener("keydown", e => {
      if (e.key === "Enter") chatboxSendBtn.click();
    });
    chatboxModal.addEventListener("pointerdown", () => {
      this.modalManager.bringModalToFront(chatboxModal);
    });
    Draggable.makeElementDraggable(chatboxModal);
  }
  appendMessage(role, content, container) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chatbox-message", role);
    messageDiv.textContent = content;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }
}

class DataModule {
  constructor(modalManager) {
    this.modalManager = modalManager;
  }
  init() {
    const dataPrompt = document.getElementById("dataPrompt");
    const dataModal = document.getElementById("dataModal");
    const dataModalClose = document.getElementById("dataModalClose");
    dataPrompt.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      if (this.modalManager.pendingBringToFrontTimeout) {
        clearTimeout(this.modalManager.pendingBringToFrontTimeout);
        this.modalManager.pendingBringToFrontTimeout = null;
      }
      dataModal.dataset.openedAt = performance.now();
      dataModal.classList.remove("hidden");
      this.modalManager.currentActiveModal = dataModal;
      this.modalManager.bringModalToFront(dataModal);
      this.fetchDataAnalytics();
      dataPrompt.classList.add("active");
    });
    dataModalClose.addEventListener("click", () => {
      dataModal.classList.add("hidden");
      dataPrompt.classList.remove("active");
    });
    dataModal.addEventListener("click", e => {
      if (!e.target.closest(".modal-content")) {
        dataModal.classList.add("hidden");
        dataPrompt.classList.remove("active");
      }
    });
  }
  fetchDataAnalytics() {
    const dataModalBody = document.getElementById("dataModalBody");
    const analyticsAPI = "/analytics";
    dataModalBody.innerHTML = "<p>Loading site data...</p>";
    fetch(analyticsAPI)
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => this.processAnalyticsData(data))
      .catch(error => {
        console.error("Error fetching analytics:", error);
        fetch("analytics_data.json")
          .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
          })
          .then(data => this.processAnalyticsData(data))
          .catch(fallbackError => {
            dataModalBody.innerHTML = `<p>Error loading site data: ${fallbackError.message}</p>`;
            console.error("Fallback analytics error:", fallbackError);
          });
      });
  }
  processAnalyticsData(data) {
    const dataModalBody = document.getElementById("dataModalBody");
    const countsByHour = {};
    data.timeseries.forEach(record => {
      const date = new Date(record.timestamp);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hour = date.getHours().toString().padStart(2, "0");
      const key = `${year}-${month}-${day} ${hour}:00`;
      countsByHour[key] = (countsByHour[key] || 0) + 1;
    });
    const sortedLabels = Object.keys(countsByHour).sort();
    const counts = sortedLabels.map(label => countsByHour[label]);
    dataModalBody.innerHTML = `<canvas id="analyticsChart" width="400" height="200"></canvas>`;
    this.plotAnalyticsChart(sortedLabels, counts);
  }
  plotAnalyticsChart(labels, dataPoints) {
    const ctx = document.getElementById("analyticsChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Visits per Hour",
          data: dataPoints,
          backgroundColor: "rgba(255, 94, 0, 0.2)",
          borderColor: "rgba(255, 94, 0, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(0,0,0,1)"
        }]
      },
      options: {
        scales: {
          x: {
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
              font: { family: "VT323, monospace" }
            },
            grid: { color: "rgba(0,0,0,0.2)" }
          },
          y: {
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
              font: { family: "VT323, monospace" }
            },
            grid: { color: "rgba(0,0,0,0.2)" }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue("--text-color"),
              font: { family: "VT323, monospace" }
            }
          }
        }
      }
    });
  }
}

class MusicPlayer {
  init() {
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
    let currentSongIndex = 0, isPlaying = false;
    let audioContext, analyser, source, dataArray, bufferLength, animationId;
    let lastBackwardClick = 0;

    const initAudioContext = () => {
      if (audioContext) return;
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaElementSource(audioPlayer);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      window.audioAnalyser = analyser;
    };
    const drawWaveform = () => {
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
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
      // Compute RMS from the time-domain data to update music factor for pulsing
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        let deviation = dataArray[i] - 128;
        sum += deviation * deviation;
      }
      let rms = Math.sqrt(sum / bufferLength);
      window.currentMusicFactor = rms / 128; // Normalize to roughly between 0 and 1
      animationId = requestAnimationFrame(drawWaveform);
    };
    const loadSong = index => {
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
    };
    btnPlayPause.addEventListener("click", () => {
      if (!isPlaying) {
        if (audioContext && audioContext.state === "suspended") {
          audioContext.resume();
        }
        audioPlayer.play().catch(err => console.error("Playback failed:", err));
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
      currentSongIndex = (currentSongIndex + 1) % songs.length;
      loadSong(currentSongIndex);
      audioPlayer.play().catch(err => console.error("Playback failed:", err));
    });
    btnBackward.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastBackwardClick < 500) {
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(currentSongIndex);
        audioPlayer.play().catch(err => console.error("Playback failed:", err));
        lastBackwardClick = 0;
      } else {
        audioPlayer.currentTime = 0;
        lastBackwardClick = now;
      }
    });
    audioPlayer.addEventListener("timeupdate", () => {
      if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        totalTimeSpan.textContent = formatTime(audioPlayer.duration);
        document.querySelector(".progress-pulse").style.width = progress + "%";
      }
    });
    progressBar.addEventListener("input", () => {
      const seekTime = (progressBar.value / 100) * audioPlayer.duration;
      audioPlayer.currentTime = seekTime;
    });
    const formatTime = time => {
      if (isNaN(time)) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };
    btnFavorite.addEventListener("click", () => {
      let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
      if (favorites.some(fav => fav.id === songs[currentSongIndex].id)) {
        alert("This song is already in your favorites.");
        return;
      }
      favorites.push(songs[currentSongIndex]);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      populateFavorites();
    });
    const populateFavorites = () => {
      let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
      favoritesList.innerHTML = "";
      if (favorites.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No favorites yet.";
        favoritesList.appendChild(li);
        return;
      }
      favorites.forEach(fav => {
        const songIndex = songs.findIndex(song => song.id === fav.id);
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
    };
    btnFavoritesToggle.addEventListener("click", () => {
      const favoritesDropdown = document.querySelector(".favorites-dropdown");
      favoritesDropdown.classList.toggle("hidden");
    });
    Draggable.makeElementDraggable(retroMusicPlayer);
    audioPlayer.addEventListener("ended", () => {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
      loadSong(currentSongIndex);
      audioPlayer.play().catch(err => console.error("Playback failed:", err));
    });
    loadSong(currentSongIndex);
    populateFavorites();

    // ======= Music Button Toggle =======
    const musicButton = document.getElementById("musicPrompt");
    if (musicButton) {
      musicButton.addEventListener("click", () => {
        if (ModalManager.instance.pendingBringToFrontTimeout) {
          clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
          ModalManager.instance.pendingBringToFrontTimeout = null;
        }
        if (retroMusicPlayer.classList.contains("hidden")) {
          retroMusicPlayer.dataset.openedAt = performance.now();
          retroMusicPlayer.classList.remove("hidden");
          ModalManager.instance.currentActiveModal = retroMusicPlayer;
          ModalManager.instance.bringModalToFront(retroMusicPlayer);
          musicButton.classList.add("active");
        } else {
          retroMusicPlayer.classList.add("hidden");
          musicButton.classList.remove("active");
        }
      });
    }
  }
}

class ProjectModal {
  constructor(modalManager) {
    this.modalManager = modalManager;
    this.currentProjectCard = null;
  }
  init() {
    const projectCards = document.querySelectorAll(".project-card");
    const projectModal = document.getElementById("projectModal");
    const projectModalTitle = projectModal.querySelector(".modal-title");
    const projectModalBody = projectModal.querySelector(".modal-body");
    const projectModalClose = projectModal.querySelector(".modal-close");

    projectCards.forEach(card => {
      card.addEventListener("click", () => {
        // Remove 'active' from all cards first, then add to the clicked one
        projectCards.forEach(c => c.classList.remove("active"));
        this.currentProjectCard = card;
        card.classList.add("active");
    
        const file = card.getAttribute("data-file");
        const projectTitle = card.querySelector("h2").textContent.trim();
    
        if (projectTitle === "Infinite Backrooms") {
          const backroomsModal = document.getElementById("backroomsModal");
          backroomsModal.dataset.openedAt = performance.now();
          backroomsModal.classList.remove("hidden");
          this.modalManager.currentActiveModal = backroomsModal;
          this.modalManager.bringModalToFront(backroomsModal);
          if (window.loadBackrooms) {
            const dropdown = document.getElementById("backroomsDropdown");
            window.loadBackrooms(dropdown.value);
          }
          // Add listener to remove active class when backrooms modal closes
          const backroomsClose = document.getElementById("backroomsClose");
          backroomsClose.addEventListener("click", () => {
            card.classList.remove("active");
          }, { once: true });
          return;
        } else if (projectTitle === "ewluong.com") {
          const chatboxModal = document.getElementById("chatboxModal");
          chatboxModal.dataset.openedAt = performance.now();
          chatboxModal.classList.remove("hidden");
          this.modalManager.currentActiveModal = chatboxModal;
          this.modalManager.bringModalToFront(chatboxModal);
          // Add listener to remove active class when chatbox modal closes
          const chatboxClose = chatboxModal.querySelector(".chatbox-close");
          chatboxClose.addEventListener("click", () => {
            card.classList.remove("active");
          }, { once: true });
          return;
        }
    
        // For all other project cards, open the standard project modal.
        projectModal.dataset.openedAt = performance.now();
        projectModalTitle.textContent = projectTitle;
        projectModalBody.innerHTML = "";
        if (file && file.endsWith(".md")) {
          fetch(`docs/${file}`)
            .then(response => {
              if (!response.ok) throw new Error("Network response was not ok");
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
        this.modalManager.currentActiveModal = projectModal;
        this.modalManager.bringModalToFront(projectModal);
        // Remove active highlight when the standard project modal is closed.
        projectModal.querySelector(".modal-close").addEventListener("click", () => {
          card.classList.remove("active");
        }, { once: true });
      });
    });
    

    projectModalClose.addEventListener("click", () => {
      projectModal.classList.add("hidden");
      projectModalBody.innerHTML = "";
      // Remove the active highlight from the project card
      if (this.currentProjectCard) {
        this.currentProjectCard.classList.remove("active");
        this.currentProjectCard = null;
      }
    });

    projectModalClose.addEventListener("mousedown", e => e.stopPropagation());

    projectModal.addEventListener("click", e => {
      if (!e.target.closest(".modal-content")) {
        projectModal.classList.add("hidden");
        projectModalBody.innerHTML = "";
        // Remove the active highlight when modal is closed by clicking outside
        if (this.currentProjectCard) {
          this.currentProjectCard.classList.remove("active");
          this.currentProjectCard = null;
        }
      }
    });
  }
}

class BackroomsModule {
  constructor() {
    this.typeInterval = null;
    this.backroomsContent = "";
    this.currentIndex = 0;
    this.displayBuffer = "";
    this.typingSpeed = 1;
  }
  init() {
    const backroomsPrompt = document.getElementById("backroomsPrompt");
    const backroomsModal = document.getElementById("backroomsModal");
    const backroomsClose = document.getElementById("backroomsClose");
    const dropdown = document.getElementById("backroomsDropdown");
    const searchInput = document.getElementById("backroomsSearch");
    const searchBtn = document.getElementById("backroomsSearchBtn");
    const clearBtn = document.getElementById("backroomsClearBtn");

    const conversationFiles = [
      { name: "Backrooms 1", file: "docs/backrooms1.txt" },
      { name: "All Conversations", file: "all" },
      { name: "Backrooms 2", file: "docs/backrooms2.txt" },
      { name: "Backrooms 3", file: "docs/backrooms3.txt" }
    ];
    dropdown.innerHTML = "";
    conversationFiles.forEach(fileObj => {
      let option = document.createElement("option");
      option.value = fileObj.file;
      option.textContent = fileObj.name;
      dropdown.appendChild(option);
    });
    dropdown.selectedIndex = 0;
    window.loadBackrooms = this.loadConversation.bind(this);
    backroomsPrompt.addEventListener("click", () => {
      if (ModalManager.instance.pendingBringToFrontTimeout) {
        clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
        ModalManager.instance.pendingBringToFrontTimeout = null;
      }
      if (backroomsModal.classList.contains("hidden")) {
        backroomsModal.dataset.openedAt = performance.now();
        backroomsModal.classList.remove("hidden");
        ModalManager.instance.currentActiveModal = backroomsModal;
        ModalManager.instance.bringModalToFront(backroomsModal);
        this.loadConversation(dropdown.value);
        backroomsPrompt.classList.add("active");
      } else {
        backroomsModal.classList.add("hidden");
        this.stopTypewriter();
        this.resetContainer();
        backroomsPrompt.classList.remove("active");
      }
    });
    backroomsClose.addEventListener("click", () => {
      backroomsModal.classList.add("hidden");
      this.stopTypewriter();
      this.resetContainer();
      backroomsPrompt.classList.remove("active");
    });
    backroomsClose.addEventListener("mousedown", e => e.stopPropagation());
    dropdown.addEventListener("change", () => {
      this.loadConversation(dropdown.value);
    });
    searchBtn.addEventListener("click", () => {
      let query = searchInput.value.trim();
      if (query !== "") {
        this.stopTypewriter();
        document.getElementById("backroomsText").innerHTML = this.searchBackroomsContent(query);
      }
    });
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      this.resetContainer();
      this.displayBuffer = "";
      this.currentIndex = 0;
      this.loadConversation(dropdown.value);
    });
    const backroomsHeader = document.querySelector(".vcr-header");
    Draggable.makeElementDraggableWithHandle(backroomsHeader, document.querySelector(".backrooms-modal-content"));
  }
  resetContainer() {
    document.getElementById("backroomsText").innerHTML =
      '<span id="backroomsContent"></span><span id="cursor"></span>';
  }
  loadConversation(fileValue) {
    this.stopTypewriter();
    this.resetContainer();
    this.backroomsContent = "";
    this.currentIndex = 0;
    this.displayBuffer = "";
    const backroomsContentElement = document.getElementById("backroomsContent");
    if (fileValue === "all") {
      let promises = [];
      const files = Array.from(document.querySelectorAll("#backroomsDropdown option"))
                    .filter(opt => opt.value !== "all")
                    .map(opt => opt.value);
      promises = files.map(file => fetch(file).then(response => {
        if (!response.ok) throw new Error("Network error");
        return response.text();
      }));
      Promise.all(promises)
        .then(results => {
          this.backroomsContent = results.join("\n\n").replace(/\r?\n(?=\d{4}-\d{2}-\d{2}.*Model [AB]:)/g, "\n\n");
          this.startTypewriter();
        })
        .catch(err => {
          console.error(err);
          backroomsContentElement.textContent = "Error loading conversations.";
        });
    } else {
      fetch(fileValue)
        .then(response => {
          if (!response.ok) throw new Error("Network error");
          return response.text();
        })
        .then(text => {
          this.backroomsContent = text.replace(/\r?\n(?=\d{4}-\d{2}-\d{2}.*Model [AB]:)/g, "\n\n");
          this.startTypewriter();
        })
        .catch(err => {
          console.error(err);
          backroomsContentElement.textContent = "Error loading conversation.";
        });
    }
  }
  startTypewriter() {
    const backroomsContentElement = document.getElementById("backroomsContent");
    this.typeInterval = setInterval(() => {
      if (this.backroomsContent.length === 0) return;
      if (this.backroomsContent.substr(this.currentIndex, 8) === "Model A:" || this.backroomsContent.substr(this.currentIndex, 8) === "Model B:") {
        if (!this.displayBuffer.endsWith("\n\n")) {
          this.displayBuffer = this.displayBuffer.replace(/\n*$/, "\n\n");
        }
      }
      let nextChar = this.backroomsContent.charAt(this.currentIndex);
      this.displayBuffer += nextChar;
      this.currentIndex++;
      if (this.currentIndex >= this.backroomsContent.length) {
        clearInterval(this.typeInterval);
      }
      backroomsContentElement.textContent = this.displayBuffer;
      document.getElementById("backroomsText").scrollTop =
        document.getElementById("backroomsText").scrollHeight;
    }, this.typingSpeed);
  }
  stopTypewriter() {
    if (this.typeInterval) {
      clearInterval(this.typeInterval);
      this.typeInterval = null;
    }
  }
  searchBackroomsContent(query) {
    if (!this.backroomsContent) return "No content loaded.";
    let lowerContent = this.backroomsContent.toLowerCase();
    let lowerQuery = query.toLowerCase();
    let results = [];
    let startPos = 0;
    while (true) {
      let foundIndex = lowerContent.indexOf(lowerQuery, startPos);
      if (foundIndex === -1) break;
      let excerptStart = Math.max(0, foundIndex - 50);
      let excerptEnd = Math.min(this.backroomsContent.length, foundIndex + query.length + 50);
      let excerpt = this.backroomsContent.substring(excerptStart, excerptEnd);
      let regex = new RegExp(query, "gi");
      excerpt = excerpt.replace(regex, match => `<mark>${match}</mark>`);
      results.push("..." + excerpt + "...");
      if (results.length >= 30) break;
      startPos = foundIndex + query.length;
    }
    if (results.length === 0) return "No results found for '" + query + "'.";
    return results.join("<br><br>");
  }
}

class CryptoModule {
  init() {
    const cryptoModal = document.getElementById("cryptoModal");
    const cryptoOption = document.getElementById("cryptoOption");
    cryptoModal.addEventListener("pointerdown", e => {
      if (ModalManager.instance.pendingBringToFrontTimeout)
        clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
      ModalManager.instance.pendingBringToFrontTimeout = setTimeout(() => {
        ModalManager.instance.currentActiveModal = cryptoModal;
        ModalManager.instance.bringModalToFront(cryptoModal);
        ModalManager.instance.pendingBringToFrontTimeout = null;
      }, 50);
    }, true);
    cryptoOption.addEventListener("click", this.openCryptoModal.bind(this));
    Draggable.makeElementDraggable(cryptoModal);
    document.getElementById("cryptoRefreshBtn").addEventListener("click", e => {
      e.stopPropagation();
      this.fetchCryptoPrices();
    });
    document.getElementById("cryptoCloseBtn").addEventListener("click", e => {
      e.stopPropagation();
      cryptoModal.classList.add("hidden");
    });
  }
  fetchCryptoPrices() {
    const cryptoContent = document.getElementById("cryptoContent");
    cryptoContent.innerHTML = "<p>Loading crypto data...</p>";
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&x_cg_demo_api_key=CG-ZLew5KBHPP9mX3ih2YcbnMrb";
    fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
      .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then(data => {
        let html = "<table>";
        html += "<tr><th>Coin</th><th>Price (USD)</th><th>Market Cap</th><th>24hr Change</th></tr>";
        if (data.bitcoin) {
          html += `<tr><td>Bitcoin</td><td>$${data.bitcoin.usd.toLocaleString()}</td><td>$${data.bitcoin.usd_market_cap.toLocaleString()}</td><td>${this.formatChange(data.bitcoin.usd_24h_change)}</td></tr>`;
        }
        if (data.ethereum) {
          html += `<tr><td>Ethereum</td><td>$${data.ethereum.usd.toLocaleString()}</td><td>$${data.ethereum.usd_market_cap.toLocaleString()}</td><td>${this.formatChange(data.ethereum.usd_24h_change)}</td></tr>`;
        }
        if (data.solana) {
          html += `<tr><td>Solana</td><td>$${data.solana.usd.toLocaleString()}</td><td>$${data.solana.usd_market_cap.toLocaleString()}</td><td>${this.formatChange(data.solana.usd_24h_change)}</td></tr>`;
        }
        html += "</table>";
        cryptoContent.innerHTML = html;
      })
      .catch(error => {
        console.error("Error fetching crypto data:", error);
        cryptoContent.innerHTML = `<p>Error loading crypto data: ${error.message}</p>`;
      });
  }
  formatChange(value) {
    return `<span class="${value < 0 ? 'negative' : 'positive'}">${value.toFixed(2)}%</span>`;
  }
  openCryptoModal() {
    const cryptoModal = document.getElementById("cryptoModal");
    cryptoModal.dataset.openedAt = performance.now();
    cryptoModal.classList.remove("hidden");
    ModalManager.instance.currentActiveModal = cryptoModal;
    ModalManager.instance.bringModalToFront(cryptoModal);
    this.fetchCryptoPrices();
  }
}

class WidgetsModule {
  init() {
    const widgetsPrompt = document.getElementById("widgetsPrompt");
    const widgetsModal = document.getElementById("widgetsModal");
    const widgetsModalClose = document.getElementById("widgetsModalClose");

    widgetsPrompt.addEventListener("click", () => {
      if (ModalManager.instance.pendingBringToFrontTimeout) {
        clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
        ModalManager.instance.pendingBringToFrontTimeout = null;
      }
      if (widgetsModal.classList.contains("hidden")) {
        widgetsModal.dataset.openedAt = performance.now();
        widgetsModal.classList.remove("hidden");
        ModalManager.instance.currentActiveModal = widgetsModal;
        ModalManager.instance.bringModalToFront(widgetsModal);
        widgetsPrompt.classList.add("active");
      } else {
        widgetsModal.classList.add("hidden");
        widgetsPrompt.classList.remove("active");
      }
    });
    widgetsModalClose.addEventListener("click", () => {
      widgetsModal.classList.add("hidden");
      widgetsPrompt.classList.remove("active");
    });
    widgetsModal.addEventListener("pointerdown", () => {
      ModalManager.instance.bringModalToFront(widgetsModal);
    }, true);
    Draggable.makeElementDraggable(widgetsModal);
    const folderWeather = document.getElementById("folderWeather");
    const folderCrypto = document.getElementById("folderCrypto");
    const folderMinigame = document.getElementById("folderMinigame");
    folderWeather.addEventListener("click", () => {
      widgetsModal.classList.add("hidden");
      widgetsPrompt.classList.remove("active");
      WeatherModule.instance.openWeatherModal();
    });
    folderCrypto.addEventListener("click", () => {
      widgetsModal.classList.add("hidden");
      widgetsPrompt.classList.remove("active");
      CryptoModule.instance.openCryptoModal();
    });
    folderMinigame.addEventListener("click", () => {
      widgetsModal.classList.add("hidden");
      widgetsPrompt.classList.remove("active");
      const minigameModal = document.getElementById("minigameModal");
      if (minigameModal.classList.contains("hidden")) {
        if (ModalManager.instance.pendingBringToFrontTimeout) {
          clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
          ModalManager.instance.pendingBringToFrontTimeout = null;
        }
        minigameModal.dataset.openedAt = performance.now();
        minigameModal.classList.remove("hidden");
        ModalManager.instance.currentActiveModal = minigameModal;
        ModalManager.instance.bringModalToFront(minigameModal);
        minigameModal.focus();
        setTimeout(() => {
          startDinoGame();
        }, 200);
      } else {
        minigameModal.classList.add("hidden");
        window.dinoGameStarted = false;
      }
    });
    const folderTetris = document.getElementById("folderTetris");
    folderTetris.addEventListener("click", () => {
      widgetsModal.classList.add("hidden");
      widgetsPrompt.classList.remove("active");
      const gameModal = document.getElementById("gameModal");
      if (gameModal.classList.contains("hidden")) {
        gameModal.dataset.openedAt = performance.now();
        gameModal.classList.remove("hidden");
        ModalManager.instance.currentActiveModal = gameModal;
        ModalManager.instance.bringModalToFront(gameModal);
        setTimeout(() => {
          startTetrisGame();
        }, 200);
      } else {
        gameModal.classList.add("hidden");
      }
    });
  }
}

class WeatherModule {
  init() {
    const weatherModal = document.getElementById("weatherModal");
    const weatherClose = document.getElementById("weatherClose");
    weatherClose.addEventListener("click", () => {
      weatherModal.classList.add("hidden");
    });
    weatherModal.addEventListener("pointerdown", e => {
      if (ModalManager.instance.pendingBringToFrontTimeout)
        clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
      ModalManager.instance.pendingBringToFrontTimeout = setTimeout(() => {
        ModalManager.instance.currentActiveModal = weatherModal;
        ModalManager.instance.bringModalToFront(weatherModal);
        ModalManager.instance.pendingBringToFrontTimeout = null;
      }, 50);
    }, true);
    Draggable.makeElementDraggable(weatherModal);
  }
  openWeatherModal() {
    const weatherModal = document.getElementById("weatherModal");
    const weatherContent = document.getElementById("weatherContent");
    if (ModalManager.instance.pendingBringToFrontTimeout) {
      clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
      ModalManager.instance.pendingBringToFrontTimeout = null;
    }
    weatherModal.dataset.openedAt = performance.now();
    weatherModal.classList.remove("hidden");
    ModalManager.instance.currentActiveModal = weatherModal;
    ModalManager.instance.bringModalToFront(weatherModal);
    weatherContent.innerHTML = "<p>Loading weather data...</p>";
    fetch("https://ipapi.co/json/")
      .then(response => {
        if (!response.ok) throw new Error("IP API response not ok");
        return response.json();
      })
      .then(ipData => {
        const lat = ipData.latitude;
        const lon = ipData.longitude;
        const city = ipData.city || "your area";
        return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
          .then(response => {
            if (!response.ok) throw new Error("Weather API response not ok");
            return response.json();
          })
          .then(weatherData => {
            const current = weatherData.current_weather;
            if (current) {
              const temperature = current.temperature;
              const windspeed = current.windspeed;
              const time = current.time;
              const contentHtml = `
                <p>Location: ${city}</p>
                <p>Temperature: ${temperature}&deg;C</p>
                <p>Wind Speed: ${windspeed} km/h</p>
                <p>Time: ${time}</p>
              `;
              weatherContent.innerHTML = contentHtml;
            } else {
              weatherContent.innerHTML = "<p>Weather data not available.</p>";
            }
          });
      })
      .catch(error => {
        console.error("Error fetching weather data:", error);
        weatherContent.innerHTML = `<p>Error fetching weather data: ${error.message}</p>`;
      });
  }
}
// Create a singleton instance for WeatherModule
WeatherModule.instance = new WeatherModule();
// Similarly, create a singleton instance for CryptoModule
CryptoModule.instance = new CryptoModule();

//////////////////////////
// --- Dino (Minigame) Game Logic ---
window.startDinoGame = function() {
  if (window.dinoGameStarted) return;
  window.dinoGameStarted = true;
  initMiniDinoGame();
  
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
      obstacles.forEach(obs => obs.x -= 2);
      obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
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
      minigameModal.addEventListener("keydown", e => {
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
};

// --- Tetris Game Logic ---
window.startTetrisGameOriginal = function() {
  const canvas = document.getElementById("tetrisCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("gameOverOverlay");

  const COLS = 10, ROWS = 20, BLOCK_SIZE = 30;
  const COLORS = [
    '#000000', // 0: empty
    '#00ffff', // 1: I piece (cyan)
    '#0000ff', // 2: J piece (blue)
    '#ffa500', // 3: L piece (orange)
    '#ffff00', // 4: O piece (yellow)
    '#00ff00', // 5: S piece (green)
    '#800080', // 6: T piece (purple)
    '#ff0000'  // 7: Z piece (red)
  ];

  const TETROMINOES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ]
    ],
    J: [
      [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
      ],
      [
        [0, 2, 2],
        [0, 2, 0],
        [0, 2, 0]
      ],
      [
        [0, 0, 0],
        [2, 2, 2],
        [0, 0, 2]
      ],
      [
        [0, 2, 0],
        [0, 2, 0],
        [2, 2, 0]
      ]
    ],
    L: [
      [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
      ],
      [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3]
      ],
      [
        [0, 0, 0],
        [3, 3, 3],
        [3, 0, 0]
      ],
      [
        [3, 3, 0],
        [0, 3, 0],
        [0, 3, 0]
      ]
    ],
    O: [
      [
        [4, 4],
        [4, 4]
      ]
    ],
    S: [
      [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
      ],
      [
        [0, 5, 0],
        [0, 5, 5],
        [0, 0, 5]
      ]
    ],
    T: [
      [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
      ],
      [
        [0, 6, 0],
        [0, 6, 6],
        [0, 6, 0]
      ],
      [
        [0, 0, 0],
        [6, 6, 6],
        [0, 6, 0]
      ],
      [
        [0, 6, 0],
        [6, 6, 0],
        [0, 6, 0]
      ]
    ],
    Z: [
      [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
      ],
      [
        [0, 0, 7],
        [0, 7, 7],
        [0, 7, 0]
      ]
    ]
  };

  const tetrominoNames = Object.keys(TETROMINOES);

  let board = [];
  function initBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = 0;
      }
    }
  }
  initBoard();

  let currentType = '';
  let currentMatrix = null;
  let currentRotation = 0;
  let currentX = 0;
  let currentY = 0;
  let dropInterval = 1000;
  let dropCounter = 0;
  let lastTime = 0;
  let gameOver = false;
  
  let score = 0;
  let highScore = 0;
  function updateScoreBoard() {
    document.getElementById("score").innerText = score;
    document.getElementById("highScore").innerText = highScore;
  }

  function newPiece() {
    currentType = tetrominoNames[Math.floor(Math.random() * tetrominoNames.length)];
    const rotations = TETROMINOES[currentType];
    currentRotation = 0;
    currentMatrix = rotations[currentRotation];
    currentX = Math.floor((COLS - currentMatrix[0].length) / 2);
    currentY = 0;
    if (collide(board, currentMatrix, currentX, currentY)) {
      gameOver = true;
      overlay.classList.remove("hidden");
    }
  }

  function collide(board, matrix, x, y) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          let newX = x + c;
          let newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && board[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  }

  function merge(board, matrix, x, y) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          if (y + r >= 0) {
            board[y + r][x + c] = matrix[r][c];
          }
        }
      }
    }
  }

  function sweep() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        linesCleared++;
        r++;
      }
    }
    if (linesCleared > 0) {
      score += linesCleared * 10;
      if (score > highScore) highScore = score;
      updateScoreBoard();
    }
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== 0) {
          ctx.fillStyle = COLORS[board[r][c]];
          ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        } else {
          ctx.strokeStyle = "#222";
          ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }
    if (currentMatrix) {
      for (let r = 0; r < currentMatrix.length; r++) {
        for (let c = 0; c < currentMatrix[r].length; c++) {
          if (currentMatrix[r][c] !== 0) {
            ctx.fillStyle = COLORS[currentMatrix[r][c]];
            ctx.fillRect((currentX + c) * BLOCK_SIZE, (currentY + r) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        }
      }
    }
  }

  function update(deltaTime) {
    if (gameOver) return;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      dropPiece();
      dropCounter = 0;
    }
  }

  function dropPiece() {
    currentY++;
    if (collide(board, currentMatrix, currentX, currentY)) {
      currentY--;
      merge(board, currentMatrix, currentX, currentY);
      sweep();
      newPiece();
    }
  }

  function loop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    if (!gameOver) {
      requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(e) {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.code)) {
      e.preventDefault();
    }
  
    if (gameOver) {
      if (e.code === "Space") {
        restartGame();
      }
      return;
    }
    switch (e.code) {
      case "ArrowLeft":
        currentX--;
        if (collide(board, currentMatrix, currentX, currentY)) {
          currentX++;
        }
        break;
      case "ArrowRight":
        currentX++;
        if (collide(board, currentMatrix, currentX, currentY)) {
          currentX--;
        }
        break;
      case "ArrowDown":
        dropPiece();
        dropCounter = 0;
        break;
      case "ArrowUp":
        const rotations = TETROMINOES[currentType];
        const oldRotation = currentRotation;
        const oldMatrix = currentMatrix;
        currentRotation = (currentRotation + 1) % rotations.length;
        currentMatrix = rotations[currentRotation];
        if (collide(board, currentMatrix, currentX, currentY)) {
          if (!collide(board, currentMatrix, currentX - 1, currentY)) {
            currentX--;
          } else if (!collide(board, currentMatrix, currentX + 1, currentY)) {
            currentX++;
          } else {
            currentMatrix = oldMatrix;
            currentRotation = oldRotation;
          }
        }
        break;
    }
  }
  
  function restartGame() {
    initBoard();
    gameOver = false;
    dropCounter = 0;
    lastTime = 0;
    score = 0;
    updateScoreBoard();
    overlay.classList.add("hidden");
    newPiece();
    window.removeEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(loop);
  }
  
  newPiece();
  window.addEventListener("keydown", handleKeyDown);
  requestAnimationFrame(loop);
};

window.startTetrisGame = function() {
  if (typeof window.startTetrisGameOriginal === "function") {
    window.startTetrisGameOriginal();
  } else {
    console.warn("Tetris game function is not defined.");
  }
};

class RetroOS {
  constructor() {
    this.themeManager = new ThemeManager();
    this.modalManager = ModalManager.instance;
    this.canvasBackground = new CanvasBackground();
    this.dodecagonCanvas = new DodecagonCanvas();
    this.blogModule = new BlogModule(this.modalManager);
    this.chatboxModule = new ChatboxModule(this.modalManager);
    this.dataModule = new DataModule(this.modalManager);
    this.musicPlayer = new MusicPlayer();
    this.projectModal = new ProjectModal(this.modalManager);
    this.backroomsModule = new BackroomsModule();
    // Crypto, Widgets, Weather modules are singletons or instantiated within their classes.
  }
  init() {
    this.themeManager.init();
    this.canvasBackground.init();
    this.dodecagonCanvas.init();
    const sectionObserver = new SectionObserver();
    sectionObserver.init(this.themeManager, this.canvasBackground);
    this.blogModule.init();
    this.chatboxModule.init("/");
    this.projectModal.init();
    this.backroomsModule.init();
    this.musicPlayer.init();
    this.dataModule.init();
    WeatherModule.instance.init();
    CryptoModule.instance.init();
    const widgetsModule = new WidgetsModule();
    widgetsModule.init();
    // Make game modals draggable
    Draggable.makeElementDraggable(document.getElementById("minigameModal"));
    Draggable.makeElementDraggable(document.getElementById("gameModal"));
    // Event listeners for game close buttons
    document.getElementById("minigameClose").addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("minigameModal").classList.add("hidden");
      window.dinoGameStarted = false;
    });
    document.getElementById("gameModalClose").addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("gameModal").classList.add("hidden");
    });
    document.getElementById("minigameClose").addEventListener("mousedown", e => e.stopPropagation());
    document.getElementById("gameModalClose").addEventListener("mousedown", e => e.stopPropagation());
    document.getElementById("randomizeToggle").addEventListener("click", function () {
      this.classList.add("vibrate");
      setTimeout(() => { this.classList.remove("vibrate"); }, 300);
      RetroOS.instance.themeManager.randomizeTheme();
      RetroOS.instance.themeManager.updateTetrisTheme();
    });
    window.addEventListener("scroll", () => {
      onScrollTypeAscii();
    }, { passive: true });
    const draggableSelectors = [".modal", ".widgets-modal", ".chat-modal", ".draggable-widget-modal"];
    draggableSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(modal => {
        if (modal.id === "retroMusicPlayer") return;
        modal.addEventListener("pointerdown", e => {
          if (ModalManager.instance.pendingBringToFrontTimeout) clearTimeout(ModalManager.instance.pendingBringToFrontTimeout);
          ModalManager.instance.pendingBringToFrontTimeout = setTimeout(() => {
            ModalManager.instance.currentActiveModal = modal;
            ModalManager.instance.bringModalToFront(modal);
            ModalManager.instance.pendingBringToFrontTimeout = null;
          }, 50);
        }, true);
      });
    });
    document.getElementById("retroMusicPlayer").style.zIndex = 99999;
    window.addEventListener("resize", Util.debounce(() => {
      // Additional resize handling if needed.
    }, 100));
    window.addEventListener("load", () => {
      typeWriterOnElement(document.getElementById("terminalHeader"), 50);
    });
    this.typeOtherHeaders();
  }
  typeOtherHeaders() {
    const headers = document.querySelectorAll(".section-header");
    headers.forEach(header => {
      if (header.id !== "terminalHeader") {
        typeWriterOnElement(header, 50);
      }
    });
  }
}
function typeWriterOnElement(element, delay = 0) {
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
function onScrollTypeAscii() {
  const asciiCorner = document.getElementById("asciiCorner");
  if (!asciiCorner) return;
  const asciiFull = asciiCorner.dataset.fullText || "";
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  let ratio = docHeight > 0 ? scrollTop / docHeight : 0;
  const revealCount = Math.floor(asciiFull.length * ratio);
  asciiCorner.textContent = asciiFull.substring(0, revealCount);
}
document.addEventListener("DOMContentLoaded", () => {
  RetroOS.instance = new RetroOS();
  RetroOS.instance.init();
});
