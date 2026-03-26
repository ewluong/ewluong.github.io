/**
 * Temporal awareness store — the system knows what time it is.
 * Drives time-of-day palette modulation, session memory, and morning console data.
 */

import { writable, derived } from 'svelte/store';

export type TimeOfDay = 'late-night' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface SessionMemory {
  lastVisit: number;        // timestamp
  lastSessionDuration: number; // ms
  lastWindowsOpen: string[];   // window IDs that were open
  totalSessions: number;
  streakDays: number;       // consecutive days visited
  lastStreakDate: string;   // YYYY-MM-DD
}

const SESSION_KEY = 'ewluong-os-session';

function loadSession(): SessionMemory {
  if (typeof window === 'undefined') return defaultSession();
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : defaultSession();
  } catch {
    return defaultSession();
  }
}

function defaultSession(): SessionMemory {
  return {
    lastVisit: 0,
    lastSessionDuration: 0,
    lastWindowsOpen: [],
    totalSessions: 0,
    streakDays: 0,
    lastStreakDate: '',
  };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) return 'late-night';
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 13) return 'midday';
  if (h >= 13 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function getTimeGreeting(): string {
  const tod = getTimeOfDay();
  switch (tod) {
    case 'late-night': return 'LATE NIGHT SESSION';
    case 'morning': return 'MORNING INITIALIZATION';
    case 'midday': return 'MIDDAY OPERATIONS';
    case 'afternoon': return 'AFTERNOON CYCLE';
    case 'evening': return 'EVENING MODE';
    case 'night': return 'NIGHT WATCH';
  }
}

export function formatTimeSince(ms: number): string {
  if (ms <= 0) return 'FIRST SESSION';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(ms / 60000);
  return `${mins}m ago`;
}

export function formatDurationShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- Stores ---

export const sessionMemory = writable<SessionMemory>(defaultSession());
export const timeOfDay = writable<TimeOfDay>(getTimeOfDay());

/** Temporal palette modifiers applied to the environment */
export const temporalModifiers = derived(timeOfDay, ($tod) => {
  switch ($tod) {
    case 'late-night':
      return { brightness: 0.88, accentShift: 'cool', particleDensity: 0.6, ambientSpeed: 0.6 };
    case 'morning':
      return { brightness: 1.0, accentShift: 'neutral', particleDensity: 1.1, ambientSpeed: 1.0 };
    case 'midday':
      return { brightness: 1.0, accentShift: 'neutral', particleDensity: 1.0, ambientSpeed: 1.0 };
    case 'afternoon':
      return { brightness: 0.97, accentShift: 'warm', particleDensity: 0.9, ambientSpeed: 0.9 };
    case 'evening':
      return { brightness: 0.93, accentShift: 'warm', particleDensity: 0.8, ambientSpeed: 0.8 };
    case 'night':
      return { brightness: 0.90, accentShift: 'cool', particleDensity: 0.7, ambientSpeed: 0.7 };
  }
});

/** Initialize session tracking — call on mount */
export function initSession() {
  const prev = loadSession();
  const now = Date.now();
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Calculate streak
  let streak = prev.streakDays;
  if (prev.lastStreakDate === today) {
    // Already visited today, keep streak
  } else if (prev.lastStreakDate === yesterday) {
    streak++;
  } else if (prev.lastVisit > 0) {
    streak = 1; // streak broken
  } else {
    streak = 1; // first visit
  }

  const updated: SessionMemory = {
    lastVisit: prev.lastVisit, // keep previous visit time for "last session X ago" display
    lastSessionDuration: prev.lastSessionDuration,
    lastWindowsOpen: prev.lastWindowsOpen,
    totalSessions: prev.totalSessions + 1,
    streakDays: streak,
    lastStreakDate: today,
  };

  sessionMemory.set(updated);

  // Save the *current* visit time for next session
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...updated,
      lastVisit: now,
      lastSessionDuration: 0,
      lastWindowsOpen: [],
    }));
  } catch { /* quota */ }
}

/** Save current session state (call periodically and on unload) */
export function saveSessionState(openWindowIds: string[], sessionStartTime: number) {
  const now = Date.now();
  const duration = now - sessionStartTime;

  sessionMemory.update(s => {
    const updated = {
      ...s,
      lastVisit: now,
      lastSessionDuration: duration,
      lastWindowsOpen: openWindowIds,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch { /* quota */ }
    return updated;
  });
}

/** Update time of day (call on a 1-minute interval) */
export function updateTimeOfDay() {
  timeOfDay.set(getTimeOfDay());
}
