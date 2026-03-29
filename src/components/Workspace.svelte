<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { bootPhase } from '../stores/system';
  import { windowStore, focusedWindow } from '../stores/windows';
  import { isPlaying, rmsLevel } from '../stores/audio';
  import { environmentMode, envModifiers } from '../stores/environment';
  import { fetchWeather } from '../lib/weatherService';
  import { initSession, saveSessionState, updateTimeOfDay, temporalModifiers, vectorModifiers, driftModifiers, sealSession, buildSealSummary, updateCoherence, recordModuleVisit, updateLedger } from '../stores/temporal';
  import { settleLiveMarks, resetLiveMarks } from '../stores/palimpsest';
  import { sessionKey } from '../stores/auth';
  import { silenceActive, toggleSilence, exitSilence } from '../stores/silence';
  import { playDriftPulse } from '../lib/uiSounds';
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
  let lastDriftLevel = 0;
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
      forceSize: true,
      x: dockWidth + 6,
      y: 40,
      width: Math.floor((window.innerWidth - dockWidth) / 2),
      height: window.innerHeight - 44,
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

    // Save session state every 30 seconds (skip during morning console)
    sessionInterval = setInterval(() => {
      if (showMorningConsole) return;
      const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
      saveSessionState(openIds, sessionStart);
    }, 30000);

    // Reset live palimpsest marks for new session
    resetLiveMarks();

    // Coherence tracking every second + drift pulse + silence time (skip during morning console)
    coherenceInterval = setInterval(() => {
      if (showMorningConsole) return;
      const fw = $focusedWindow;
      updateCoherence(fw?.module);
      // Only record module visit when module actually changes
      if (fw?.module && fw.module !== lastRecordedModule) {
        lastRecordedModule = fw.module;
        recordModuleVisit(fw.module);
      }

      // Drift pulse: play sub-bass when crossing from level 3 to 4
      const currentDL = $driftModifiers.driftLevel;
      if (currentDL >= 4 && lastDriftLevel < 4) {
        playDriftPulse();
      }
      lastDriftLevel = currentDL;

      // Silence time accumulation — write to ledger
      if ($silenceActive) {
        updateLedger('silenceMs', 1000);
      }
    }, 1000);

    // Defer weather fetch until after morning console (not needed during overlay)
    setTimeout(() => {
      fetchWeather();
      weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000);
    }, 5000);

    // Save session on page unload
    const handleUnload = () => {
      const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
      saveSessionState(openIds, sessionStart);
      settleLiveMarks(Date.now() - sessionStart);
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

  function handleWorkspaceClick(e: MouseEvent) {
    // Click-to-exit silence: only on the workspace background itself
    if ($silenceActive && e.target === e.currentTarget) {
      exitSilence();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Silence toggle: Ctrl+0
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      toggleSilence();
      return;
    }

    // Escape exits silence
    if (e.key === 'Escape' && $silenceActive) {
      exitSilence();
      return;
    }

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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if visible}
  <div
    class="workspace"
    class:silence={$silenceActive}
    style="filter: brightness({combinedBrightness})"
    on:click={handleWorkspaceClick}
  >
    <!-- Lightweight shell: always mounted for structure -->
    <StatusBar />
    <Dock />

    {#if showMorningConsole}
      <MorningConsole
        {blogEntries}
        onDismiss={() => { showMorningConsole = false; }}
      />
    {:else}
      <!-- Heavy components: mount AFTER morning console dismisses -->
      <CanvasBackground />
      <AmbientLayer />
      <AmbientText
        essayTitles={blogEntries.map(e => e.title)}
        projectTitles={projectEntries.map(e => e.title)}
      />

      {#each $windowStore as win (win.id)}
        <Window {win}>
          {#if win.module === 'blog-list'}
            <BlogList entries={blogEntries} />
          {:else if win.module === 'essay'}
            <EssayReader
              slug={win.data?.slug?.toString() ?? ''}
              title={win.title}
            />
          {:else if win.module === 'project-list'}
            <ProjectList entries={projectEntries} />
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
          {:else if win.module === 'music-player'}
            <MusicPlayer />
          {:else if win.module === 'backrooms-detail'}
            <Backrooms />
          {:else if win.module === 'system-info'}
            <SystemInfo />
          {:else if win.module === 'quick-links'}
            <QuickLinks />
          {:else if win.module === 'crypto-ticker'}
            <CryptoTicker />
          {:else if win.module === 'daily-log'}
            <DailyLog />
          {:else if win.module === 'life-counters'}
            <LifeCounters />
          {:else if win.module === 'chat'}
            <ChatWindow />
          {:else if win.module === 'habit-tracker'}
            <HabitTracker />
          {:else if win.module === 'tarot'}
            <TarotOracle />
          {:else if win.module === 'signal-intercept'}
            <SignalIntercept />
          {:else if win.module === 'login'}
            <LoginPanel />
          {:else}
            <p style="color: var(--text-dim)">Module not found: {win.module}</p>
          {/if}
        </Window>
      {/each}

      <AmbientNudge scratchpadVisible={scratchpadVisible} />
      <Scratchpad bind:visible={scratchpadVisible} />
      <CommandPalette
        visible={paletteVisible}
        on:close={() => paletteVisible = false}
        onSeal={() => {
          const openIds = $windowStore.filter(w => w.isOpen && !w.isMinimized).map(w => w.id);
          saveSessionState(openIds, sessionStart);
          const summary = buildSealSummary(sessionStart);
          if (summary.sessionMs < 300000) {
            sealSession(sessionStart);
          } else {
            sealSummary = summary;
          }
        }}
        onStatus={() => { showMorningConsole = true; }}
        onReorient={() => { /* drift already reset by CommandPalette */ }}
        onSilence={() => { toggleSilence(); }}
      />
      {#if sealSummary}
        <EveningConsole summary={sealSummary} onDismiss={() => { sealSummary = null; }} sessionKey={$sessionKey} />
      {/if}
      <Screensaver />
    {/if}
  </div>
{/if}

<style>
  .workspace {
    position: fixed;
    inset: 0;
    overflow: hidden;
    transition: filter var(--transition-slow) var(--ease-out);
  }

  /* During silence: ghost all windows */
  .workspace.silence :global(.window) {
    opacity: 0.04 !important;
    pointer-events: none !important;
    transition: opacity 3s var(--ease-out) !important;
  }
</style>
