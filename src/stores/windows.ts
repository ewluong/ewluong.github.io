/**
 * Window store — registry for all open windows.
 * Manages position, size, z-index, open/closed state.
 * Persists layout to localStorage.
 */

import { writable, derived, get } from 'svelte/store';
import { systemStats } from './system';
import { playOpen, playClose, playClick } from '../lib/uiSounds';

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
  /** NERV-style designation code (e.g. PROC.001) */
  designation?: string;
}

const STORAGE_KEY = 'ewluong-os-windows';
let topZ = 100;
const MAX_Z = 100000;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadPersistedLayout(): Record<string, Partial<WindowState>> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistLayout(windows: WindowState[], immediate = false) {
  if (typeof window === 'undefined') return;
  const write = () => {
    const layout: Record<string, Partial<WindowState>> = {};
    for (const w of windows) {
      layout[w.id] = { x: w.x, y: w.y, width: w.width, height: w.height, isOpen: w.isOpen, isMinimized: w.isMinimized };
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Quota exceeded — silently fail, layout won't persist
    }
  };
  if (immediate) { write(); return; }
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(write, 200);
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
        persistLayout(updated, true);
        systemStats.update(s => ({ ...s, windowsOpened: s.windowsOpened + 1 }));
        playOpen();
        return updated;
      });
    },

    close(id: string) {
      playClose();
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, isOpen: false } : w
        );
        persistLayout(updated, true);
        return updated;
      });
    },

    minimize(id: string) {
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, isMinimized: true } : w
        );
        persistLayout(updated, true);
        return updated;
      });
    },

    focus(id: string) {
      playClick();
      update(wins => {
        // Reset z-index stack if it grows too large
        if (topZ > MAX_Z) {
          const sorted = [...wins].sort((a, b) => a.zIndex - b.zIndex);
          topZ = 100;
          sorted.forEach(w => { w.zIndex = topZ++; });
        }
        return wins.map(w =>
          w.id === id ? { ...w, zIndex: topZ++ } : w
        );
      });
    },

    move(id: string, x: number, y: number) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      update(wins => {
        const updated = wins.map(w =>
          w.id === id ? { ...w, x, y } : w
        );
        persistLayout(updated);
        return updated;
      });
    },

    resize(id: string, width: number, height: number) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
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
          playClose();
          return wins.map(w => w.id === id ? { ...w, isMinimized: true } : w);
        }
        playOpen();
        // Open or un-minimize
        if (!win.isOpen) {
          systemStats.update(s => ({ ...s, windowsOpened: s.windowsOpened + 1 }));
        }
        const updated = wins.map(w =>
          w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: topZ++ } : w
        );
        persistLayout(updated, true);
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
