<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * Reference Web — a curated map of the operator's external signal sources.
   * Not bookmarks. Not productivity links. A topography of intellectual terrain.
   */

  interface ReferenceNode {
    label: string;
    url: string;
    domain: string;
    category: string;
  }

  const STORAGE_KEY = 'ewluong-os-references';

  const DEFAULT_NODES: ReferenceNode[] = [
    // Instruments (tools the operator uses)
    { label: 'GitHub', url: 'https://github.com', domain: 'github.com', category: 'INSTRUMENTS' },
    { label: 'Claude', url: 'https://claude.ai', domain: 'claude.ai', category: 'INSTRUMENTS' },
    { label: 'ChatGPT', url: 'https://chat.openai.com', domain: 'chat.openai.com', category: 'INSTRUMENTS' },
    // Signal Sources (where the operator reads)
    { label: 'Hacker News', url: 'https://news.ycombinator.com', domain: 'news.ycombinator.com', category: 'SIGNAL SOURCES' },
    { label: 'Lobsters', url: 'https://lobste.rs', domain: 'lobste.rs', category: 'SIGNAL SOURCES' },
    { label: 'arXiv', url: 'https://arxiv.org', domain: 'arxiv.org', category: 'SIGNAL SOURCES' },
    // Transmissions (communication channels)
    { label: 'Gmail', url: 'https://mail.google.com', domain: 'mail.google.com', category: 'TRANSMISSIONS' },
    { label: 'Twitter', url: 'https://x.com', domain: 'x.com', category: 'TRANSMISSIONS' },
    { label: 'LinkedIn', url: 'https://linkedin.com', domain: 'linkedin.com', category: 'TRANSMISSIONS' },
    // Archives (reference material)
    { label: 'Wikipedia', url: 'https://en.wikipedia.org', domain: 'en.wikipedia.org', category: 'ARCHIVES' },
    { label: 'Stanford Encyclopedia', url: 'https://plato.stanford.edu', domain: 'plato.stanford.edu', category: 'ARCHIVES' },
    { label: 'YouTube', url: 'https://youtube.com', domain: 'youtube.com', category: 'ARCHIVES' },
  ];

  const CATEGORIES = ['INSTRUMENTS', 'SIGNAL SOURCES', 'TRANSMISSIONS', 'ARCHIVES'];

  let nodes: ReferenceNode[] = [];
  let editing = false;
  let newLabel = '';
  let newUrl = '';
  let newCategory = 'INSTRUMENTS';

  function loadNodes(): ReferenceNode[] {
    if (typeof window === 'undefined') return DEFAULT_NODES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_NODES;
    } catch {
      return DEFAULT_NODES;
    }
  }

  function saveNodes() {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes)); } catch { /* quota */ }
    }
  }

  function addNode() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    let domain = '';
    try { domain = new URL(url).hostname.replace('www.', ''); } catch { domain = url; }
    nodes = [...nodes, { label: newLabel.trim(), url, domain, category: newCategory }];
    newLabel = '';
    newUrl = '';
    saveNodes();
  }

  function removeNode(index: number) {
    nodes = nodes.filter((_, i) => i !== index);
    saveNodes();
  }

  function openNode(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  onMount(() => {
    nodes = loadNodes();
  });

  $: grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: nodes
      .map((node, idx) => ({ ...node, originalIndex: idx }))
      .filter(node => node.category === cat),
  })).filter(g => g.items.length > 0);
</script>

<div class="reference-web">
  <div class="header-row">
    <span class="module-label">REFERENCE WEB</span>
    <button class="edit-btn" on:click={() => editing = !editing}>
      {editing ? 'DONE' : 'EDIT'}
    </button>
  </div>

  <p class="module-desc">External signal topology. Instruments, sources, channels, archives.</p>

  {#each grouped as group}
    <div class="category-section">
      <div class="category-header">{group.category}</div>
      {#each group.items as node}
        <div class="node-row">
          <button class="node-btn" on:click={() => openNode(node.url)}>
            <span class="node-label">{node.label}</span>
            <span class="node-domain">{node.domain}</span>
          </button>
          {#if editing}
            <button class="remove-btn" on:click={() => removeNode(node.originalIndex)}>x</button>
          {/if}
        </div>
      {/each}
    </div>
  {/each}

  {#if editing}
    <div class="add-section">
      <div class="category-header">ADD NODE</div>
      <div class="add-form">
        <input
          class="add-input"
          bind:value={newLabel}
          placeholder="Label"
          on:keydown={(e) => e.key === 'Enter' && addNode()}
        />
        <input
          class="add-input url-input"
          bind:value={newUrl}
          placeholder="URL"
          on:keydown={(e) => e.key === 'Enter' && addNode()}
        />
        <select class="add-select" bind:value={newCategory}>
          {#each CATEGORIES as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
        <button class="add-btn" on:click={addNode}>ADD</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .reference-web {
    font-size: var(--text-sm);
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

  .module-desc {
    color: var(--text-dim);
    font-size: var(--text-xs);
    margin-bottom: var(--space-4);
  }

  .edit-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .edit-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .category-section {
    margin-bottom: var(--space-4);
  }

  .category-header {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-2);
    position: relative;
    overflow: hidden;
  }

  .category-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40px;
    height: 1px;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent-glow);
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .node-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2) var(--space-2);
    text-align: left;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .node-btn:hover {
    color: var(--text-primary);
    background: var(--bg-surface-hover);
    padding-left: calc(var(--space-2) + 2px);
    background-image: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.05) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 1.5s linear;
  }

  .node-label {
    font-size: var(--text-sm);
  }

  .node-domain {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-align: right;
  }

  .node-btn:hover .node-domain {
    color: var(--accent-dim);
  }

  .remove-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .remove-btn:hover {
    color: var(--accent);
  }

  .add-section {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .add-form {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
  }

  .add-input {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-1) var(--space-2);
    flex: 1;
    min-width: 80px;
  }

  .add-input::placeholder {
    color: var(--text-dim);
  }

  .url-input {
    flex: 2;
  }

  .add-select {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-1) var(--space-2);
  }

  .add-btn {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.08em;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
  }

  .add-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
