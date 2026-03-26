/**
 * Theme store — manages the active color palette.
 * Persists user choice to localStorage.
 */

import { writable } from 'svelte/store';

export type ThemeId = 'navy' | 'terminal' | 'warm';

const STORAGE_KEY = 'ewluong-os-theme';

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'navy';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'navy' || stored === 'terminal' || stored === 'warm') return stored;
  return 'navy';
}

function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeId>(getInitialTheme());

  return {
    subscribe,
    set(theme: ThemeId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme === 'navy' ? '' : theme);
      }
      set(theme);
    },
    cycle() {
      update(current => {
        const themes: ThemeId[] = ['navy', 'terminal', 'warm'];
        const next = themes[(themes.indexOf(current) + 1) % themes.length];
        this.set(next);
        return next;
      });
    },
  };
}

export const theme = createThemeStore();
