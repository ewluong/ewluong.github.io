/**
 * Shared authentication store — holds decrypted API key in memory.
 * Used by both MAGI Chat and Bible Oracle modules.
 * The encrypted key lives in localStorage; the plaintext key is session-only.
 */

import { writable, derived } from 'svelte/store';

export const AUTH_STORAGE_KEY = 'ewluong-os-apikey';

interface AuthState {
  sessionKey: string;
  isAuthenticated: boolean;
}

function createAuthStore() {
  const { subscribe, set } = writable<AuthState>({
    sessionKey: '',
    isAuthenticated: false,
  });

  return {
    subscribe,
    login(apiKey: string) {
      set({ sessionKey: apiKey, isAuthenticated: true });
    },
    logout() {
      set({ sessionKey: '', isAuthenticated: false });
    },
    hasStoredKey(): boolean {
      if (typeof window === 'undefined') return false;
      try {
        return !!localStorage.getItem(AUTH_STORAGE_KEY);
      } catch {
        return false;
      }
    },
    resetConfig() {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {
        // storage access failed — clear session state anyway
      }
      set({ sessionKey: '', isAuthenticated: false });
    },
  };
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, $a => $a.isAuthenticated);
export const sessionKey = derived(auth, $a => $a.sessionKey);
