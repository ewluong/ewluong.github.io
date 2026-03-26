<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getDailyVerse, type BibleVerse } from '../lib/bibleVerses';
  import { isAuthenticated, sessionKey } from '../stores/auth';
  import { windowStore } from '../stores/windows';

  let verse: BibleVerse | null = null;
  let verseIndex = 0;
  let today = '';
  let revealed = false;
  let glitchText = '';
  let glitchInterval: ReturnType<typeof setInterval>;

  // Steward commentary state
  let commentary = '';
  let isStreaming = false;
  let commentaryRevealed = false;
  let commentaryError = '';
  let abortController: AbortController | null = null;

  const COMMENTARY_STORAGE_KEY = 'ewluong-os-steward-commentary';

  const STEWARD_SYSTEM_PROMPT = `You are a faithful steward and shepherd — a quiet, reverent guide whose sole purpose is to lead the reader deeper into the Word of God. You speak with the warmth of a trusted elder and the precision of a scholar who has spent a lifetime in Scripture.

When given a Bible verse, you:
1. Illuminate its historical and theological context — who wrote it, to whom, and why
2. Draw connections to the broader narrative of Scripture — how this verse echoes through the Old and New Testaments
3. Offer a brief, practical meditation — how this word might shape the reader's day, their posture toward others, or their understanding of God's character
4. Close with a short prayer or benediction

Your tone is reverent but not distant, learned but not academic. You speak as one who has walked with God through dark valleys and still mornings alike. You never preach — you guide. You never lecture — you illuminate.

Keep your response concise: 3-4 short paragraphs. Do not use markdown formatting, headers, or bullet points. Write in flowing prose. You may reference other Scripture passages when they deepen understanding.`;

  // TempleOS-style divine status messages
  const DIVINE_STATUS = [
    'GOD SAID: CHANNEL OPEN',
    'HOLY SPIRIT COMPILE: OK',
    'WORD RECEIVED — MEDITATING',
    'MANNA LOADED INTO REGISTER',
    'COVENANT.SYS: ACTIVE',
    'ARK PROTOCOL: SEALED',
    'GRACE OVERFLOW: HANDLED',
  ];

  let statusLine = '';

  function loadCachedCommentary(date: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(COMMENTARY_STORAGE_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data.date === date ? data.commentary : null;
    } catch { return null; }
  }

  function cacheCommentary(date: string, text: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(COMMENTARY_STORAGE_KEY, JSON.stringify({ date, commentary: text }));
    } catch { /* quota */ }
  }

  async function requestCommentary() {
    if (!verse || isStreaming || !$isAuthenticated) return;

    // Check cache first
    const cached = loadCachedCommentary(today);
    if (cached) {
      commentary = cached;
      commentaryRevealed = true;
      return;
    }

    isStreaming = true;
    commentary = '';
    commentaryError = '';

    abortController = new AbortController();

    const messages = [
      { role: 'system' as const, content: STEWARD_SYSTEM_PROMPT },
      { role: 'user' as const, content: `Today's verse is ${verse.reference}:\n\n"${verse.text}"\n\nTheme: ${verse.theme}\n\nPlease offer your guidance on this word for today.` },
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$sessionKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        commentaryError = 'API KEY REVOKED // RE-AUTHENTICATE';
        isStreaming = false;
        return;
      }

      if (response.status === 429) {
        commentaryError = 'RATE LIMIT // THE LORD ASKS PATIENCE';
        isStreaming = false;
        return;
      }

      if (!response.ok) {
        commentaryError = `TRANSMISSION ERROR // HTTP ${response.status}`;
        isStreaming = false;
        return;
      }

      if (!response.body) {
        commentaryError = 'NO RESPONSE BODY';
        isStreaming = false;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? '';
              fullContent += delta;
              commentary = fullContent;
            } catch {
              // skip malformed chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Cache the completed commentary
      if (fullContent) {
        cacheCommentary(today, fullContent);
      }
      commentaryRevealed = true;
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      commentaryError = 'CONNECTION LOST // SEEK AND YOU SHALL FIND';
    } finally {
      abortController = null;
      isStreaming = false;
    }
  }

  function openLogin() {
    windowStore.open('login');
  }

  onMount(() => {
    const now = new Date();
    today = now.toISOString().slice(0, 10);
    const result = getDailyVerse(today);
    verse = result.verse;
    verseIndex = result.index;

    // TempleOS-style random status
    statusLine = DIVINE_STATUS[Math.floor(Math.random() * DIVINE_STATUS.length)];

    // Glitch reveal sequence
    if (verse) {
      let frame = 0;
      const chars = '†‡✝☦⊕∞αΩ░▒▓█▌▐▀▄';
      glitchInterval = setInterval(() => {
        frame++;
        if (frame < 12) {
          glitchText = Array.from({ length: 20 + Math.floor(Math.random() * 30) }, () =>
            chars[Math.floor(Math.random() * chars.length)]
          ).join('');
        } else {
          clearInterval(glitchInterval);
          glitchText = '';
          revealed = true;
        }
      }, 60);
    }

    // Auto-load cached commentary if available
    const cached = loadCachedCommentary(today);
    if (cached) {
      commentary = cached;
      commentaryRevealed = true;
    }
  });

  onDestroy(() => {
    clearInterval(glitchInterval);
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  });

  $: dayOfYear = today ? Math.floor((new Date(today).getTime() - new Date(new Date(today).getFullYear(), 0, 1).getTime()) / 86400000) + 1 : 0;
</script>

<div class="oracle">

  <!-- Cross watermark background -->
  <div class="cross-watermark" aria-hidden="true">
    <div class="cross-vertical"></div>
    <div class="cross-horizontal"></div>
  </div>

  <!-- NERV-style header band -->
  <div class="nerv-header">
    <div class="nerv-band"></div>
    <div class="nerv-title-row">
      <span class="nerv-classification">CLASSIFIED // DIVINE TRANSMISSION</span>
      <span class="nerv-doc-id">DOC.ORC-{String(verseIndex).padStart(3, '0')}</span>
    </div>
  </div>

  <!-- Cross ornament -->
  <div class="cross-ornament" aria-hidden="true">
    <div class="cross-arm-v"></div>
    <div class="cross-arm-h"></div>
    <div class="cross-glow"></div>
  </div>

  <div class="module-header">
    <span class="module-label">DAILY WORD</span>
    <span class="module-sub">MAGI ORACLE SYSTEM // LOGOS DIVISION</span>
  </div>

  <!-- TempleOS-style system line -->
  <div class="temple-status">
    <span class="temple-prompt">&gt;</span>
    <span class="temple-text">{statusLine}</span>
    <span class="temple-cursor">_</span>
  </div>

  <div class="meta-grid">
    <div class="meta-cell">
      <span class="meta-key">DATE</span>
      <span class="meta-val">{today}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-key">DAY</span>
      <span class="meta-val">{String(dayOfYear).padStart(3, '0')}/365</span>
    </div>
    <div class="meta-cell">
      <span class="meta-key">INDEX</span>
      <span class="meta-val">{String(verseIndex).padStart(3, '0')}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-key">THEME</span>
      <span class="meta-val theme-val">{verse?.theme.toUpperCase() ?? '---'}</span>
    </div>
  </div>

  <div class="divider-cross" aria-hidden="true">
    <div class="divider-line"></div>
    <div class="divider-cross-icon">✝</div>
    <div class="divider-line"></div>
  </div>

  <!-- Glitch reveal -->
  {#if glitchText}
    <div class="glitch-overlay">{glitchText}</div>
  {/if}

  <!-- Main verse display -->
  {#if verse}
    <div class="verse-frame" class:revealed>
      <!-- Corner reticles — Eva HUD style -->
      <div class="reticle tl" aria-hidden="true"></div>
      <div class="reticle tr" aria-hidden="true"></div>
      <div class="reticle bl" aria-hidden="true"></div>
      <div class="reticle br" aria-hidden="true"></div>

      <div class="verse-inner">
        <div class="verse-epigraph">THE WORD OF THE LORD</div>

        <blockquote class="verse-text">
          &ldquo;{verse.text}&rdquo;
        </blockquote>

        <div class="verse-reference">
          <span class="ref-cross">✝</span>
          {verse.reference}
        </div>
      </div>
    </div>
  {:else}
    <div class="loading">
      <span class="loading-cross">✝</span>
      RECEIVING TRANSMISSION...
    </div>
  {/if}

  <div class="divider-cross" aria-hidden="true">
    <div class="divider-line"></div>
    <div class="divider-cross-icon">✝</div>
    <div class="divider-line"></div>
  </div>

  <!-- Steward Commentary Section -->
  <div class="steward-section">
    <div class="steward-header">
      <div class="steward-title-row">
        <span class="steward-icon">✝</span>
        <span class="steward-label">THE STEWARD SPEAKS</span>
        <span class="steward-icon">✝</span>
      </div>
      <span class="steward-sub">GUIDED MEDITATION // LOGOS.AI SUBSYSTEM</span>
    </div>

    {#if commentary}
      <!-- Commentary display -->
      <div class="steward-frame" class:revealed={commentaryRevealed}>
        <div class="steward-reticle tl" aria-hidden="true"></div>
        <div class="steward-reticle tr" aria-hidden="true"></div>
        <div class="steward-reticle bl" aria-hidden="true"></div>
        <div class="steward-reticle br" aria-hidden="true"></div>

        <div class="steward-content">
          {commentary}{#if isStreaming}<span class="steward-cursor">_</span>{/if}
        </div>
      </div>

      {#if isStreaming}
        <div class="steward-streaming">
          <span class="streaming-cross">✝</span>
          THE STEWARD IS SPEAKING...
        </div>
      {/if}
    {:else if commentaryError}
      <div class="steward-error">
        <span class="error-prefix">ERR:</span> {commentaryError}
      </div>
    {:else}
      <!-- Request button or auth gate -->
      <div class="steward-gate">
        {#if $isAuthenticated}
          <button class="steward-btn" on:click={requestCommentary} disabled={isStreaming}>
            <span class="btn-cross">✝</span>
            RECEIVE GUIDANCE
            <span class="btn-cross">✝</span>
          </button>
          <span class="steward-hint">The steward will meditate upon today's word</span>
        {:else}
          <div class="steward-locked">
            <span class="locked-text">AUTHENTICATION REQUIRED FOR STEWARD ACCESS</span>
            <button class="auth-btn" on:click={openLogin}>OPEN LOGIN</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="divider-cross" aria-hidden="true">
    <div class="divider-line"></div>
    <div class="divider-cross-icon">✝</div>
    <div class="divider-line"></div>
  </div>

  <!-- NERV-style bottom readout -->
  <div class="nerv-readout">
    <div class="readout-row">
      <span class="readout-label">TRANSMISSION STATUS</span>
      <span class="readout-value nominal">RECEIVED</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">LOGOS INTEGRITY</span>
      <span class="readout-value nominal">100.0%</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">COVENANT LINK</span>
      <span class="readout-value nominal">ACTIVE</span>
    </div>
    <div class="readout-row">
      <span class="readout-label">STEWARD STATUS</span>
      <span class="readout-value" class:nominal={commentaryRevealed || isStreaming} class:standby={!commentaryRevealed && !isStreaming}>
        {isStreaming ? 'TRANSMITTING' : commentaryRevealed ? 'DELIVERED' : 'STANDBY'}
      </span>
    </div>
  </div>

  <!-- TempleOS-style footer -->
  <div class="temple-footer">
    <span class="temple-line">// All scripture is God-breathed — 2 Tim 3:16</span>
    <span class="temple-line">// After God's own heart — Acts 13:22</span>
    <span class="temple-line">// The steward is faithful over little — Luke 16:10</span>
  </div>

  <!-- Small decorative crosses along bottom -->
  <div class="cross-border" aria-hidden="true">
    {#each Array(7) as _, i}
      <span class="cross-dot" style="animation-delay: {i * 0.4}s">✝</span>
    {/each}
  </div>
</div>

<style>
  .oracle {
    position: relative;
    font-size: var(--text-sm);
    overflow: hidden;
  }

  /* --- Cross watermark behind everything --- */
  .cross-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.025;
  }

  .cross-vertical {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 280px;
    top: -120px;
    background: var(--accent);
  }

  .cross-horizontal {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 160px;
    height: 3px;
    background: var(--accent);
  }

  /* --- NERV header band --- */
  .nerv-header {
    margin-bottom: var(--space-4);
  }

  .nerv-band {
    height: 3px;
    background: linear-gradient(90deg,
      var(--accent) 0%,
      var(--accent-dim) 30%,
      transparent 70%,
      var(--accent-dim) 85%,
      var(--accent) 100%
    );
    margin-bottom: var(--space-2);
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .nerv-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nerv-classification {
    font-size: 14px;
    color: var(--accent);
    letter-spacing: 0.12em;
    animation: flicker 6s linear infinite;
  }

  .nerv-doc-id {
    font-size: 14px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
  }

  /* --- Cross ornament --- */
  .cross-ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: var(--space-4) auto;
    position: relative;
    width: 40px;
    height: 56px;
  }

  .cross-arm-v {
    position: absolute;
    width: 4px;
    height: 56px;
    background: var(--accent-dim);
    box-shadow: 0 0 12px var(--accent-glow), 0 0 24px var(--accent-glow);
  }

  .cross-arm-h {
    position: absolute;
    width: 32px;
    height: 4px;
    top: 16px;
    background: var(--accent-dim);
    box-shadow: 0 0 12px var(--accent-glow), 0 0 24px var(--accent-glow);
  }

  .cross-glow {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    top: 8px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    animation: crossPulse 4s ease-in-out infinite;
  }

  @keyframes crossPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.6); }
  }

  /* --- Module header --- */
  .module-header {
    text-align: center;
    margin-bottom: var(--space-3);
  }

  .module-label {
    display: block;
    font-size: var(--text-lg);
    color: var(--accent);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    animation: flicker 6s linear infinite;
    text-shadow: 0 0 12px var(--accent-glow);
  }

  .module-sub {
    display: block;
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.15em;
    margin-top: var(--space-1);
  }

  /* --- TempleOS-style status --- */
  .temple-status {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-2) var(--space-3);
    margin-bottom: var(--space-4);
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .temple-prompt {
    color: var(--accent);
    font-weight: bold;
  }

  .temple-text {
    color: var(--text-secondary);
    letter-spacing: 0.05em;
    flex: 1;
  }

  .temple-cursor {
    color: var(--accent);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  /* --- Meta grid --- */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-bottom: var(--space-4);
  }

  .meta-cell {
    background: var(--bg-secondary);
    padding: var(--space-2) var(--space-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .meta-key {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .meta-val {
    font-size: 14px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.06em;
  }

  .theme-val {
    color: var(--accent-dim);
  }

  /* --- Cross divider --- */
  .divider-cross {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-4) 0;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .divider-cross-icon {
    color: var(--accent-dim);
    font-size: 16px;
    opacity: 0.6;
    animation: crossPulse 4s ease-in-out infinite;
  }

  /* --- Glitch overlay --- */
  .glitch-overlay {
    font-size: 15px;
    color: var(--accent);
    letter-spacing: 0.05em;
    text-align: center;
    padding: var(--space-4);
    word-break: break-all;
    line-height: 1.8;
    opacity: 0.7;
    animation: glitchFlash 120ms linear infinite;
  }

  @keyframes glitchFlash {
    0% { opacity: 0.5; }
    50% { opacity: 0.9; }
    100% { opacity: 0.5; }
  }

  /* --- Verse frame (Eva HUD) --- */
  .verse-frame {
    position: relative;
    border: 1px solid var(--border);
    padding: var(--space-6) var(--space-4);
    margin: var(--space-2) 0;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 1000ms var(--ease-out), transform 1000ms var(--ease-out);
    background: linear-gradient(
      180deg,
      rgba(212, 160, 68, 0.02) 0%,
      transparent 30%,
      transparent 70%,
      rgba(212, 160, 68, 0.02) 100%
    );
  }

  .verse-frame.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  /* Corner reticles */
  .reticle {
    position: absolute;
    width: 14px;
    height: 14px;
    border-color: var(--accent-dim);
    border-style: solid;
    border-width: 0;
  }

  .reticle.tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
  .reticle.tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; }
  .reticle.bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; }
  .reticle.br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }

  .verse-inner {
    position: relative;
  }

  .verse-epigraph {
    font-size: 13px;
    color: var(--accent-dim);
    letter-spacing: 0.18em;
    text-align: center;
    margin-bottom: var(--space-6);
    position: relative;
  }

  .verse-epigraph::after {
    content: '';
    display: block;
    width: 40px;
    height: 1px;
    background: var(--accent-dim);
    margin: var(--space-2) auto 0;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .verse-text {
    font-family: var(--font-reading);
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: 1.85;
    margin: 0 0 var(--space-6) 0;
    padding: 0 var(--space-2);
    border: none;
    text-align: center;
    font-style: italic;
  }

  .verse-reference {
    font-size: var(--text-sm);
    color: var(--accent);
    letter-spacing: 0.08em;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .ref-cross {
    font-size: 18px;
    opacity: 0.7;
  }

  /* --- Steward Commentary Section --- */
  .steward-section {
    position: relative;
  }

  .steward-header {
    text-align: center;
    margin-bottom: var(--space-4);
  }

  .steward-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    margin-bottom: var(--space-1);
  }

  .steward-label {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.16em;
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .steward-icon {
    font-size: 14px;
    color: var(--accent-dim);
    opacity: 0.6;
  }

  .steward-sub {
    display: block;
    font-size: 12px;
    color: var(--text-dim);
    letter-spacing: 0.12em;
  }

  .steward-frame {
    position: relative;
    border: 1px solid var(--border);
    border-left: 2px solid var(--accent-dim);
    padding: var(--space-4);
    background: var(--bg-primary);
    opacity: 0.9;
    transition: opacity 600ms var(--ease-out);
  }

  .steward-frame.revealed {
    opacity: 1;
  }

  .steward-reticle {
    position: absolute;
    width: 10px;
    height: 10px;
    border-color: var(--accent-dim);
    border-style: solid;
    border-width: 0;
    opacity: 0.5;
  }

  .steward-reticle.tl { top: -1px; left: -1px; border-top-width: 1px; border-left-width: 1px; }
  .steward-reticle.tr { top: -1px; right: -1px; border-top-width: 1px; border-right-width: 1px; }
  .steward-reticle.bl { bottom: -1px; left: -1px; border-bottom-width: 1px; border-left-width: 1px; }
  .steward-reticle.br { bottom: -1px; right: -1px; border-bottom-width: 1px; border-right-width: 1px; }

  .steward-content {
    font-family: var(--font-reading);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .steward-cursor {
    color: var(--accent);
    animation: blink 0.8s step-end infinite;
  }

  .steward-streaming {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: var(--space-3) 0;
    animation: streamPulse 1.5s ease-in-out infinite;
  }

  @keyframes streamPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .streaming-cross {
    font-size: 14px;
    animation: crossPulse 2s ease-in-out infinite;
  }

  .steward-error {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.08em;
    padding: var(--space-3);
    border: 1px solid var(--accent-dim);
    text-align: center;
  }

  .error-prefix {
    font-weight: bold;
  }

  .steward-gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }

  .steward-btn {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.14em;
    padding: var(--space-3) var(--space-6);
    border: 1px solid var(--accent-dim);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
  }

  .steward-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(212, 160, 68, 0.06) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: scanSweep 3s linear infinite;
  }

  .steward-btn:hover {
    border-color: var(--accent);
    box-shadow: 0 0 16px var(--accent-glow);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  .steward-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-cross {
    font-size: 14px;
    opacity: 0.6;
  }

  .steward-hint {
    font-size: 12px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0.6;
  }

  .steward-locked {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border);
    width: 100%;
  }

  .locked-text {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    text-align: center;
  }

  .auth-btn {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
  }

  .auth-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* --- NERV readout --- */
  .nerv-readout {
    border: 1px solid var(--border);
    background: var(--bg-primary);
    margin-bottom: var(--space-3);
  }

  .readout-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .readout-row:last-child {
    border-bottom: none;
  }

  .readout-label {
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .readout-value {
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
  }

  .readout-value.nominal {
    color: var(--status-nominal);
  }

  .readout-value.standby {
    color: var(--text-dim);
  }

  /* --- TempleOS footer --- */
  .temple-footer {
    padding: var(--space-2) 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .temple-line {
    font-size: 13px;
    color: var(--text-dim);
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  /* --- Cross border pattern --- */
  .cross-border {
    display: flex;
    justify-content: space-around;
    padding: var(--space-3) 0 0;
    border-top: 1px solid var(--border);
    margin-top: var(--space-2);
  }

  .cross-dot {
    font-size: 12px;
    color: var(--accent-dim);
    opacity: 0.3;
    animation: crossFade 8s ease-in-out infinite;
  }

  @keyframes crossFade {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.5; }
  }

  /* --- Loading --- */
  .loading {
    color: var(--text-dim);
    font-size: var(--text-xs);
    letter-spacing: 0.1em;
    text-align: center;
    padding: var(--space-8) 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    animation: flicker 6s linear infinite;
  }

  .loading-cross {
    font-size: 20px;
    color: var(--accent-dim);
    animation: crossPulse 2s ease-in-out infinite;
  }
</style>
