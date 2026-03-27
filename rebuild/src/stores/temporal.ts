/**
 * Temporal awareness store — the system knows what time it is.
 * Drives time-of-day palette modulation, session memory, vector atmosphere,
 * coherence tracking, drift awareness, and morning console data.
 */

import { writable, derived, get } from 'svelte/store';

export type TimeOfDay = 'late-night' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type SessionVector = 'WRITE' | 'RESEARCH' | 'READ' | 'REFLECT' | 'BUILD' | 'BROWSE' | '';

export type AmbientTextPool = 'default' | 'writing' | 'signals' | 'archive' | 'spiritual' | 'projects';

export interface SessionMemory {
  lastVisit: number;        // timestamp
  lastSessionDuration: number; // ms
  lastWindowsOpen: string[];   // window IDs that were open
  totalSessions: number;
  streakDays: number;       // consecutive days visited
  lastStreakDate: string;   // YYYY-MM-DD
  lastVector: SessionVector; // last session's declared intention
  lastCoherence: number;    // 0-100, last session's coherence ratio
}

export interface CoherenceState {
  vectorAlignedMs: number;   // time focused on vector-aligned modules
  totalFocusedMs: number;    // total time with any module focused
  ratio: number;             // 0-1
  driftMinutes: number;      // consecutive minutes in non-aligned modules
  lastUpdateTime: number;    // timestamp of last coherence update
}

export interface VectorModifiers {
  ambientTextSpeed: number;
  ambientTextDensity: number;
  particleDensity: number;
  shapeSpeed: number;
  canvasBrightness: number;
  ambientTextPool: AmbientTextPool;
}

const SESSION_KEY = 'ewluong-os-session';

// --- Drift thresholds ---
const DRIFT_GRACE_MINUTES = 10;
const DRIFT_MILD_MINUTES = 20;
const DRIFT_MODERATE_MINUTES = 30;

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
    lastVector: '',
    lastCoherence: -1,
  };
}

function defaultCoherence(): CoherenceState {
  return {
    vectorAlignedMs: 0,
    totalFocusedMs: 0,
    ratio: 1,
    driftMinutes: 0,
    lastUpdateTime: Date.now(),
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

// --- Session vector: what are you here for? ---

/** Which modules each vector emphasizes in the dock and counts as "aligned" */
export const VECTOR_MODULES: Record<SessionVector, string[]> = {
  'WRITE': ['daily-log', 'writing', 'tarot'],
  'RESEARCH': ['quick-links', 'signals', 'chat'],
  'READ': ['writing', 'backrooms', 'tarot'],
  'REFLECT': ['tarot', 'daily-log', 'habits'],
  'BUILD': ['projects', 'chat', 'quick-links'],
  'BROWSE': [], // no emphasis — everything equal
  '': [],
};

/** Which windows to auto-open when a vector is selected */
export const VECTOR_AUTO_OPEN: Record<SessionVector, string[]> = {
  'WRITE': ['daily-log'],
  'RESEARCH': ['quick-links'],
  'READ': ['writing'],
  'REFLECT': ['tarot'],
  'BUILD': ['projects'],
  'BROWSE': [],
  '': [],
};

// --- Stores ---

export const sessionVector = writable<SessionVector>('');
export const sessionMemory = writable<SessionMemory>(defaultSession());
export const timeOfDay = writable<TimeOfDay>(getTimeOfDay());
export const coherenceState = writable<CoherenceState>(defaultCoherence());

/** Brief session seal message shown when tab loses focus */
export const sessionSealMessage = writable<string>('');

// --- Vector atmosphere modifiers (Move 2: Living Vector) ---

export const vectorModifiers = derived(sessionVector, ($vec): VectorModifiers => {
  switch ($vec) {
    case 'WRITE':
      return {
        ambientTextSpeed: 0.5,
        ambientTextDensity: 0.6,
        particleDensity: 0.7,
        shapeSpeed: 0.6,
        canvasBrightness: 0.98,
        ambientTextPool: 'writing',
      };
    case 'RESEARCH':
      return {
        ambientTextSpeed: 1.3,
        ambientTextDensity: 1.4,
        particleDensity: 1.2,
        shapeSpeed: 1.2,
        canvasBrightness: 1.0,
        ambientTextPool: 'signals',
      };
    case 'READ':
      return {
        ambientTextSpeed: 0.4,
        ambientTextDensity: 0.4,
        particleDensity: 0.5,
        shapeSpeed: 0.4,
        canvasBrightness: 0.95,
        ambientTextPool: 'archive',
      };
    case 'REFLECT':
      return {
        ambientTextSpeed: 0.3,
        ambientTextDensity: 0.5,
        particleDensity: 0.6,
        shapeSpeed: 0.5,
        canvasBrightness: 0.93,
        ambientTextPool: 'spiritual',
      };
    case 'BUILD':
      return {
        ambientTextSpeed: 1.0,
        ambientTextDensity: 1.0,
        particleDensity: 1.0,
        shapeSpeed: 1.1,
        canvasBrightness: 1.0,
        ambientTextPool: 'projects',
      };
    default:
      return {
        ambientTextSpeed: 1.0,
        ambientTextDensity: 1.0,
        particleDensity: 1.0,
        shapeSpeed: 1.0,
        canvasBrightness: 1.0,
        ambientTextPool: 'default',
      };
  }
});

// --- Drift modifiers derived from coherence state (Move 3) ---

export const driftModifiers = derived(coherenceState, ($cs) => {
  const dm = $cs.driftMinutes;
  if (dm < DRIFT_GRACE_MINUTES) {
    return { brightnessReduction: 0, speedReduction: 0, shapePerturbation: 0, driftLevel: 0 as 0 | 1 | 2 | 3 };
  }
  if (dm < DRIFT_MILD_MINUTES) {
    return { brightnessReduction: 0, speedReduction: 0, shapePerturbation: 0, driftLevel: 1 as 0 | 1 | 2 | 3 };
  }
  if (dm < DRIFT_MODERATE_MINUTES) {
    return { brightnessReduction: 0.025, speedReduction: 0.15, shapePerturbation: 0.3, driftLevel: 2 as 0 | 1 | 2 | 3 };
  }
  return { brightnessReduction: 0.025, speedReduction: 0.15, shapePerturbation: 0.3, driftLevel: 3 as 0 | 1 | 2 | 3 };
});

/** Generate the seal message from current session state */
export function sealSession(sessionStartTime: number) {
  const duration = formatDurationShort(Date.now() - sessionStartTime);
  const currentVector = get(sessionVector);
  const cs = get(coherenceState);

  const parts = [`SESSION SEALED — ${duration}`];
  if (currentVector) parts.push(`VECTOR: ${currentVector}`);
  if (currentVector && currentVector !== 'BROWSE' && cs.totalFocusedMs > 60000) {
    parts.push(`${Math.round(cs.ratio * 100)}% COHERENT`);
  }

  // Deterministic closing line for the day
  const today = new Date().toISOString().slice(0, 10);
  const closingPhrases = [
    'go in peace.',
    'carry the word.',
    'the gate closes behind you.',
    'return when ready.',
    'selah.',
    'the threshold remembers.',
    'pass through.',
  ];
  const hash = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  parts.push(closingPhrases[hash % closingPhrases.length]);

  sessionSealMessage.set(parts.join(' / '));

  // Auto-clear after 3 seconds
  setTimeout(() => sessionSealMessage.set(''), 3000);
}

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

// --- Coherence tracking (Move 3: Drift Awareness) ---

/** Update coherence state based on currently focused module. Call every second. */
export function updateCoherence(focusedModule: string | undefined) {
  const vec = get(sessionVector);
  // No tracking if no vector or BROWSE
  if (!vec || vec === 'BROWSE') return;

  const aligned = VECTOR_MODULES[vec] || [];
  const now = Date.now();

  coherenceState.update(cs => {
    const elapsed = now - cs.lastUpdateTime;
    if (elapsed <= 0 || elapsed > 5000) {
      // Skip if too large a gap (tab was hidden)
      return { ...cs, lastUpdateTime: now };
    }

    const isAligned = focusedModule ? aligned.includes(focusedModule) : false;
    // No focused window = not drifting but not aligned either (idle)
    const isFocused = !!focusedModule;

    let { vectorAlignedMs, totalFocusedMs, driftMinutes } = cs;

    if (isFocused) {
      totalFocusedMs += elapsed;
      if (isAligned) {
        vectorAlignedMs += elapsed;
        // Decay drift: halve every 2 minutes of aligned focus
        driftMinutes = Math.max(0, driftMinutes - (elapsed / 120000) * driftMinutes);
      } else {
        driftMinutes += elapsed / 60000;
      }
    }

    const ratio = totalFocusedMs > 0 ? vectorAlignedMs / totalFocusedMs : 1;

    return { vectorAlignedMs, totalFocusedMs, ratio, driftMinutes, lastUpdateTime: now };
  });
}

/** Reset drift state (called on /reorient or vector change) */
export function resetDrift() {
  coherenceState.update(cs => ({
    ...cs,
    driftMinutes: 0,
  }));
}

/** Get current coherence ratio as percentage (0-100) */
export function getCoherencePercent(): number {
  const cs = get(coherenceState);
  if (cs.totalFocusedMs < 60000) return -1; // not enough data
  return Math.round(cs.ratio * 100);
}

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
    lastVector: prev.lastVector,
    lastCoherence: prev.lastCoherence,
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
  const currentVector = get(sessionVector);
  const coherencePercent = getCoherencePercent();

  sessionMemory.update(s => {
    const updated = {
      ...s,
      lastVisit: now,
      lastSessionDuration: duration,
      lastWindowsOpen: openWindowIds,
      lastVector: currentVector || s.lastVector,
      lastCoherence: coherencePercent >= 0 ? coherencePercent : s.lastCoherence,
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
