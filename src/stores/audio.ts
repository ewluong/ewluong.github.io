/**
 * Audio store — manages music playback state and audio analysis.
 * Exposes RMS level for environment reactivity.
 */

import { writable, derived } from 'svelte/store';

export interface Track {
  title: string;
  artist: string;
  src: string;
}

export const tracks: Track[] = [
  { title: 'Sample', artist: 'ewluong', src: '/audio/sample.mp3' },
  { title: 'Sample 2', artist: 'ewluong', src: '/audio/sample2.mp3' },
  { title: 'Sample 3', artist: 'ewluong', src: '/audio/sample3.mp3' },
  { title: 'Sample 4', artist: 'ewluong', src: '/audio/sample4.mp3' },
];

export const currentTrackIndex = writable(0);
export const isPlaying = writable(false);
export const rmsLevel = writable(0);
export const frequencyData = writable<Uint8Array>(new Uint8Array(0));

export const currentTrack = derived(currentTrackIndex, ($i) => tracks[$i] ?? tracks[0]);

const FAVORITES_KEY = 'ewluong-os-favorites';

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function createFavoritesStore() {
  const { subscribe, set, update } = writable<Set<string>>(loadFavorites());

  function persist(favs: Set<string>) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
    }
  }

  return {
    subscribe,
    toggle(src: string) {
      update(favs => {
        const next = new Set(favs);
        if (next.has(src)) next.delete(src);
        else next.add(src);
        persist(next);
        return next;
      });
    },
  };
}

export const favorites = createFavoritesStore();
