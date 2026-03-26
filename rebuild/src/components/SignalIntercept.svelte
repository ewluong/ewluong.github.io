<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { aggregateSignals, ALL_SOURCES, type Signal, type SourceDef } from '../lib/signalEngine';

  const STORAGE_KEY = 'ewluong-os-signals';
  const CACHE_KEY = 'ewluong-os-signals-cache';
  const REFRESH_MS = 15 * 60 * 1000; // 15 min
  const CACHE_TTL = 10 * 60 * 1000;  // 10 min cache

  interface SignalConfig {
    readIds: string[];
    disabledSources: string[];
  }

  let config: SignalConfig = { readIds: [], disabledSources: [] };
  let signals: Signal[] = [];
  let sources: SourceDef[] = [...ALL_SOURCES];
  let loading = false;
  let error = '';
  let refreshInterval: ReturnType<typeof setInterval>;
  let lastFetch = '';
  let fetchedSources: string[] = [];
  let failedSources: string[] = [];
  let showSettings = false;
  let activeFilter: 'ALL' | 'tech' | 'world' | 'knowledge' = 'ALL';
  let activePriority: 'ALL' | 'CRITICAL' | 'HIGH' | 'MED' | 'LOW' = 'ALL';
  let scanProgress = 0;
  let scanning = false;

  function loadConfig(): SignalConfig {
    if (typeof window === 'undefined') return { readIds: [], disabledSources: [] };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed) return { readIds: parsed.readIds || [], disabledSources: parsed.disabledSources || [] };
      return { readIds: [], disabledSources: [] };
    } catch {
      return { readIds: [], disabledSources: [] };
    }
  }

  function saveConfig() {
    if (typeof window !== 'undefined') {
      config.readIds = config.readIds.slice(-500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }

  function loadCache(): { signals: Signal[]; fetchedSources: string[]; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (!stored) return null;
      const cached = JSON.parse(stored);
      if (Date.now() - cached.timestamp < CACHE_TTL) return cached;
      return null;
    } catch {
      return null;
    }
  }

  function saveCache(sigs: Signal[], fetched: string[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        signals: sigs,
        fetchedSources: fetched,
        timestamp: Date.now(),
      }));
    }
  }

  function priorityColor(p: string): string {
    if (p === 'CRITICAL') return 'var(--accent)';
    if (p === 'HIGH') return 'var(--accent-dim)';
    if (p === 'MED') return 'var(--text-secondary)';
    return 'var(--text-dim)';
  }

  function formatTime(ts: number): string {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffH < 1) {
        const diffM = Math.floor(diffMs / (1000 * 60));
        return `${diffM}m ago`;
      }
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      return `${diffD}d ago`;
    } catch {
      return '--:--';
    }
  }

  function categoryIcon(cat: string): string {
    if (cat === 'tech') return 'T';
    if (cat === 'world') return 'W';
    return 'K';
  }

  async function fetchAll(force = false) {
    if (loading) return; // prevent concurrent fetches

    // Try cache first (unless forced)
    if (!force) {
      const cached = loadCache();
      if (cached) {
        signals = cached.signals;
        fetchedSources = cached.fetchedSources;
        failedSources = [];
        lastFetch = 'CACHED';
        return;
      }
    }

    loading = true;
    scanning = true;
    scanProgress = 0;
    error = '';

    // Simulate scan progress
    const scanInterval = setInterval(() => {
      scanProgress = Math.min(scanProgress + Math.random() * 15, 90);
    }, 200);

    try {
      // Apply disabled sources from config
      const activeSources = sources.map(s => ({
        ...s,
        enabled: !config.disabledSources.includes(s.id),
      }));

      const result = await aggregateSignals(activeSources);
      signals = result.signals;
      fetchedSources = result.fetchedSources;
      failedSources = result.failedSources;
      lastFetch = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      saveCache(signals, fetchedSources);

      if (signals.length === 0 && fetchedSources.length === 0) {
        error = 'UNABLE TO ESTABLISH UPLINK';
      }
    } catch (e) {
      error = 'AGGREGATION FAILURE';
    }

    clearInterval(scanInterval);
    scanProgress = 100;
    setTimeout(() => { scanning = false; }, 300);
    loading = false;
  }

  function markRead(id: string) {
    if (!config.readIds.includes(id)) {
      config.readIds = [...config.readIds, id];
      saveConfig();
    }
  }

  function openLink(signal: Signal) {
    markRead(signal.id);
    window.open(signal.url, '_blank', 'noopener,noreferrer');
  }

  function toggleSource(srcId: string) {
    if (config.disabledSources.includes(srcId)) {
      config.disabledSources = config.disabledSources.filter(id => id !== srcId);
    } else {
      config.disabledSources = [...config.disabledSources, srcId];
    }
    saveConfig();
  }

  function markAllRead() {
    config.readIds = [...config.readIds, ...filteredSignals.map(s => s.id)];
    saveConfig();
  }

  // Reactive filters
  $: filteredSignals = signals
    .filter(s => activeFilter === 'ALL' || s.sourceCategory === activeFilter)
    .filter(s => activePriority === 'ALL' || s.priority === activePriority);

  $: unreadCount = signals.filter(s => !config.readIds.includes(s.id)).length;
  $: criticalCount = signals.filter(s => s.priority === 'CRITICAL').length;
  $: sourceCount = fetchedSources.length;

  // Priority distribution for the header stats
  $: priorityDist = {
    critical: signals.filter(s => s.priority === 'CRITICAL').length,
    high: signals.filter(s => s.priority === 'HIGH').length,
    med: signals.filter(s => s.priority === 'MED').length,
    low: signals.filter(s => s.priority === 'LOW').length,
  };

  onMount(() => {
    config = loadConfig();
    fetchAll();
    refreshInterval = setInterval(() => fetchAll(true), REFRESH_MS);
  });

  onDestroy(() => {
    clearInterval(refreshInterval);
  });
</script>

<div class="signal-intercept">
  <!-- Header -->
  <div class="header-row">
    <span class="module-label">SIGNAL INTERCEPT</span>
    <div class="header-actions">
      {#if unreadCount > 0}
        <span class="unread-badge">{unreadCount} NEW</span>
      {/if}
      <button class="action-btn" on:click={() => fetchAll(true)} disabled={loading}>
        {loading ? 'SCANNING...' : 'SYNC'}
      </button>
      <button class="action-btn" on:click={() => showSettings = !showSettings}>
        {showSettings ? 'CLOSE' : 'CONFIG'}
      </button>
    </div>
  </div>

  <!-- Scan progress bar -->
  {#if scanning}
    <div class="scan-bar">
      <div class="scan-fill" style="width: {scanProgress}%"></div>
      <span class="scan-label">SCANNING {sourceCount > 0 ? sourceCount : '...'} SOURCES</span>
    </div>
  {/if}

  <!-- Status line -->
  <div class="status-line">
    {#if lastFetch}
      <span class="status-item">UPLINK: {lastFetch}</span>
    {/if}
    <span class="status-item">SOURCES: {sourceCount}/{ALL_SOURCES.length}</span>
    {#if failedSources.length > 0}
      <span class="status-item status-warn">LOST: {failedSources.join(', ')}</span>
    {/if}
  </div>

  <!-- Priority distribution bar -->
  {#if signals.length > 0}
    <div class="priority-bar">
      {#if priorityDist.critical > 0}
        <button class="prio-segment critical" style="flex: {priorityDist.critical}" on:click={() => activePriority = activePriority === 'CRITICAL' ? 'ALL' : 'CRITICAL'} title="{priorityDist.critical} CRITICAL">
          {priorityDist.critical}
        </button>
      {/if}
      {#if priorityDist.high > 0}
        <button class="prio-segment high" style="flex: {priorityDist.high}" on:click={() => activePriority = activePriority === 'HIGH' ? 'ALL' : 'HIGH'} title="{priorityDist.high} HIGH">
          {priorityDist.high}
        </button>
      {/if}
      {#if priorityDist.med > 0}
        <button class="prio-segment med" style="flex: {priorityDist.med}" on:click={() => activePriority = activePriority === 'MED' ? 'ALL' : 'MED'} title="{priorityDist.med} MED">
          {priorityDist.med}
        </button>
      {/if}
      {#if priorityDist.low > 0}
        <button class="prio-segment low" style="flex: {priorityDist.low}" on:click={() => activePriority = activePriority === 'LOW' ? 'ALL' : 'LOW'} title="{priorityDist.low} LOW">
          {priorityDist.low}
        </button>
      {/if}
    </div>
  {/if}

  <!-- Category filters -->
  <div class="filter-bar">
    <button class="filter-btn" class:active={activeFilter === 'ALL'} on:click={() => activeFilter = 'ALL'}>
      ALL
    </button>
    <button class="filter-btn" class:active={activeFilter === 'tech'} on:click={() => activeFilter = activeFilter === 'tech' ? 'ALL' : 'tech'}>
      TECH
    </button>
    <button class="filter-btn" class:active={activeFilter === 'world'} on:click={() => activeFilter = activeFilter === 'world' ? 'ALL' : 'world'}>
      WORLD
    </button>
    <button class="filter-btn" class:active={activeFilter === 'knowledge'} on:click={() => activeFilter = activeFilter === 'knowledge' ? 'ALL' : 'knowledge'}>
      KNOWLEDGE
    </button>
    <div class="filter-spacer"></div>
    {#if activePriority !== 'ALL'}
      <button class="filter-btn active" on:click={() => activePriority = 'ALL'}>
        {activePriority} ×
      </button>
    {/if}
    {#if unreadCount > 0}
      <button class="filter-btn mark-read-btn" on:click={markAllRead}>
        MARK ALL READ
      </button>
    {/if}
  </div>

  <!-- Settings panel -->
  {#if showSettings}
    <div class="settings-panel">
      <div class="settings-header">SIGNAL SOURCES</div>
      <div class="source-grid">
        {#each ALL_SOURCES as src}
          {@const disabled = config.disabledSources.includes(src.id)}
          <button
            class="source-toggle"
            class:disabled
            on:click={() => toggleSource(src.id)}
          >
            <span class="source-cat">[{categoryIcon(src.category)}]</span>
            <span class="source-name">{src.label}</span>
            <span class="source-weight">×{src.weight.toFixed(1)}</span>
            <span class="source-status">{disabled ? 'OFF' : 'ON'}</span>
          </button>
        {/each}
      </div>
      <div class="settings-footer">
        <span class="settings-note">WEIGHT: source authority multiplier for ranking algorithm</span>
        <button class="action-btn" on:click={() => { showSettings = false; fetchAll(true); }}>
          APPLY & RESCAN
        </button>
      </div>
    </div>
  {/if}

  <!-- Error state -->
  {#if error}
    <div class="error-state">[SIGNAL LOST] {error}</div>
  {/if}

  <!-- Signal list -->
  <div class="intercepts">
    {#each filteredSignals as signal, i}
      {@const num = String(i + 1).padStart(3, '0')}
      {@const isRead = config.readIds.includes(signal.id)}
      <button class="intercept-row" class:read={isRead} class:critical={signal.priority === 'CRITICAL'} on:click={() => openLink(signal)}>
        <div class="intercept-header">
          <span class="intercept-code">[{num}]</span>
          <span class="priority-tag" style="color: {priorityColor(signal.priority)}">{signal.priority}</span>
          <span class="intercept-title">{signal.title}</span>
        </div>
        <div class="intercept-meta">
          <span class="meta-time">{formatTime(signal.publishedAt)}</span>
          <span class="meta-source">{signal.primarySource}</span>
          {#if signal.crossSourceCount > 1}
            <span class="meta-cross" title="Detected across: {signal.allSources.join(', ')}">
              ×{signal.crossSourceCount} SOURCES
            </span>
          {/if}
          {#if signal.commentCount > 0}
            <span class="meta-comments">{signal.commentCount} COMMENTS</span>
          {/if}
          <span class="meta-cat">[{categoryIcon(signal.sourceCategory)}]</span>
          <span class="meta-status">{isRead ? 'READ' : 'UNREAD'}</span>
        </div>
      </button>
    {/each}
    {#if filteredSignals.length === 0 && !loading && !error}
      <div class="empty-state">NO SIGNALS DETECTED</div>
    {/if}
  </div>

  <!-- Footer stats -->
  {#if signals.length > 0}
    <div class="footer-stats">
      <span>{signals.length} SIGNALS AGGREGATED</span>
      <span>•</span>
      <span>{criticalCount} CRITICAL</span>
      <span>•</span>
      <span>{sourceCount} SOURCES ONLINE</span>
    </div>
  {/if}
</div>

<style>
  .signal-intercept {
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    animation: flicker 6s linear infinite;
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .unread-badge {
    font-size: 12px;
    color: var(--accent);
    letter-spacing: 0.08em;
    padding: 1px var(--space-2);
    border: 1px solid var(--accent-dim);
    animation: glowPulse 2s ease-in-out infinite;
  }

  .action-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .action-btn:disabled {
    opacity: 0.5;
  }

  /* Scan progress bar */
  .scan-bar {
    position: relative;
    height: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    margin-bottom: var(--space-2);
    overflow: hidden;
  }

  .scan-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--accent-dim), transparent);
    transition: width 0.2s ease;
    opacity: 0.3;
  }

  .scan-label {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    line-height: 16px;
    color: var(--accent-dim);
    letter-spacing: 0.1em;
  }

  /* Status line */
  .status-line {
    display: flex;
    gap: var(--space-3);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    margin-bottom: var(--space-2);
    flex-wrap: wrap;
  }

  .status-warn {
    color: var(--accent-dim);
  }

  /* Priority distribution bar */
  .priority-bar {
    display: flex;
    height: 4px;
    gap: 1px;
    margin-bottom: var(--space-3);
  }

  .prio-segment {
    min-width: 8px;
    height: 100%;
    font-size: 0;
    padding: 0;
    transition: opacity var(--transition-fast);
    cursor: pointer;
  }

  .prio-segment:hover { opacity: 0.7; }
  .prio-segment.critical { background: var(--accent); }
  .prio-segment.high { background: var(--accent-dim); }
  .prio-segment.med { background: var(--text-secondary); }
  .prio-segment.low { background: var(--text-dim); }

  /* Filter bar */
  .filter-bar {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-spacer {
    flex: 1;
  }

  .filter-btn {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: 2px var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .filter-btn.active {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .filter-btn:hover {
    color: var(--text-secondary);
    border-color: var(--border-active);
  }

  .mark-read-btn {
    color: var(--text-dim);
    border-color: transparent;
    opacity: 0.6;
  }

  .mark-read-btn:hover {
    opacity: 1;
    color: var(--accent-dim);
  }

  /* Settings panel */
  .settings-panel {
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
  }

  .settings-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    margin-bottom: var(--space-3);
  }

  .source-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .source-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    text-align: left;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .source-toggle:hover {
    background: var(--bg-surface-hover);
  }

  .source-toggle.disabled {
    opacity: 0.4;
  }

  .source-cat {
    color: var(--text-dim);
    min-width: 20px;
  }

  .source-name {
    flex: 1;
    letter-spacing: 0.06em;
  }

  .source-weight {
    color: var(--text-dim);
    font-size: 11px;
    min-width: 30px;
  }

  .source-status {
    font-size: 10px;
    letter-spacing: 0.1em;
    min-width: 24px;
    text-align: right;
  }

  .source-toggle:not(.disabled) .source-status {
    color: var(--accent-dim);
  }

  .settings-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border);
  }

  .settings-note {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  /* Intercepts list */
  .intercepts {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
  }

  .intercept-row {
    text-align: left;
    padding: var(--space-2) var(--space-2);
    border-bottom: 1px solid var(--border);
    transition: background var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .intercept-row:hover {
    background: var(--bg-surface-hover);
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.04) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 1.5s linear;
  }

  .intercept-row.read {
    opacity: 0.45;
  }

  .intercept-row.critical {
    border-left: 2px solid var(--accent);
    padding-left: calc(var(--space-2) - 2px);
  }

  .intercept-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .intercept-code {
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .priority-tag {
    font-size: 10px;
    letter-spacing: 0.08em;
    flex-shrink: 0;
    min-width: 52px;
  }

  .intercept-title {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .intercept-row:hover .intercept-title {
    color: var(--text-primary);
  }

  .intercept-meta {
    display: flex;
    gap: var(--space-3);
    font-size: 11px;
    padding-left: calc(32px + var(--space-2));
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .meta-cross {
    color: var(--accent-dim);
    letter-spacing: 0.06em;
  }

  .meta-comments {
    color: var(--text-dim);
  }

  .meta-cat {
    color: var(--text-dim);
  }

  .error-state {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.08em;
    padding: var(--space-4);
    text-align: center;
    border: 1px solid var(--accent-dim);
    margin-bottom: var(--space-3);
    animation: glowPulse 2s ease-in-out infinite;
  }

  .empty-state {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: center;
    padding: var(--space-8);
    letter-spacing: 0.1em;
  }

  /* Footer stats */
  .footer-stats {
    display: flex;
    gap: var(--space-2);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-2) 0;
    border-top: 1px solid var(--border);
    margin-top: auto;
    justify-content: center;
  }
</style>
