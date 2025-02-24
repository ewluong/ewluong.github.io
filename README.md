# ewluong.com – Official Homepage

This repository contains the source code for [ewluong.com](https://ewluong.com), the official homepage of Eric Luong. The website is a curated portfolio that showcases interactive technology experiments, homemade music, engaging blog posts, creative LLM/AI experiments, data-driven insights, and crypto solutions—all presented with a unique retro OS aesthetic.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Customization](#customization)
- [Performance Optimizations](#performance-optimizations)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Retro Aesthetic:** A vintage computer/OS style with typewriter effects and CRT-inspired visuals.
- **Interactive Background:** Animated canvas background with dynamically moving shapes.
- **Modals and Widgets:** Multiple modal interfaces for blog posts, projects, chat, weather, crypto data, Tetris, and a minigame.
- **Responsive Design:** Fully responsive layout with mobile-specific optimizations.
- **Real-time Data and Animations:** Uses external libraries for Markdown parsing (Marked.js), chart plotting (Chart.js), and dynamic audio visualization.
- **Local Font Optimization:** Uses the locally hosted VT323 font to improve layout stability and performance.

## Technologies

- **HTML5:** For the structure of the website.
- **CSS3:** For styling, responsive design, animations, and retro effects.
- **JavaScript (ES6+):** For interactivity, animations, typewriter effects, modal management, and more.
- **External Libraries:**
  - [Marked.js](https://marked.js.org/) – for Markdown parsing.
  - [Chart.js](https://www.chartjs.org/) – for rendering interactive charts.

## Folder Structure

```
.
├── index.html          # Main HTML file
├── style.css           # CSS styles including font-face declarations and responsive design
├── script.js           # JavaScript for animations, modal interactions, and functionality
├── VT323-Regular.ttf   # Local copy of the VT323 font
├── images/             # Contains images used on the site (e.g., icons, backgrounds)
├── docs/               # Documentation or additional assets (e.g., project PDFs, Markdown files)
└── README.md           # This file
```

## Installation

No build process is required. Simply clone the repository and open `index.html` in your favorite web browser:

```bash
git clone https://github.com/yourusername/ewluong.com.git
cd ewluong.com
```

Then open `index.html` with your browser (or use a local web server if needed).

## Customization

- **Fonts:** The VT323 font is loaded locally via an `@font-face` rule in `style.css`. If you wish to update or replace it, simply swap out the `VT323-Regular.ttf` file and adjust the CSS accordingly.
- **Themes:** The site features multiple themes managed by `ThemeManager` in `script.js`. You can edit or add themes in the themes array.
- **Content:** Modify blog posts, project details, and other content directly in the HTML or through data attributes on the elements.
- **Animations & Effects:** The typewriter effect, canvas background animation, and modal interactions are defined in `script.js`. Adjust the parameters (such as typing speed or canvas shape counts) to fit your needs.

## Performance Optimizations

- **Local Font Loading:** The VT323 font is hosted locally and preloaded to reduce layout shifts.
- **Responsive Enhancements:** Separate strategies are applied on mobile (such as bypassing the typewriter animation to improve Largest Contentful Paint) to optimize performance on different devices.
- **Deferred Animations:** Non-critical animations and scripts are deferred until after the page loads.
