<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface AssetData {
    id: string;
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    loading: boolean;
    category: Category;
  }

  type Category = 'CRYPTO' | 'INDEX' | 'COMMODITY' | 'ALL';

  const REFRESH_INTERVAL = 60000;

  // CoinGecko IDs for crypto
  const CRYPTO_ASSETS = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'solana', symbol: 'SOL', name: 'Solana' },
    { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  ];

  // CoinGecko also tracks tokenized stocks/indices and commodities
  const INDEX_ASSETS = [
    { id: 'sp-500', symbol: 'SPX', name: 'S&P 500' },
    { id: 'nasdaq-100', symbol: 'NDQ', name: 'Nasdaq 100' },
    { id: 'nikkei-225', symbol: 'N225', name: 'Nikkei 225' },
  ];

  const COMMODITY_ASSETS = [
    { id: 'tether-gold', symbol: 'XAUT', name: 'Gold (Tokenized)' },
    { id: 'pax-gold', symbol: 'PAXG', name: 'Gold (Paxos)' },
  ];

  let assets: AssetData[] = [];
  let lastUpdated = '';
  let refreshInterval: ReturnType<typeof setInterval>;
  let error = '';
  let activeCategory: Category = 'ALL';
  let expandedAsset: string | null = null;

  const CATEGORIES: { key: Category; label: string; designation: string }[] = [
    { key: 'ALL', label: 'ALL', designation: 'FULL SPECTRUM' },
    { key: 'CRYPTO', label: 'CRYPTO', designation: 'DIGITAL ASSETS' },
    { key: 'INDEX', label: 'INDEX', designation: 'EQUITY INDICES' },
    { key: 'COMMODITY', label: 'CMDTY', designation: 'COMMODITIES' },
  ];

  $: filteredAssets = activeCategory === 'ALL'
    ? assets
    : assets.filter(a => a.category === activeCategory);

  $: upCount = filteredAssets.filter(a => a.change24h >= 0 && !a.loading).length;
  $: downCount = filteredAssets.filter(a => a.change24h < 0 && !a.loading).length;
  $: avgChange = filteredAssets.length > 0
    ? filteredAssets.reduce((s, a) => s + a.change24h, 0) / filteredAssets.filter(a => !a.loading).length
    : 0;

  function initAssets(): AssetData[] {
    return [
      ...CRYPTO_ASSETS.map(a => ({
        ...a, price: 0, change24h: 0, high24h: 0, low24h: 0, loading: true, category: 'CRYPTO' as Category,
      })),
      ...INDEX_ASSETS.map(a => ({
        ...a, price: 0, change24h: 0, high24h: 0, low24h: 0, loading: true, category: 'INDEX' as Category,
      })),
      ...COMMODITY_ASSETS.map(a => ({
        ...a, price: 0, change24h: 0, high24h: 0, low24h: 0, loading: true, category: 'COMMODITY' as Category,
      })),
    ];
  }

  async function fetchAll() {
    error = '';
    assets = assets.map(a => ({ ...a, loading: true }));

    // Single CoinGecko call for all assets
    const allIds = [...CRYPTO_ASSETS, ...INDEX_ASSETS, ...COMMODITY_ASSETS].map(a => a.id).join(',');
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(allIds)}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      assets = assets.map(a => {
        const d = data[a.id];
        if (!d) return { ...a, loading: false };
        return {
          ...a,
          price: d.usd ?? 0,
          change24h: d.usd_24h_change ?? 0,
          high24h: d.usd_24h_high ?? 0,
          low24h: d.usd_24h_low ?? 0,
          loading: false,
        };
      });

      error = '';
    } catch {
      error = 'FEED OFFLINE';
      assets = assets.map(a => ({ ...a, loading: false }));
    }

    lastUpdated = new Date().toTimeString().slice(0, 8);
  }

  function formatPrice(n: number, category: Category): string {
    if (n === 0) return '—';
    if (category === 'CRYPTO' && n < 1) return n.toFixed(4);
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toFixed(2);
  }

  function rangePosition(price: number, low: number, high: number): number {
    if (high === low || price === 0) return 50;
    return Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
  }

  function toggleExpand(id: string) {
    expandedAsset = expandedAsset === id ? null : id;
  }

  function getCategoryDesignation(category: Category, index: number): string {
    const prefix = category === 'CRYPTO' ? 'DGT' : category === 'INDEX' ? 'IDX' : 'CMD';
    return `${prefix}.${String(index + 1).padStart(3, '0')}`;
  }

  onMount(() => {
    assets = initAssets();
    fetchAll();
    refreshInterval = setInterval(fetchAll, REFRESH_INTERVAL);
  });

  onDestroy(() => {
    clearInterval(refreshInterval);
  });
</script>

<div class="resource-monitor">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <span class="module-label">RESOURCE MONITORING</span>
      <span class="header-status" class:error={!!error}>
        {error || `ONLINE — ${lastUpdated || 'SYNCING'}`}
      </span>
    </div>
    <button class="refresh-btn" on:click={fetchAll} title="Force refresh">
      SYNC
    </button>
  </div>

  <!-- Summary bar -->
  <div class="summary-bar">
    <div class="summary-item">
      <span class="summary-label">TRACKING</span>
      <span class="summary-value">{filteredAssets.length}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label up">GAINING</span>
      <span class="summary-value up">{upCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label down">FALLING</span>
      <span class="summary-value down">{downCount}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">AVG Δ</span>
      <span class="summary-value" class:up={avgChange >= 0} class:down={avgChange < 0}>
        {isNaN(avgChange) ? '—' : `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`}
      </span>
    </div>
  </div>

  <!-- Category tabs -->
  <div class="category-tabs">
    {#each CATEGORIES as cat}
      <button
        class="cat-tab"
        class:active={activeCategory === cat.key}
        on:click={() => activeCategory = cat.key}
      >
        <span class="cat-key">{cat.label}</span>
        {#if activeCategory === cat.key}
          <span class="cat-desc">{cat.designation}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Asset list -->
  <div class="asset-list">
    {#each filteredAssets as asset, i}
      {@const direction = asset.change24h >= 0 ? '▲' : '▼'}
      {@const changeClass = asset.change24h >= 0 ? 'up' : 'down'}
      {@const pos = rangePosition(asset.price, asset.low24h, asset.high24h)}
      {@const catIndex = assets.filter(a => a.category === asset.category).indexOf(asset)}

      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="asset-row"
        class:expanded={expandedAsset === asset.id}
        on:click={() => toggleExpand(asset.id)}
      >
        <div class="asset-main">
          <span class="asset-designation">[{getCategoryDesignation(asset.category, catIndex)}]</span>
          <span class="asset-symbol">{asset.symbol}</span>
          <span class="asset-direction {changeClass}">{direction}</span>
          <span class="asset-price">
            {#if asset.loading && asset.price === 0}
              <span class="loading-dots">···</span>
            {:else}
              ${formatPrice(asset.price, asset.category)}
            {/if}
          </span>
          <span class="asset-change {changeClass}">
            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
          </span>
          <div class="asset-bar">
            <div class="bar-bg"></div>
            <div class="bar-fill {changeClass}" style="width: {pos}%"></div>
            <div class="bar-marker" style="left: {pos}%"></div>
          </div>
        </div>

        {#if expandedAsset === asset.id}
          <div class="asset-detail">
            <div class="detail-row">
              <span class="detail-label">ASSET</span>
              <span class="detail-value">{asset.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">24H HIGH</span>
              <span class="detail-value">${formatPrice(asset.high24h, asset.category)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">24H LOW</span>
              <span class="detail-value">${formatPrice(asset.low24h, asset.category)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">24H RANGE POS</span>
              <span class="detail-value">{pos.toFixed(1)}%</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">CATEGORY</span>
              <span class="detail-value cat-badge">{asset.category}</span>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Footer -->
  <div class="footer">
    <span class="footer-note">AUTO-REFRESH: 60s | SOURCE: COINGECKO</span>
  </div>
</div>

<style>
  .resource-monitor {
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ========== HEADER ========== */

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-3);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .module-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .header-status {
    font-size: var(--text-xs);
    color: var(--status-nominal);
    letter-spacing: 0.06em;
    animation: statusPulse 3s ease-in-out infinite;
  }

  .header-status.error {
    color: var(--accent);
    animation: errorFlash 1.5s ease-in-out infinite;
  }

  @keyframes statusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes errorFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .refresh-btn {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
  }

  .refresh-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .refresh-btn:active {
    transform: scale(0.94);
  }

  /* ========== SUMMARY BAR ========== */

  .summary-bar {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    margin-bottom: var(--space-3);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .summary-label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .summary-label.up { color: var(--status-nominal); opacity: 0.7; }
  .summary-label.down { color: var(--accent); opacity: 0.7; }

  .summary-value {
    font-size: var(--text-sm);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .summary-value.up { color: var(--status-nominal); }
  .summary-value.down { color: var(--accent); }

  /* ========== CATEGORY TABS ========== */

  .category-tabs {
    display: flex;
    gap: 0;
    margin-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .cat-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-2) var(--space-2);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
  }

  .cat-tab:hover {
    color: var(--text-secondary);
    background: var(--bg-surface-hover);
  }

  .cat-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .cat-key {
    font-weight: bold;
  }

  .cat-desc {
    font-size: 13px;
    color: var(--accent-dim);
    letter-spacing: 0.1em;
  }

  /* ========== ASSET LIST ========== */

  .asset-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .asset-row {
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .asset-row:hover {
    background: var(--bg-surface-hover);
  }

  .asset-row.expanded {
    background: var(--bg-surface);
    border-left: 2px solid var(--accent);
  }

  .asset-main {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2);
  }

  .asset-designation {
    font-size: 14px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    min-width: 70px;
  }

  .asset-row.expanded .asset-designation {
    color: var(--accent-dim);
  }

  .asset-symbol {
    font-size: var(--text-sm);
    color: var(--text-primary);
    min-width: 48px;
    font-weight: bold;
    letter-spacing: 0.04em;
  }

  .asset-direction {
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .asset-direction.up { color: var(--status-nominal); }
  .asset-direction.down { color: var(--accent); }

  .asset-price {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    min-width: 90px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .loading-dots {
    animation: dotsFlash 1s step-end infinite;
  }

  @keyframes dotsFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .asset-change {
    font-size: var(--text-xs);
    min-width: 64px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .asset-change.up { color: var(--status-nominal); }
  .asset-change.down { color: var(--accent); }

  .asset-bar {
    flex: 1;
    height: 6px;
    position: relative;
    min-width: 50px;
  }

  .bar-bg {
    position: absolute;
    inset: 0;
    background: var(--border);
  }

  .bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    transition: width var(--transition-normal);
  }

  .bar-fill.up { background: var(--status-nominal); opacity: 0.3; }
  .bar-fill.down { background: var(--accent); opacity: 0.3; }

  .bar-marker {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 10px;
    background: var(--accent);
    transform: translateX(-1px);
    transition: left var(--transition-normal);
  }

  /* ========== EXPANDED DETAIL ========== */

  .asset-detail {
    padding: var(--space-2) var(--space-3) var(--space-3);
    padding-left: var(--space-8);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    animation: detailSlide 200ms var(--ease-out);
  }

  @keyframes detailSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 80px;
  }

  .detail-label {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .detail-value {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .cat-badge {
    color: var(--accent-dim);
    letter-spacing: 0.1em;
  }

  /* ========== FOOTER ========== */

  .footer {
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .footer-note {
    font-size: 14px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }
</style>
