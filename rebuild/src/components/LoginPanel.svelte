<script lang="ts">
  import { onMount } from 'svelte';
  import { encrypt, decrypt } from '../lib/crypto';
  import { auth, isAuthenticated, AUTH_STORAGE_KEY } from '../stores/auth';

  let passwordInput = '';
  let apiKeyInput = '';
  let authError = '';
  let authPhase: 'idle' | 'authenticating' | 'denied' | 'granted' = 'idle';
  let isFirstTime = false;
  let authFlicker = false;
  let passwordField: HTMLInputElement;

  // Init sequence
  let initLines: string[] = [];
  let showSuccess = false;

  function hasStoredKey(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(AUTH_STORAGE_KEY);
  }

  async function authenticate() {
    if (!passwordInput) return;
    authPhase = 'authenticating';
    authError = '';

    if (isFirstTime) {
      if (!apiKeyInput) {
        authError = 'API KEY REQUIRED';
        authPhase = 'idle';
        return;
      }
      try {
        const encrypted = await encrypt(apiKeyInput, passwordInput);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, encrypted);
        } catch {
          authError = 'STORAGE QUOTA EXCEEDED';
          authPhase = 'idle';
          return;
        }
        auth.login(apiKeyInput);
        apiKeyInput = '';
        passwordInput = '';
        await grantAccess();
      } catch {
        authError = 'ENCRYPTION FAILURE';
        authPhase = 'idle';
      }
    } else {
      try {
        const encrypted = localStorage.getItem(AUTH_STORAGE_KEY) || '';
        const decrypted = await decrypt(encrypted, passwordInput);
        auth.login(decrypted);
        passwordInput = '';
        await grantAccess();
      } catch {
        authPhase = 'denied';
        authError = 'ACCESS DENIED // INVALID CREDENTIALS';
        authFlicker = true;
        setTimeout(() => { authFlicker = false; authPhase = 'idle'; }, 1800);
      }
    }
  }

  async function grantAccess() {
    authPhase = 'granted';
    const lines = [
      'MAGI SYSTEM v3.01 — INITIALIZING',
      'DECRYPTING SECURE CHANNEL .......... OK',
      'LOADING NEURAL INTERFACE ........... OK',
      'LOADING SCRIPTURE ENGINE ........... OK',
      'PATTERN BLUE: NEGATIVE',
      'SYNCHRONIZATION RATE: 99.7%',
      'OPERATOR CLEARANCE: CONFIRMED',
      '',
      'ALL SYSTEMS ONLINE.',
    ];

    initLines = [];
    for (const line of lines) {
      initLines = [...initLines, line];
      await new Promise(r => setTimeout(r, 100));
    }

    await new Promise(r => setTimeout(r, 600));
    showSuccess = true;
  }

  function handleLock() {
    auth.logout();
    showSuccess = false;
    initLines = [];
    authPhase = 'idle';
    authError = '';
  }

  function handleReset() {
    auth.resetConfig();
    showSuccess = false;
    initLines = [];
    authPhase = 'idle';
    authError = '';
    isFirstTime = true;
  }

  function handlePasswordKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      authenticate();
    }
  }

  onMount(() => {
    isFirstTime = !hasStoredKey();
    if (passwordField) passwordField.focus();
  });
</script>

<div class="login-panel">
  {#if $isAuthenticated && showSuccess}
    <!-- Authenticated state -->
    <div class="auth-success">
      <div class="success-border">
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="success-content">
          <div class="status-icon">&#x2726;</div>
          <div class="status-title">SYSTEMS ONLINE</div>
          <div class="status-subtitle">OPERATOR AUTHENTICATED</div>

          <div class="access-list">
            <div class="access-item">
              <span class="access-dot active"></span>
              <span class="access-label">MAGI INTERFACE</span>
              <span class="access-status">UNLOCKED</span>
            </div>
            <div class="access-item">
              <span class="access-dot active"></span>
              <span class="access-label">DAILY WORD</span>
              <span class="access-status">UNLOCKED</span>
            </div>
          </div>

          <div class="action-row">
            <button class="action-btn" on:click={handleLock}>LOCK SESSION</button>
            <button class="action-btn danger" on:click={handleReset}>RESET CONFIG</button>
          </div>
        </div>
      </div>
    </div>
  {:else if authPhase === 'granted' && !showSuccess}
    <!-- Init sequence -->
    <div class="init-area">
      <div class="init-sequence">
        {#each initLines as line}
          <div class="init-line">{line}</div>
        {/each}
        <span class="cursor-blink">_</span>
      </div>
    </div>
  {:else}
    <!-- Login terminal -->
    <div class="access-terminal" class:flicker={authFlicker}>
      <div class="terminal-border">
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="terminal-content">
          <div class="terminal-header">
            <div class="warning-bars">
              <div class="warning-bar"></div>
              <div class="warning-bar"></div>
            </div>
            <div class="terminal-title">ACCESS TERMINAL</div>
            <div class="warning-bars">
              <div class="warning-bar"></div>
              <div class="warning-bar"></div>
            </div>
          </div>

          <div class="terminal-subtitle">SECURITY CLEARANCE REQUIRED</div>
          <div class="terminal-version">MAGI SYSTEM v3.01 // OPENAI API ACCESS</div>

          <div class="terminal-divider"></div>

          {#if isFirstTime}
            <div class="config-notice">INITIAL CONFIGURATION REQUIRED</div>
            <div class="config-sub">SECURE CHANNEL NOT YET ESTABLISHED</div>

            <div class="input-group">
              <label class="input-label">OPERATOR ACCESS CODE</label>
              <input
                type="password"
                class="terminal-input"
                bind:value={passwordInput}
                bind:this={passwordField}
                on:keydown={handlePasswordKeydown}
                placeholder="••••••••"
                autocomplete="off"
              />
            </div>

            <div class="input-group">
              <label class="input-label">OPENAI API KEY</label>
              <input
                type="password"
                class="terminal-input"
                bind:value={apiKeyInput}
                placeholder="sk-..."
                on:keydown={handlePasswordKeydown}
                autocomplete="off"
              />
            </div>
          {:else}
            <div class="input-group single">
              <label class="input-label">OPERATOR ACCESS CODE</label>
              <input
                type="password"
                class="terminal-input"
                bind:value={passwordInput}
                bind:this={passwordField}
                on:keydown={handlePasswordKeydown}
                placeholder="••••••••"
                autocomplete="off"
              />
            </div>
          {/if}

          {#if authError}
            <div class="auth-error">{authError}</div>
          {/if}

          <button
            class="auth-btn"
            on:click={authenticate}
            disabled={authPhase === 'authenticating'}
          >
            {authPhase === 'authenticating' ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>

          <div class="terminal-footer">
            <span class="footer-status">
              STATUS: {authPhase === 'denied' ? 'REJECTED' : 'STANDBY'}
            </span>
            {#if !isFirstTime}
              <button class="reset-btn" on:click={handleReset}>RESET</button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .login-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-size: var(--text-sm);
  }

  /* ========== Terminal ========== */

  .access-terminal {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .access-terminal.flicker {
    animation: terminalFlicker 0.15s ease-in-out 3;
  }

  @keyframes terminalFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .terminal-border, .success-border {
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

  .terminal-content, .success-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .terminal-title {
    font-size: var(--text-lg);
    color: var(--accent);
    letter-spacing: 0.2em;
    white-space: nowrap;
  }

  .warning-bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .warning-bar {
    width: 24px;
    height: 3px;
    background: var(--accent);
    opacity: 0.6;
  }

  .terminal-subtitle {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.18em;
  }

  .terminal-version {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .terminal-divider {
    width: 100%;
    height: 1px;
    background: var(--border);
    margin: var(--space-3) 0;
  }

  .config-notice {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.12em;
    text-align: center;
  }

  .config-sub {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    margin-bottom: var(--space-2);
  }

  .input-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .input-group.single {
    margin-top: var(--space-4);
  }

  .input-label {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.1em;
  }

  .terminal-input {
    font-family: var(--font-system);
    font-size: var(--text-sm);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    padding: var(--space-2) var(--space-3);
    letter-spacing: 0.06em;
    transition: border-color var(--transition-fast);
  }

  .terminal-input:focus {
    outline: none;
    border-color: var(--accent-dim);
  }

  .terminal-input::placeholder {
    color: var(--text-dim);
  }

  .auth-error {
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.1em;
    animation: errorPulse 0.6s ease-in-out 2;
    text-align: center;
  }

  @keyframes errorPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .auth-btn {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--accent);
    letter-spacing: 0.14em;
    padding: var(--space-2) var(--space-6);
    border: 1px solid var(--accent);
    background: transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-top: var(--space-2);
  }

  .auth-btn:hover:not(:disabled) {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .auth-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .terminal-footer {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .footer-status {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  .reset-btn {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.06em;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .reset-btn:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  /* ========== Init Sequence ========== */

  .init-area {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .init-sequence {
    width: 100%;
    max-width: 380px;
  }

  .init-line {
    font-size: var(--text-xs);
    color: var(--accent-dim);
    letter-spacing: 0.06em;
    line-height: 1.8;
  }

  .init-line:last-of-type {
    color: var(--accent);
    margin-top: var(--space-2);
  }

  .cursor-blink {
    color: var(--accent);
    animation: cursorBlink 0.8s step-end infinite;
  }

  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* ========== Authenticated State ========== */

  .auth-success {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .status-icon {
    font-size: 48px;
    color: var(--accent);
    animation: glowPulse 3s ease-in-out infinite;
    line-height: 1;
  }

  .status-title {
    font-size: var(--text-lg);
    color: var(--status-nominal);
    letter-spacing: 0.16em;
  }

  .status-subtitle {
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .access-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: var(--space-4) 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .access-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
  }

  .access-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-dim);
  }

  .access-dot.active {
    background: var(--status-nominal);
    box-shadow: 0 0 6px var(--status-nominal);
  }

  .access-label {
    color: var(--text-secondary);
    flex: 1;
  }

  .access-status {
    color: var(--status-nominal);
    letter-spacing: 0.08em;
  }

  .action-row {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .action-btn {
    font-family: var(--font-system);
    font-size: var(--text-xs);
    color: var(--text-dim);
    letter-spacing: 0.08em;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border);
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent-dim);
  }

  .action-btn.danger:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
