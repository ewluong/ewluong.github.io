/**
 * Sound settings store — controls UI sound feedback.
 */

import { writable } from 'svelte/store';

const STORAGE_KEY = 'ewluong-os-sound';

interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
}

function loadSettings(): SoundSettings {
  if (typeof window === 'undefined') return { enabled: true, volume: 0.3 };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { enabled: true, volume: 0.3 };
    const parsed = JSON.parse(stored);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      volume: Math.max(0, Math.min(1, typeof parsed.volume === 'number' ? parsed.volume : 0.3)),
    };
  } catch {
    return { enabled: true, volume: 0.3 };
  }
}

function createSoundStore() {
  const { subscribe, set, update } = writable<SoundSettings>(loadSettings());

  function persist(settings: SoundSettings) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }

  return {
    subscribe,
    toggle() {
      update(s => {
        const next = { ...s, enabled: !s.enabled };
        persist(next);
        return next;
      });
    },
    setVolume(v: number) {
      update(s => {
        const next = { ...s, volume: Math.max(0, Math.min(1, v)) };
        persist(next);
        return next;
      });
    },
  };
}

export const soundSettings = createSoundStore();
