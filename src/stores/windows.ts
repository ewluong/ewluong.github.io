/**
 * Window store — registry for all open windows.
 * Manages position, size, z-index, open/closed state.
 * Persists layout to localStorage.
 */

import { writable, derived, get } from 'svelte/store';

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
  /** Module type determines which component renders in the window */
  module: string;
  /** Optional data passed to the module */
  data?: Record<string, unknown>;
}

const STORAGE_KEY = 'ewluong-os-windows';
let topZ = 100;

function loadPersistedLayout(): Record<string, Partial<WindowState>> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistLayout(windows: WindowState[]) {
  if (typeof window === 'undefined') return;
  const layout: Record<string, Partial<WindowState>> = {};
  for (const w of windows) {
    layout[w.id] = { x: w.x, y: w.y, width: w.width, height: w.height, isOpen: w.isOpen, isMinimized: w.isMinimized };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

function createWindowStore() {
  const { subscribe, set, update } = writable<WindowState[]>([]);
  const persisted = loadPersistedLayout();

  return {
    subscribe,

    /** Register a window. Merges persisted position if available. */
    register(defaults: Omit<WindowState, 'zIndex'>) {
      const saved = persisted[defaults.id];
      const state: WindowState = {
        ...defaults,
        x: saved?.x ?? defaults.x,
        y: saved?.y ?? defaults.y,
        width: saved?.width ?? defaults.width,
        height: saved?.height ?? defaults.height,
        isOpen: saved?.isOpen ?? defaults.isOpen,
        isMinimized: saved?.isMinimized ?? defaults.isMinimized,
        zIndex: topZ++,
      };
      update(wins => [...wins, state]);
    },

    open(id: string) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: topZ++ } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    close(id: string) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, isOpen: false } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    minimize(id: string) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, isMinimized: true } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    focus(id: string) {
      update(wins => wins.map(w =>
        w.id === id ? { ...w, zIndex: topZ++ } : w
      ));
    },

    move(id: string, x: number, y: number) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, x, y } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    resize(id: string, width: number, height: number) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, width, height } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    toggle(id: string) {
      update(wins => {
        const win = wins.find(w => w.id === id);
        if (!win) return wins;
        if (win.isOpen && !win.isMinimized) {
          // Already open and visible — minimize it
          return wins.map(w => w.id === id ? { ...w, isMinimized: true } : w);
        }
        // Open or un-minimize
        const updated = wins.map(w =>
          w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: topZ++ } : w
        );
        persistLayout(updated);
        return updated;
      });
    },
  };
}

export const windowStore = createWindowStore();

export const focusedWindow = derived(windowStore, ($windows) => {
  const visible = $windows.filter(w => w.isOpen && !w.isMinimized);
  if (visible.length === 0) return null;
  return visible.reduce((a, b) => a.zIndex > b.zIndex ? a : b);
});
