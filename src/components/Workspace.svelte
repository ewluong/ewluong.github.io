<script lang="ts">
  import { onMount } from 'svelte';
  import { bootPhase } from '../stores/system';
  import { windowStore } from '../stores/windows';
  import CanvasBackground from './CanvasBackground.svelte';
  import StatusBar from './StatusBar.svelte';
  import Dock from './Dock.svelte';
  import Window from './Window.svelte';
  import MusicPlayer from './MusicPlayer.svelte';
  import WaveformVisualizer from './WaveformVisualizer.svelte';
  import BlogList from './BlogList.svelte';
  import EssayReader from './EssayReader.svelte';
  import ProjectList from './ProjectList.svelte';
  import ProjectDetail from './ProjectDetail.svelte';
  import Backrooms from './Backrooms.svelte';

  $: visible = $bootPhase === 'ready';

  // --- Content data (passed from Astro at build time via props) ---
  // In the full Astro build, these would come from content collections.
  // For now, we define them inline so the components work.

  const blogEntries = [
    { slug: 'finding-wonder', title: 'Finding Wonder in a World of Logic', date: '2024', tags: ['philosophy', 'technology'] },
    { slug: 'sisyphus', title: 'Why Sisyphus Must Truly Be Happy', date: '2024', tags: ['philosophy', 'gaming'] },
    { slug: 'stakeholder-capitalism', title: 'On Stakeholder Capitalism', date: '2024', tags: ['economics', 'capitalism'] },
    { slug: 'pseudonyms', title: 'On Pseudonyms', date: '2024', tags: ['identity', 'web3'] },
    { slug: 'regression-theory', title: 'On Regression Theory', date: '2024', tags: ['economics', 'cryptocurrency'] },
    { slug: 'quadratic-voting', title: 'On Quadratic Voting and Funding', date: '2024', tags: ['governance', 'blockchain'] },
    { slug: 'dualism', title: 'On Dualism', date: '2024', tags: ['philosophy', 'cognitive-science'] },
  ];

  const projectEntries = [
    { slug: 'model-eval', title: 'Model Evaluation & Comparison Suite', type: 'demo', tech: ['Python', 'Streamlit', 'scikit-learn'], github: 'https://github.com/ewluong/model_eval' },
    { slug: 'orbital-mechanics', title: 'Orbital Mechanics Simulator', type: 'demo', tech: ['JavaScript', 'Three.js', 'Physics'], github: 'https://github.com/ewluong/orbital_mech' },
    { slug: 'cube-game', title: 'Cube.io', type: 'demo', tech: ['JavaScript', 'Three.js'], github: 'https://github.com/ewluong/cube_game' },
    { slug: 'infinite-backrooms', title: 'Infinite Backrooms', type: 'artifact', tech: ['Python', 'LLM'], github: 'https://github.com/ewluong/project2024/tree/main/infinite_backrooms' },
    { slug: 'network-anomaly', title: 'Anomaly Detection in Network Traffic', type: 'paper', tech: ['Python', 'XGBoost', 'Neural Networks'], github: 'https://github.com/ewluong/project2024/tree/main/cybersecurity_threats' },
    { slug: 'best-sellers', title: 'Best Sellers Analysis', type: 'paper', tech: ['Python', 'NLP', 'K-means'], github: 'https://github.com/ewluong/project2024/tree/main/best_sellers_analysis' },
    { slug: 'centrality-measures', title: 'Centrality Measures in Networks', type: 'paper', tech: ['Python', 'Network Analysis'], github: 'https://github.com/ewluong/project2024/tree/main/centrality_measures' },
    { slug: 'housing-prices', title: 'Housing Prices Prediction', type: 'paper', tech: ['Python', 'LightGBM', 'XGBoost'], github: 'https://github.com/ewluong/project2024/tree/main/housing_prices_prediction' },
    { slug: 'panel-data', title: 'Panel Data Analysis', type: 'paper', tech: ['Python', 'Econometrics'], github: 'https://github.com/ewluong/project2024/tree/main/panel_data_analysis' },
    { slug: 'ewluong-site', title: 'ewluong.com', type: 'demo', tech: ['HTML', 'CSS', 'JavaScript'], github: 'https://github.com/ewluong/ewluong.github.io' },
    { slug: 'apexprint', title: 'apexprint.co', type: 'link', tech: ['Web Development'], link: 'https://www.goabcprint.com/' },
    { slug: 'sudoku', title: 'Sudoku Linear Programming', type: 'paper', tech: ['Python', 'Gurobi'] },
    { slug: 'nba-correlation', title: 'CBA-to-NBA Performance Correlation', type: 'paper', tech: ['Python', 'PCA'] },
    { slug: 'amber-india', title: 'Amber India Restaurant Case Study', type: 'paper', tech: ['Linear Programming'] },
  ];

  // Register default windows on mount
  onMount(() => {
    const centerX = (window.innerWidth - 640) / 2;
    const centerY = (window.innerHeight - 500) / 2;

    windowStore.register({
      id: 'writing',
      title: 'Writing',
      module: 'blog-list',
      x: centerX - 50,
      y: centerY - 30,
      width: 640,
      height: 480,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'projects',
      title: 'Projects',
      module: 'project-list',
      x: centerX + 30,
      y: centerY + 10,
      width: 680,
      height: 500,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'music',
      title: 'Music',
      module: 'music-player',
      x: 40,
      y: 60,
      width: 340,
      height: 420,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'visualizer',
      title: 'Waveform',
      module: 'visualizer',
      x: centerX + 100,
      y: 60,
      width: 500,
      height: 300,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'backrooms',
      title: 'Infinite Backrooms',
      module: 'backrooms',
      x: centerX - 100,
      y: 40,
      width: 720,
      height: 540,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'system-info',
      title: 'System Info',
      module: 'system-info',
      x: centerX + 80,
      y: centerY + 40,
      width: 500,
      height: 420,
      isOpen: false,
      isMinimized: false,
    });
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const focused = $windowStore
        .filter(w => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      if (focused) {
        windowStore.close(focused.id);
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <div class="workspace">
    <CanvasBackground />
    <StatusBar />

    {#each $windowStore as win (win.id)}
      <Window {win}>
        <!-- Blog list -->
        {#if win.module === 'blog-list'}
          <BlogList entries={blogEntries} />

        <!-- Individual essay reader -->
        {:else if win.module === 'essay'}
          <EssayReader
            slug={win.data?.slug?.toString() ?? ''}
            title={win.title}
            html="<p>Essay content will be loaded from markdown content collections at build time. This placeholder confirms the reader component and window system are wired correctly.</p><p>In the Astro build pipeline, each essay's rendered HTML is passed as a prop to this component.</p>"
          />

        <!-- Project list -->
        {:else if win.module === 'project-list'}
          <ProjectList entries={projectEntries} />

        <!-- Individual project detail -->
        {:else if win.module === 'project-detail'}
          <ProjectDetail
            title={win.title}
            type={projectEntries.find(p => p.slug === win.data?.slug)?.type ?? 'paper'}
            html="<p>Project detail will be loaded from markdown content collections at build time.</p>"
            tech={projectEntries.find(p => p.slug === win.data?.slug)?.tech ?? []}
            github={projectEntries.find(p => p.slug === win.data?.slug)?.github ?? ''}
            link={projectEntries.find(p => p.slug === win.data?.slug)?.link ?? ''}
            dataFile=""
          />

        <!-- Music player -->
        {:else if win.module === 'music-player'}
          <MusicPlayer />

        <!-- Waveform visualizer -->
        {:else if win.module === 'visualizer'}
          <WaveformVisualizer />

        <!-- Backrooms -->
        {:else if win.module === 'backrooms'}
          <Backrooms />

        <!-- System Info -->
        {:else if win.module === 'system-info'}
          <div class="system-info">
            <p class="module-label">SYSTEM INFO</p>
            <div class="info-block">
              <p><span class="key">system</span> ewluong.os v0.1.0</p>
              <p><span class="key">operator</span> Eric Luong</p>
              <p><span class="key">role</span> Data Scientist</p>
              <p><span class="key">org</span> Vanguard</p>
              <p class="divider">---</p>
              <p><span class="key">education</span> UC Berkeley — Cognitive Science</p>
              <p><span class="key"></span> Santa Clara University — Business Analytics</p>
              <p><span class="key"></span> UC Berkeley — ML & AI Certificate</p>
              <p class="divider">---</p>
              <p><span class="key">reads</span> There Is No Antimemetics Division</p>
              <p><span class="key"></span> Hitchhiker's Guide to the Galaxy</p>
              <p><span class="key"></span> Strangers from a Different Shore</p>
              <p class="divider">---</p>
              <p><span class="key">plays</span> Elden Ring, Path of Exile</p>
              <p><span class="key">makes</span> beats, melodies, code</p>
              <p><span class="key">tennis</span> lifelong player, still training</p>
              <p class="divider">---</p>
              <p><span class="key">garden</span> Berkeley Community Garden volunteer</p>
              <p class="divider">---</p>
              <p><span class="key">links</span>
                <a href="https://github.com/ewluong" target="_blank" rel="noopener noreferrer">github</a>
                <a href="https://linkedin.com/in/ewluong" target="_blank" rel="noopener noreferrer">linkedin</a>
              </p>
              <p class="divider">---</p>
              <p><span class="key">status</span> just chasing the wind...</p>
            </div>
          </div>

        {:else}
          <p style="color: var(--text-dim)">Module not found: {win.module}</p>
        {/if}
      </Window>
    {/each}

    <Dock />
  </div>
{/if}

<style>
  .workspace {
    position: fixed;
    inset: 0;
    overflow: hidden;
  }

  .system-info {
    font-size: var(--text-sm);
  }

  .module-label {
    font-size: 11px;
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-4);
  }

  .info-block {
    line-height: 2;
  }

  .info-block .key {
    color: var(--accent-dim);
    display: inline-block;
    min-width: 100px;
  }

  .info-block a {
    color: var(--accent-dim);
    margin-right: var(--space-3);
    transition: color var(--transition-fast);
  }

  .info-block a:hover {
    color: var(--accent);
  }

  .divider {
    color: var(--border);
    font-size: var(--text-xs);
  }
</style>
