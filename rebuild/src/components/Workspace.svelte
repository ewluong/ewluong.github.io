<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { bootPhase } from '../stores/system';
  import { windowStore, focusedWindow } from '../stores/windows';
  import { isPlaying, rmsLevel } from '../stores/audio';
  import { environmentMode, envModifiers } from '../stores/environment';
  import { fetchWeather } from '../lib/weatherService';
  import { initSession, saveSessionState, updateTimeOfDay, temporalModifiers, vectorModifiers, driftModifiers, sealSession, buildSealSummary, updateCoherence, recordModuleVisit } from '../stores/temporal';
  import type { SealSummary } from '../stores/temporal';
  import CanvasBackground from './CanvasBackground.svelte';
  import AmbientLayer from './AmbientLayer.svelte';
  import AmbientText from './AmbientText.svelte';
  import MorningConsole from './MorningConsole.svelte';
  import StatusBar from './StatusBar.svelte';
  import Dock from './Dock.svelte';
  import Window from './Window.svelte';
  import MusicPlayer from './MusicPlayer.svelte';
  import BlogList from './BlogList.svelte';
  import EssayReader from './EssayReader.svelte';
  import ProjectList from './ProjectList.svelte';
  import ProjectDetail from './ProjectDetail.svelte';
  import Backrooms from './Backrooms.svelte';
  import SystemInfo from './SystemInfo.svelte';
  import QuickLinks from './QuickLinks.svelte';
  import CryptoTicker from './CryptoTicker.svelte';
  import DailyLog from './DailyLog.svelte';
  import LifeCounters from './LifeCounters.svelte';
  import ChatWindow from './ChatWindow.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import Scratchpad from './Scratchpad.svelte';
  import HabitTracker from './HabitTracker.svelte';
  import TarotOracle from './TarotOracle.svelte';
  import SignalIntercept from './SignalIntercept.svelte';
  import LoginPanel from './LoginPanel.svelte';
  import AmbientNudge from './AmbientNudge.svelte';
  import EveningConsole from './EveningConsole.svelte';
  import Screensaver from './Screensaver.svelte';

  /** Blog entries passed from Astro at build time */
  export let blogEntries: Array<{
    slug: string;
    title: string;
    date: string;
    tags: string[];
  }> = [];

  /** Project entries passed from Astro at build time */
  export let projectEntries: Array<{
    slug: string;
    title: string;
    type: string;
    tech: string[];
    github: string;
    link: string;
    dataFile: string;
  }> = [];

  let paletteVisible = false;
  let scratchpadVisible = false;
  let showMorningConsole = true;
  let sealSummary: SealSummary | null = null;
  let sessionStart = Date.now();
  let lastRecordedModule = '';
  let lastEnvMode = '';
  let weatherInterval: ReturnType<typeof setInterval>;
  let timeInterval: ReturnType<typeof setInterval>;
  let sessionInterval: ReturnType<typeof setInterval>;
  let coherenceInterval: ReturnType<typeof setInterval>;

  $: visible = $bootPhase === 'ready';

  // Environmental influence: set mode based on focused window (only update when mode actually changes)
  $: {
    const focused = $focusedWindow;
    let newMode: 'default' | 'focus' | 'music' = 'default';
    if (focused?.module === 'essay') newMode = 'focus';
    else if ($isPlaying && focused?.module === 'music-player') newMode = 'music';
    if (newMode !== lastEnvMode) {
      lastEnvMode = newMode;
      environmentMode.set(newMode);
    }
  }

  // Apply scanline + noise intensity from environment + audio
  $: if (typeof document !== 'undefined') {
    const baseScanline = $envModifiers.scanlineIntensity;
    const rmsBoost = $isPlaying ? $rmsLevel * 0.03 : 0;
    document.documentElement.style.setProperty('--scanline-opacity', String(baseScanline + rmsBoost));
    document.documentElement.style.setProperty('--noise-opacity', String(0.025 + rmsBoost * 0.5));
  }

  // Temporal brightness modulation (combines environment + time-of-day + vector + drift)
  $: combinedBrightness = $envModifiers.brightness * $temporalModifiers.brightness * $vectorModifiers.canvasBrightness * (1 - $driftModifiers.brightnessReduction);

  // Register default windows on mount
  onMount(() => {
    const dockWidth = 184;
    const centerX = dockWidth + (window.innerWidth - dockWidth - 640) / 2;
    const centerY = (window.innerHeight - 500) / 2;

    windowStore.register({
      id: 'login',
      title: 'Access Terminal',
      module: 'login',
      designation: 'AUTH.000',
      x: centerX - 30,
      y: centerY - 40,
      width: 460,
      height: 500,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'writing',
      title: 'Writing',
      module: 'blog-list',
      designation: 'PROC.001',
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
      designation: 'PROC.002',
      x: centerX + 30,
      y: centerY + 10,
      width: 680,
      height: 500,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'music',
      title: 'Audio System',
      module: 'music-player',
      designation: 'SVC.001',
      x: dockWidth + 20,
      y: 50,
      width: 440,
      height: 580,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'system-info',
      title: 'System Info',
      module: 'system-info',
      designation: 'SYS.000',
      x: centerX + 80,
      y: centerY + 40,
      width: 500,
      height: 420,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'quick-links',
      title: 'Reference Web',
      module: 'quick-links',
      designation: 'REF.001',
      x: dockWidth + 40,
      y: 80,
      width: 520,
      height: 440,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'crypto',
      title: 'Resource Monitoring',
      module: 'crypto-ticker',
      designation: 'RSC.001',
      x: centerX - 40,
      y: centerY - 60,
      width: 680,
      height: 560,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'daily-log',
      title: 'Operator Log',
      module: 'daily-log',
      designation: 'LOG.001',
      x: centerX - 80,
      y: centerY + 20,
      width: 560,
      height: 480,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'life-counters',
      title: 'Runtime Statistics',
      module: 'life-counters',
      designation: 'RUN.001',
      x: dockWidth + 60,
      y: centerY - 40,
      width: 480,
      height: 460,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'chat',
      title: 'MAGI Interface',
      module: 'chat',
      designation: 'AI.001',
      x: centerX - 20,
      y: centerY - 30,
      width: 540,
      height: 560,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'habits',
      title: 'System Diagnostics',
      module: 'habit-tracker',
      designation: 'DIAG.001',
      x: centerX + 40,
      y: centerY - 20,
      width: 520,
      height: 480,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'tarot',
      title: 'Daily Word',
      module: 'tarot',
      designation: 'ORC.001',
      x: centerX - 60,
      y: centerY - 10,
      width: 400,
      height: 560,
      isOpen: false,
      isMinimized: false,
    });

    windowStore.register({
      id: 'signals',
      title: 'Signal Intercept',
      module: 'signal-intercept',
      designation: 'INT.001',
      x: centerX + 20,
      y: centerY + 30,
      width: 620,
      height: 520,
      isOpen: false,
      isMinimized: false,
    });

    // Initialize temporal awareness
    initSession();
    sessionStart = Date.now();
    updateTimeOfDay();
    timeInterval = setInterval(updateTimeOfDay, 60000); // check every minute

    // Save session state every 30 seconds
    sessionInterval = setInterval(() => {
      const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
      saveSessionState(openIds, sessionStart);
    }, 30000);

    // Coherence tracking every second
    coherenceInterval = setInterval(() => {
      const fw = $focusedWindow;
      updateCoherence(fw?.module);
      // Only record module visit when module actually changes
      if (fw?.module && fw.module !== lastRecordedModule) {
        lastRecordedModule = fw.module;
        recordModuleVisit(fw.module);
      }
    }, 1000);

    // Initialize weather fetch + 30-min refresh
    fetchWeather();
    weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);

    // Save session on page unload
    const handleUnload = () => {
      const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
      saveSessionState(openIds, sessionStart);
    };
    window.addEventListener('beforeunload', handleUnload);

    // Session seal on tab blur — quiet closing acknowledgment
    const handleVisibility = () => {
      if (document.hidden) {
        const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
        saveSessionState(openIds, sessionStart);
        sealSession(sessionStart);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  });

  onDestroy(() => {
    clearInterval(weatherInterval);
    clearInterval(timeInterval);
    clearInterval(sessionInterval);
    clearInterval(coherenceInterval);
  });

  function handleKeydown(e: KeyboardEvent) {
    // Command palette: / key (when not typing in an input)
    if (e.key === '/' && !paletteVisible) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        paletteVisible = true;
        return;
      }
    }

    // Also support Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      paletteVisible = !paletteVisible;
      return;
    }

    // Scratchpad: backtick key or Ctrl+Shift+N
    if (e.key === '`' && !scratchpadVisible) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        scratchpadVisible = true;
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      scratchpadVisible = !scratchpadVisible;
      return;
    }

    if (e.key === 'Escape') {
      if (paletteVisible) {
        paletteVisible = false;
        return;
      }
      if (scratchpadVisible) {
        scratchpadVisible = false;
        return;
      }
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
  <div class="workspace" style="filter: brightness({combinedBrightness})">
    <CanvasBackground />
    <AmbientLayer />
    <AmbientText
      essayTitles={blogEntries.map(e => e.title)}
      projectTitles={projectEntries.map(e => e.title)}
    />
    <StatusBar />

    {#if showMorningConsole}
      <MorningConsole
        {blogEntries}
        onDismiss={() => { showMorningConsole = false; }}
      />
    {/if}

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
          />

        <!-- Project list -->
        {:else if win.module === 'project-list'}
          <ProjectList entries={projectEntries} />

        <!-- Individual project detail -->
        {:else if win.module === 'project-detail'}
          {@const proj = projectEntries.find(p => p.slug === win.data?.slug)}
          <ProjectDetail
            slug={win.data?.slug?.toString() ?? ''}
            title={win.title}
            type={proj?.type ?? 'paper'}
            tech={proj?.tech ?? []}
            github={proj?.github ?? ''}
            link={proj?.link ?? ''}
            dataFile={proj?.dataFile ?? ''}
          />

        <!-- Music player -->
        {:else if win.module === 'music-player'}
          <MusicPlayer />

        <!-- Backrooms (opened from Projects) -->
        {:else if win.module === 'backrooms-detail'}
          <Backrooms />

        <!-- System Info -->
        {:else if win.module === 'system-info'}
          <SystemInfo />

        <!-- Quick Links -->
        {:else if win.module === 'quick-links'}
          <QuickLinks />

        <!-- Crypto Ticker -->
        {:else if win.module === 'crypto-ticker'}
          <CryptoTicker />

        <!-- Daily Log -->
        {:else if win.module === 'daily-log'}
          <DailyLog />

        <!-- Life Counters -->
        {:else if win.module === 'life-counters'}
          <LifeCounters />

        <!-- MAGI Chat -->
        {:else if win.module === 'chat'}
          <ChatWindow />

        <!-- Habit Tracker -->
        {:else if win.module === 'habit-tracker'}
          <HabitTracker />

        <!-- Daily Word -->
        {:else if win.module === 'tarot'}
          <TarotOracle />

        <!-- Signal Intercept -->
        {:else if win.module === 'signal-intercept'}
          <SignalIntercept />

        <!-- Login / Access Terminal -->
        {:else if win.module === 'login'}
          <LoginPanel />

        {:else}
          <p style="color: var(--text-dim)">Module not found: {win.module}</p>
        {/if}
      </Window>
    {/each}

    <Dock />
    <AmbientNudge scratchpadVisible={scratchpadVisible} />
    <Scratchpad bind:visible={scratchpadVisible} />
    <CommandPalette
      visible={paletteVisible}
      on:close={() => paletteVisible = false}
      onSeal={() => {
        const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
        saveSessionState(openIds, sessionStart);
        const summary = buildSealSummary(sessionStart);
        // Short sessions (<5min) get the quick status bar seal; longer ones get the evening console
        if (summary.sessionMs < 300000) {
          sealSession(sessionStart);
        } else {
          sealSummary = summary;
        }
      }}
      onStatus={() => { showMorningConsole = true; }}
      onReorient={() => { /* drift already reset by CommandPalette */ }}
    />
    {#if sealSummary}
      <EveningConsole summary={sealSummary} onDismiss={() => { sealSummary = null; }} />
    {/if}
    <Screensaver />
  </div>
{/if}

<style>
  .workspace {
    position: fixed;
    inset: 0;
    overflow: hidden;
    transition: filter var(--transition-slow) var(--ease-out);
  }
</style>
