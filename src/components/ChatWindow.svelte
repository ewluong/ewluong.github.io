<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { isAuthenticated, sessionKey } from '../stores/auth';
  import { windowStore } from '../stores/windows';
  import { updateLedger } from '../stores/temporal';

  let abortController: AbortController | null = null;

  const STORAGE_KEY_HISTORY = 'ewluong-os-chat-history';
  const STORAGE_KEY_SYSTEM = 'ewluong-os-chat-system';

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }

  const MODELS = ['gpt-4o', 'o4-mini', 'gpt-4.1'];
  const DEFAULT_SYSTEM = 'You are MAGI — the Multi-Axis Global Intelligence system embedded in ewluong.os. You are a personal advisory intelligence. Respond with precision and clarity. You may reference NERV terminology when contextually appropriate. Prioritize concise, actionable responses.';

  // --- Chat state ---
  let history: ChatMessage[] = [];
  let inputText = '';
  let isStreaming = false;
  let streamingContent = '';
  let selectedModel = MODELS[0];
  let modelIndex = 0;
  let systemPrompt = DEFAULT_SYSTEM;
  let showSystemPrompt = false;
  let chatError = '';

  // --- DOM refs ---
  let viewport: HTMLDivElement;
  let chatInput: HTMLTextAreaElement;

  function loadHistory(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  function saveHistory() {
    if (typeof window !== 'undefined') {
      try {
        // Cap history at 200 messages to prevent unbounded localStorage growth
        if (history.length > 200) history = history.slice(-200);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
      } catch {
        // Quota exceeded — silently fail
      }
    }
  }

  function loadSystemPrompt(): string {
    if (typeof window === 'undefined') return DEFAULT_SYSTEM;
    return localStorage.getItem(STORAGE_KEY_SYSTEM) || DEFAULT_SYSTEM;
  }

  function saveSystemPrompt() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SYSTEM, systemPrompt);
    }
  }

  function clearHistory() {
    history = [];
    streamingContent = '';
    chatError = '';
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  }

  function cycleModel() {
    modelIndex = (modelIndex + 1) % MODELS.length;
    selectedModel = MODELS[modelIndex];
  }

  let scrollRaf = 0;
  async function scrollToBottom() {
    if (scrollRaf) return; // RAF-throttle: max once per frame
    scrollRaf = requestAnimationFrame(async () => {
      await tick();
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
      scrollRaf = 0;
    });
  }

  function openLogin() {
    windowStore.open('login');
  }

  async function sendMessage() {
    const content = inputText.trim();
    if (!content || isStreaming || !$isAuthenticated) return;

    history = [...history, { role: 'user', content, timestamp: Date.now() }];
    updateLedger('chatMessages', 1);
    inputText = '';
    isStreaming = true;
    streamingContent = '';
    chatError = '';
    scrollToBottom();

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    abortController = new AbortController();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$sessionKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (response.status === 401) {
        chatError = 'API KEY REVOKED // RE-AUTHENTICATE VIA LOGIN';
        isStreaming = false;
        return;
      }

      if (response.status === 429) {
        chatError = 'RATE LIMIT EXCEEDED // STANDBY';
        isStreaming = false;
        return;
      }

      if (!response.ok) {
        chatError = `TRANSMISSION ERROR // HTTP ${response.status}`;
        isStreaming = false;
        return;
      }

      if (!response.body) {
        chatError = 'TRANSMISSION ERROR // NO RESPONSE BODY';
        isStreaming = false;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

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
              assistantContent += delta;
              streamingContent = assistantContent;
              scrollToBottom();
            } catch {
              // skip malformed JSON chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      history = [...history, { role: 'assistant', content: assistantContent, timestamp: Date.now() }];
      streamingContent = '';
      saveHistory();
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      chatError = 'TRANSMISSION FAILURE // CONNECTION LOST';
    } finally {
      abortController = null;
      isStreaming = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  onMount(() => {
    history = loadHistory();
    systemPrompt = loadSystemPrompt();
    if (chatInput) chatInput.focus();
    scrollToBottom();
  });

  onDestroy(() => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  });
</script>

<div class="chat-window">
  {#if !$isAuthenticated}
    <!-- Locked state — point to Login panel -->
    <div class="locked-state">
      <div class="locked-border">
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="locked-content">
          <div class="locked-icon">&#x26A0;</div>
          <div class="locked-title">ACCESS RESTRICTED</div>
          <div class="locked-subtitle">AUTHENTICATION REQUIRED</div>
          <div class="locked-hint">OPEN LOGIN FROM THE DOCK TO AUTHENTICATE</div>
          <button class="locked-btn" on:click={openLogin}>OPEN LOGIN</button>
        </div>
      </div>
    </div>
  {:else}
    <!-- CHAT INTERFACE -->
    <div class="chat-interface">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <span class="magi-label">MAGI INTERFACE</span>
          <span class="magi-status">ACTIVE</span>
        </div>
        <div class="header-controls">
          <button class="ctrl-btn model-btn" on:click={cycleModel} title="Cycle model">
            {selectedModel.toUpperCase()}
          </button>
          <button class="ctrl-btn" on:click={clearHistory} title="Clear conversation">
            PURGE
          </button>
        </div>
      </div>

      <!-- System prompt -->
      <div class="system-section">
        <button class="system-toggle" on:click={() => showSystemPrompt = !showSystemPrompt}>
          {showSystemPrompt ? '▼' : '▶'} SYSTEM DIRECTIVE
        </button>
        {#if showSystemPrompt}
          <textarea
            class="system-textarea"
            bind:value={systemPrompt}
            on:change={saveSystemPrompt}
            spellcheck="false"
          ></textarea>
        {/if}
      </div>

      <!-- Messages -->
      <div class="message-viewport" bind:this={viewport}>
        {#if history.length === 0 && !streamingContent}
          <div class="empty-state">
            <div class="empty-sigil">
              <div class="sigil-ring"></div>
              <div class="sigil-core">M</div>
            </div>
            <div class="empty-text">MAGI SYSTEM ONLINE</div>
            <div class="empty-sub">AWAITING OPERATOR INPUT</div>
            <div class="empty-hint">NEURAL LINK ESTABLISHED // READY FOR TRANSMISSION</div>
          </div>
        {/if}

        {#each history as msg, i}
          <div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
            <div class="message-header">
              {#if msg.role === 'user'}
                <span class="msg-role operator">[OPERATOR]</span>
              {:else}
                <span class="msg-role magi">[MAGI]</span>
                <span class="msg-model">{selectedModel}</span>
              {/if}
              <span class="msg-time">{new Date(msg.timestamp).toTimeString().slice(0, 8)}</span>
            </div>
            <div class="message-content">{msg.content}</div>
          </div>
        {/each}

        {#if streamingContent}
          <div class="message assistant">
            <div class="message-header">
              <span class="msg-role magi">[MAGI]</span>
              <span class="msg-model">{selectedModel}</span>
              <span class="msg-streaming">TRANSMITTING</span>
            </div>
            <div class="message-content">{streamingContent}<span class="cursor-blink">_</span></div>
          </div>
        {/if}

        {#if chatError}
          <div class="chat-error-line">
            <span class="error-prefix">ERR:</span> {chatError}
          </div>
        {/if}
      </div>

      <!-- Input -->
      <div class="input-section">
        <div class="input-border">
          <textarea
            class="chat-input"
            bind:value={inputText}
            bind:this={chatInput}
            on:keydown={handleKeydown}
            placeholder="> transmit..."
            disabled={isStreaming}
            rows="1"
            spellcheck="false"
          ></textarea>
        </div>
        <div class="input-footer">
          <span class="input-hint">{isStreaming ? 'RECEIVING TRANSMISSION...' : 'ENTER TO TRANSMIT // SHIFT+ENTER FOR NEWLINE'}</span>
          <span class="char-count">{inputText.length}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-window {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-size: var(--text-sm);
  }

  /* ========== LOCKED STATE ========== */

  .locked-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .locked-border {
    position: relative;
    border: 1px solid var(--accent-dim);
    padding: var(--space-8) var(--space-6);
    width: 100%;
    max-width: 380px;
    background: var(--bg-primary);
  }

  .corner {
    position: absolute;
    width: 16px;
    height: 16px;
  }
  .corner.tl { top: -1px; left: -1px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
  .corner.tr { top: -1px; right: -1px; border-top: 2px solid var(--accent); border-right: 2px solid var(--accent); }
  .corner.bl { bottom: -1px; left: -1px; border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); }
  .corner.br { bottom: -1px; right: -1px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }

  .locked-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .locked-icon {
    font-size: 48px;
    color: var(--accent-dim);
    line-height: 1;
  }

  .locked-title {
    font-size: var(--text-lg);
    color: var(--accent);
    letter-spacing: 0.16em;
  }

  .locked-subtitle {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
  }

  .locked-hint {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    text-align: center;
    margin-top: var(--space-2);
  }

  .locked-btn {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.12em;
    padding: var(--space-2) var(--space-6);
    border: 1px solid var(--accent-dim);
    transition: all var(--transition-fast);
    margin-top: var(--space-2);
  }

  .locked-btn:hover {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--bg-primary);
  }

  /* ========== CHAT INTERFACE ========== */

  .chat-interface {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .magi-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.12em;
  }

  .magi-status {
    font-size: var(--text-xs);
    color: var(--status-nominal);
    letter-spacing: 0.08em;
    animation: statusPulse 3s ease-in-out infinite;
  }

  @keyframes statusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .header-controls {
    display: flex;
    gap: var(--space-2);
  }

  .ctrl-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .ctrl-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent-dim);
  }

  .model-btn {
    color: var(--accent-dim);
    border-color: var(--accent-dim);
    font-variant-numeric: tabular-nums;
  }

  /* System directive */
  .system-section {
    flex-shrink: 0;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--border);
  }

  .system-toggle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) 0;
    transition: color var(--transition-fast);
  }

  .system-toggle:hover {
    color: var(--text-secondary);
  }

  .system-textarea {
    width: 100%;
    min-height: 60px;
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-2);
    margin-top: var(--space-2);
    resize: vertical;
    line-height: 1.6;
  }

  .system-textarea:focus {
    outline: none;
    border-color: var(--accent-dim);
  }

  /* Messages */
  .message-viewport {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    opacity: 0.5;
  }

  .empty-sigil {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sigil-ring {
    position: absolute;
    inset: 0;
    border: 1px solid var(--accent-dim);
    border-radius: 50%;
    animation: sigilRotate 12s linear infinite;
  }

  .sigil-ring::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 50%;
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
    transform: translateX(-50%);
  }

  @keyframes sigilRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .sigil-core {
    font-size: var(--text-xl);
    color: var(--accent);
    letter-spacing: 0.1em;
  }

  .empty-text {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.16em;
  }

  .empty-sub {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .empty-hint {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0.6;
    margin-top: var(--space-4);
  }

  .message {
    padding: var(--space-2) 0;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .msg-role {
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    font-weight: bold;
  }

  .msg-role.operator {
    color: var(--accent);
  }

  .msg-role.magi {
    color: var(--accent-dim);
  }

  .msg-model {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  .msg-time {
    font-size: var(--text-xs);
    color: var(--text-dim);
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .msg-streaming {
    font-size: var(--text-xs);
    color: var(--status-nominal);
    letter-spacing: 0.08em;
    animation: statusPulse 1s ease-in-out infinite;
  }

  .message-content {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message.user .message-content {
    color: var(--text-primary);
  }

  .cursor-blink {
    color: var(--accent);
    animation: cursorBlink 0.8s step-end infinite;
  }

  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .chat-error-line {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.08em;
    padding: var(--space-2) 0;
    border-top: 1px solid var(--accent-dim);
    animation: errorPulse 1s ease-in-out 2;
  }

  @keyframes errorPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .error-prefix {
    color: var(--accent);
    font-weight: bold;
  }

  /* Input */
  .input-section {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding-top: var(--space-3);
  }

  .input-border {
    border: 1px solid var(--border);
    transition: border-color var(--transition-fast);
  }

  .input-border:focus-within {
    border-color: var(--accent-dim);
  }

  .chat-input {
    width: 100%;
    font-family: var(--font-system);
    font-size: var(--text-sm);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: none;
    padding: var(--space-2) var(--space-3);
    resize: none;
    line-height: 1.6;
    min-height: 38px;
    max-height: 100px;
  }

  .chat-input:focus {
    outline: none;
  }

  .chat-input::placeholder {
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .chat-input:disabled {
    opacity: 0.5;
  }

  .input-footer {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }

  .char-count {
    font-variant-numeric: tabular-nums;
  }
</style>
