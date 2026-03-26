/**
 * Signal Engine — Multi-source news aggregation with importance ranking
 *
 * Sources (all free, no API keys):
 *   Tier 1 (native CORS): HN Algolia, Lobsters, Wikipedia most-read
 *   Tier 2 (via rss2json proxy): BBC, Reuters, NPR, The Guardian, Ars Technica, Al Jazeera
 *
 * Ranking algorithm:
 *   importance = base_score × recency_decay × source_weight × cross_source_multiplier
 *
 * Cross-source detection uses normalized URL matching + fuzzy title similarity
 * to identify when multiple outlets cover the same story.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawSignal {
  title: string;
  url: string;
  source: string;
  sourceCategory: 'tech' | 'world' | 'knowledge';
  score: number;        // normalized 0–1 within source
  commentCount: number;
  publishedAt: number;  // unix ms
}

export interface Signal {
  id: string;
  title: string;
  url: string;
  primarySource: string;
  allSources: string[];
  sourceCategory: 'tech' | 'world' | 'knowledge';
  importance: number;   // computed composite score
  priority: 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';
  publishedAt: number;
  commentCount: number;
  crossSourceCount: number;
}

export interface SourceDef {
  id: string;
  label: string;
  category: 'tech' | 'world' | 'knowledge';
  weight: number;       // source authority weight (0–2)
  fetch: () => Promise<RawSignal[]>;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// URL normalization (for cross-source matching)
// ---------------------------------------------------------------------------

function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    // Only normalize http/https URLs
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    // Strip tracking params
    const stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'fbclid', 'gclid'];
    stripParams.forEach(p => u.searchParams.delete(p));
    // Normalize host
    let host = u.hostname.replace(/^www\./, '').replace(/^amp\./, '');
    // Strip trailing slash
    let path = u.pathname.replace(/\/+$/, '');
    // Remove /amp suffix
    path = path.replace(/\/amp$/, '');
    return `${host}${path}`.toLowerCase();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Fuzzy title similarity (trigram-based)
// ---------------------------------------------------------------------------

function hashTitle(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

function trigrams(s: string): Set<string> {
  const clean = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const set = new Set<string>();
  for (let i = 0; i <= clean.length - 3; i++) {
    set.add(clean.slice(i, i + 3));
  }
  return set;
}

function titleSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  ta.forEach(t => { if (tb.has(t)) intersection++; });
  return (2 * intersection) / (ta.size + tb.size); // Dice coefficient
}

// ---------------------------------------------------------------------------
// Time decay (HN-style gravity)
// ---------------------------------------------------------------------------

const GRAVITY = 1.8;

function recencyDecay(publishedAt: number): number {
  const ageHours = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
  return 1 / Math.pow(ageHours + 2, GRAVITY);
}

// ---------------------------------------------------------------------------
// Source fetchers
// ---------------------------------------------------------------------------

// Shared rss2json proxy
async function fetchRss(feedUrl: string, source: string, category: 'tech' | 'world' | 'knowledge'): Promise<RawSignal[]> {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'RSS parse error');
  return (data.items || []).map((item: any) => ({
    title: (item.title || 'UNTITLED').trim(),
    url: item.link || '',
    source,
    sourceCategory: category,
    score: 0.5,   // RSS items don't have scores; use neutral baseline
    commentCount: 0,
    publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
  }));
}

async function fetchHackerNews(): Promise<RawSignal[]> {
  const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30');
  if (!res.ok) throw new Error(`HN fetch failed: ${res.status}`);
  const data = await res.json();
  const hits = Array.isArray(data.hits) ? data.hits : [];
  if (hits.length === 0) return [];
  const maxPoints = Math.max(1, ...hits.map((h: any) => h.points || 1));
  return hits.map((hit: any) => ({
    title: (hit.title || 'UNTITLED').trim(),
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    source: 'HACKERNEWS',
    sourceCategory: 'tech' as const,
    score: (hit.points || 0) / maxPoints,
    commentCount: hit.num_comments || 0,
    publishedAt: hit.created_at ? new Date(hit.created_at).getTime() : Date.now(),
  }));
}

async function fetchLobsters(): Promise<RawSignal[]> {
  const res = await fetch('https://lobste.rs/hottest.json');
  if (!res.ok) throw new Error(`Lobsters fetch failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return [];
  const maxScore = Math.max(1, ...data.map((s: any) => s.score || 1));
  return data.slice(0, 25).map((story: any) => ({
    title: (story.title || 'UNTITLED').trim(),
    url: story.url || story.short_id_url || '',
    source: 'LOBSTERS',
    sourceCategory: 'tech' as const,
    score: (story.score || 0) / maxScore,
    commentCount: story.comment_count || 0,
    publishedAt: story.created_at ? new Date(story.created_at).getTime() : Date.now(),
  }));
}

async function fetchWikipediaMostRead(): Promise<RawSignal[]> {
  // Wikipedia most-read uses yesterday's date (today's data isn't available until end of day)
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${yyyy}/${mm}/${dd}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ewluong.os/1.0 (personal dashboard)' }
  });
  if (!res.ok) throw new Error(`Wikipedia fetch failed: ${res.status}`);
  const data = await res.json();

  const articles = Array.isArray(data.mostread?.articles) ? data.mostread.articles : [];
  if (articles.length === 0) return [];
  // Filter out main page and generic articles
  const filtered = articles.filter((a: any) =>
    a.title && a.title !== 'Main_Page' &&
    !a.title.startsWith('Special:') &&
    !a.title.startsWith('Portal:')
  );
  if (filtered.length === 0) return [];
  const maxViews = Math.max(1, ...filtered.map((a: any) => a.views || 1));

  return filtered.slice(0, 20).map((article: any) => ({
    title: (article.normalizedtitle || article.title || 'UNTITLED').replace(/_/g, ' '),
    url: article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${article.title}`,
    source: 'WIKIPEDIA',
    sourceCategory: 'knowledge' as const,
    score: (article.views || 0) / maxViews,
    commentCount: 0,
    publishedAt: Date.now() - 12 * 60 * 60 * 1000, // approximate: yesterday's aggregate
  }));
}

// ---------------------------------------------------------------------------
// All source definitions
// ---------------------------------------------------------------------------

export const ALL_SOURCES: SourceDef[] = [
  // Tier 1 — native CORS, high quality
  {
    id: 'hackernews',
    label: 'HACKERNEWS',
    category: 'tech',
    weight: 1.0,
    fetch: fetchHackerNews,
    enabled: true,
  },
  {
    id: 'lobsters',
    label: 'LOBSTERS',
    category: 'tech',
    weight: 0.7,
    fetch: fetchLobsters,
    enabled: true,
  },
  {
    id: 'wikipedia',
    label: 'WIKIPEDIA',
    category: 'knowledge',
    weight: 1.2,
    fetch: fetchWikipediaMostRead,
    enabled: true,
  },

  // Tier 2 — RSS via proxy, world news
  {
    id: 'bbc',
    label: 'BBC',
    category: 'world',
    weight: 1.0,
    fetch: () => fetchRss('https://feeds.bbci.co.uk/news/rss.xml', 'BBC', 'world'),
    enabled: true,
  },
  {
    id: 'reuters',
    label: 'REUTERS',
    category: 'world',
    weight: 1.1,
    fetch: () => fetchRss('https://feeds.reuters.com/reuters/topNews', 'REUTERS', 'world'),
    enabled: true,
  },
  {
    id: 'npr',
    label: 'NPR',
    category: 'world',
    weight: 0.8,
    fetch: () => fetchRss('https://feeds.npr.org/1001/rss.xml', 'NPR', 'world'),
    enabled: true,
  },
  {
    id: 'guardian',
    label: 'GUARDIAN',
    category: 'world',
    weight: 0.9,
    fetch: () => fetchRss('https://www.theguardian.com/world/rss', 'GUARDIAN', 'world'),
    enabled: true,
  },
  {
    id: 'arstechnica',
    label: 'ARSTECHNICA',
    category: 'tech',
    weight: 0.8,
    fetch: () => fetchRss('https://feeds.arstechnica.com/arstechnica/index', 'ARSTECHNICA', 'tech'),
    enabled: true,
  },
  {
    id: 'aljazeera',
    label: 'ALJAZEERA',
    category: 'world',
    weight: 0.8,
    fetch: () => fetchRss('https://www.aljazeera.com/xml/rss/all.xml', 'ALJAZEERA', 'world'),
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// Core aggregation engine
// ---------------------------------------------------------------------------

/**
 * Cluster raw signals by URL or title similarity.
 * Returns groups where each group = same underlying story from different sources.
 */
function clusterSignals(raw: RawSignal[]): RawSignal[][] {
  const normalizedUrls = raw.map(r => normalizeUrl(r.url));
  const clusters: RawSignal[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < raw.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [raw[i]];
    assigned.add(i);

    for (let j = i + 1; j < raw.length; j++) {
      if (assigned.has(j)) continue;
      // Same source? Skip (don't cluster within same source)
      if (raw[i].source === raw[j].source) continue;

      // Check URL match (skip empty normalized URLs)
      if (normalizedUrls[i] !== '' && normalizedUrls[j] !== '' && normalizedUrls[i] === normalizedUrls[j]) {
        cluster.push(raw[j]);
        assigned.add(j);
        continue;
      }

      // Check title similarity (threshold 0.5 = ~50% trigram overlap)
      if (titleSimilarity(raw[i].title, raw[j].title) > 0.5) {
        cluster.push(raw[j]);
        assigned.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/**
 * Compute importance score for a cluster of signals about the same story.
 */
function scoreCluster(cluster: RawSignal[], sourceWeights: Map<string, number>): Signal {
  // Pick the best item as primary (highest individual score)
  const sorted = [...cluster].sort((a, b) => b.score - a.score);
  const primary = sorted[0];

  // Aggregate scores across sources
  let baseScore = 0;
  for (const item of cluster) {
    const weight = sourceWeights.get(item.source) || 0.5;
    baseScore += item.score * weight;
  }

  // Cross-source multiplier: appearing in N sources is a strong signal
  const uniqueSources = new Set(cluster.map(c => c.source));
  const crossSourceMultiplier = 1 + (uniqueSources.size - 1) * 0.6;

  // Recency: use the most recent publish time in the cluster
  const latestPublish = Math.max(...cluster.map(c => c.publishedAt));
  const decay = recencyDecay(latestPublish);

  // Comment engagement bonus (logarithmic)
  const totalComments = cluster.reduce((sum, c) => sum + c.commentCount, 0);
  const commentBonus = totalComments > 0 ? 1 + Math.log10(totalComments) * 0.15 : 1;

  const importance = baseScore * decay * crossSourceMultiplier * commentBonus;

  // Determine priority
  let priority: Signal['priority'];
  if (uniqueSources.size >= 3) priority = 'CRITICAL';
  else if (importance > 0.08) priority = 'HIGH';
  else if (importance > 0.03) priority = 'MED';
  else priority = 'LOW';

  // Generate stable ID from normalized URL, fall back to title hash
  const normalizedId = normalizeUrl(primary.url);
  const id = normalizedId || `t-${hashTitle(primary.title)}`;

  return {
    id,
    title: primary.title,
    url: primary.url,
    primarySource: primary.source,
    allSources: [...uniqueSources],
    sourceCategory: primary.sourceCategory,
    importance,
    priority,
    publishedAt: latestPublish,
    commentCount: totalComments,
    crossSourceCount: uniqueSources.size,
  };
}

/**
 * Main aggregation: fetch all sources, cluster, rank, return top signals.
 */
export async function aggregateSignals(
  sources: SourceDef[],
  maxResults: number = 40
): Promise<{ signals: Signal[]; fetchedSources: string[]; failedSources: string[] }> {
  const enabledSources = sources.filter(s => s.enabled);

  // Fetch all sources in parallel
  const results = await Promise.allSettled(
    enabledSources.map(async (src) => {
      const items = await src.fetch();
      return { source: src, items };
    })
  );

  const allRaw: RawSignal[] = [];
  const fetchedSources: string[] = [];
  const failedSources: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const src = enabledSources[i];
    if (result.status === 'fulfilled') {
      allRaw.push(...result.value.items);
      fetchedSources.push(src.label);
    } else {
      failedSources.push(src.label);
    }
  }

  // Build source weight map
  const sourceWeights = new Map<string, number>();
  for (const src of sources) {
    sourceWeights.set(src.label, src.weight);
  }

  // Cluster and score
  const clusters = clusterSignals(allRaw);
  const scored = clusters.map(c => scoreCluster(c, sourceWeights));

  // Sort by importance descending
  scored.sort((a, b) => b.importance - a.importance);

  return {
    signals: scored.slice(0, maxResults),
    fetchedSources,
    failedSources,
  };
}
