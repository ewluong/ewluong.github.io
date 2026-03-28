<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { bootTime, systemStats } from '../stores/system';

  let uptime = '00h 00m';
  let uptimeInterval: ReturnType<typeof setInterval>;
  let bootTimeFormatted = '';

  function updateUptime() {
    const btVal = get(bootTime);

    if (btVal > 0) {
      const elapsed = Math.floor((Date.now() - btVal) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      uptime = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;

      if (!bootTimeFormatted) {
        const d = new Date(btVal);
        bootTimeFormatted = `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} ${d.toTimeString().slice(0, 8)}`;
      }
    }
  }

  onMount(() => {
    updateUptime();
    uptimeInterval = setInterval(updateUptime, 1000);
  });

  onDestroy(() => {
    clearInterval(uptimeInterval);
  });
</script>

<div class="system-panel">
  <!-- System Metrics -->
  <div class="section-header">RUNTIME METRICS</div>
  <div class="metrics">
    <div class="metric-row">
      <span class="metric-key">BOOT TIME</span>
      <span class="metric-val">{bootTimeFormatted || '—'}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">UPTIME</span>
      <span class="metric-val">{uptime}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">WINDOWS OPENED</span>
      <span class="metric-val">{$systemStats.windowsOpened}</span>
    </div>
    <div class="metric-row">
      <span class="metric-key">TRACKS PLAYED</span>
      <span class="metric-val">{$systemStats.tracksPlayed}</span>
    </div>
  </div>

  <!-- Operator Dossier -->
  <div class="section-header">OPERATOR DOSSIER</div>
  <div class="dossier">
    <div class="dossier-row"><span class="d-key">DESIGNATION</span> Eric Luong</div>
    <div class="dossier-row"><span class="d-key">CLASSIFICATION</span> Data Scientist</div>
    <div class="dossier-row"><span class="d-key">CLEARANCE</span> Level 3</div>
    <div class="dossier-row"><span class="d-key">AFFILIATION</span> Vanguard</div>
    <div class="dossier-divider"></div>
    <div class="dossier-row"><span class="d-key">EDUCATION</span> UC Berkeley — Cognitive Science</div>
    <div class="dossier-row"><span class="d-key"></span> Santa Clara University — Business Analytics</div>
    <div class="dossier-row"><span class="d-key"></span> UC Berkeley — ML & AI Certificate</div>
    <div class="dossier-divider"></div>
    <div class="dossier-row"><span class="d-key">READS</span> There Is No Antimemetics Division</div>
    <div class="dossier-row"><span class="d-key"></span> Hitchhiker's Guide to the Galaxy</div>
    <div class="dossier-row"><span class="d-key"></span> Strangers from a Different Shore</div>
    <div class="dossier-divider"></div>
    <div class="dossier-row"><span class="d-key">PLAYS</span> Elden Ring, Path of Exile</div>
    <div class="dossier-row"><span class="d-key">MAKES</span> beats, melodies, code</div>
    <div class="dossier-row"><span class="d-key">TENNIS</span> lifelong player, still training</div>
    <div class="dossier-divider"></div>
    <div class="dossier-row">
      <span class="d-key">LINKS</span>
      <a href="https://github.com/ewluong" target="_blank" rel="noopener noreferrer">github</a>
      <a href="https://linkedin.com/in/ewluong" target="_blank" rel="noopener noreferrer">linkedin</a>
    </div>
    <div class="dossier-divider"></div>
    <div class="dossier-row status-line"><span class="d-key">STATUS</span> just chasing the wind...</div>
  </div>
</div>

<style>
  .system-panel {
    font-size: var(--text-sm);
  }

  .section-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .section-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 1px;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  /* Metrics */
  .metrics {
    margin-bottom: var(--space-6);
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) var(--space-1);
    font-size: var(--text-xs);
    transition: background var(--transition-fast);
  }

  .metric-row:hover {
    background: var(--bg-surface-hover);
  }

  .metric-row:hover .metric-val {
    color: var(--accent);
  }

  .metric-key {
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  .metric-val {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* Dossier */
  .dossier {
    line-height: 1.9;
  }

  .dossier-row {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    transition: background var(--transition-fast), padding-left var(--transition-fast);
  }

  .dossier-row:hover {
    background: var(--bg-surface-hover);
    padding-left: var(--space-2);
  }

  .d-key {
    color: var(--accent-dim);
    display: inline-block;
    min-width: 110px;
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
  }

  .dossier-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-1) 0;
  }

  .dossier a {
    color: var(--accent-dim);
    margin-right: var(--space-3);
    transition: color var(--transition-fast);
  }

  .dossier a:hover {
    color: var(--accent);
  }

  .status-line {
    color: var(--accent-dim);
    font-style: italic;
  }
</style>
