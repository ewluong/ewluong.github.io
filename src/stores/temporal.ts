/**
 * Temporal awareness store — the system knows what time it is.
 * Drives time-of-day palette modulation, session memory, vector atmosphere,
 * coherence tracking, drift awareness, and morning console data.
 */

import { writable, derived, get } from 'svelte/store';

export type TimeOfDay = 'late-night' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type SessionVector = 'WRITE' | 'RESEARCH' | 'READ' | 'REFLECT' | 'BUILD' | 'BROWSE' | '';

export type AmbientTextPool = 'default' | 'writing' | 'signals' | 'archive' | 'spiritual' | 'projects';

// --- Session History (rolling 30-day archive) ---

export interface SessionRecord {
  date: string;              // YYYY-MM-DD
  sessionIndex: number;      // nth session that day
  vector: SessionVector;
  durationMs: number;
  coherencePercent: number;  // -1 if insufficient
  ledger: SessionLedger;
  driftPeakMinutes: number;  // highest drift reached
  modulesVisited: string[];  // unique modules only
}

export interface WatcherEntry {
  date: string;           // YYYY-MM-DD when Watcher appeared
  sessionNumber: number;  // which session triggered it
  question: string;       // the question that was asked
  response: string;       // user's answer (max 280 chars)
}

export interface SessionHistory {
  records: SessionRecord[];        // max 90 entries
  watcherEntries: WatcherEntry[];  // max 52 entries (~1 year)
}

export interface WatcherSummary {
  sessionCount: number;
  totalDurationMs: number;
  vectorDistribution: Record<string, number>;  // ms per vector
  avgCoherence: number;
  totalWordsWritten: number;
  totalSignalsRead: number;
  totalHabitsCompleted: number;
  mostVisitedModules: string[];  // top 3
  driftPattern: 'improving' | 'stable' | 'worsening';
  previousWatcherEntry?: WatcherEntry;
}

export interface RecentPatterns {
  vectorDistribution: Record<string, number>;  // total ms per vector, last 7 days
  averageCoherence: number;                    // last 7 sessions
  driftTrend: 'improving' | 'stable' | 'worsening';
  sessionsThisWeek: number;
}

export interface SessionMemory {
  lastVisit: number;        // timestamp
  lastSessionDuration: number; // ms
  lastWindowsOpen: string[];   // window IDs that were open
  totalSessions: number;
  streakDays: number;       // consecutive days visited
  lastStreakDate: string;   // YYYY-MM-DD
  lastVector: SessionVector; // last session's declared intention
  lastCoherence: number;    // 0-100, last session's coherence ratio
  lastLedger: SessionLedger; // what the operator actually did last session
}

export interface SessionLedger {
  wordsWritten: number;        // delta from log word count at session start
  signalsRead: number;         // signals marked read this session
  habitsCompleted: number;     // habits toggled on this session
  chatMessages: number;        // messages sent in MAGI
  modulesVisited: string[];    // unique module IDs focused (in order, no consecutive dupes)
  scratchpadChars: number;     // delta of scratchpad content length
  silenceMs: number;           // total milliseconds spent in silence this session
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
const HISTORY_KEY = 'ewluong-os-history';
const MAX_HISTORY_RECORDS = 90;
const MAX_WATCHER_ENTRIES = 52;

// --- Drift thresholds ---
const DRIFT_GRACE_MINUTES = 10;
const DRIFT_MILD_MINUTES = 20;
const DRIFT_MODERATE_MINUTES = 30;
const DRIFT_SEVERE_MINUTES = 45;
const DRIFT_TERMINAL_MINUTES = 60;

function loadSession(): SessionMemory {
  if (typeof window === 'undefined') return defaultSession();
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : defaultSession();
  } catch {
    return defaultSession();
  }
}

function defaultLedger(): SessionLedger {
  return {
    wordsWritten: 0,
    signalsRead: 0,
    habitsCompleted: 0,
    chatMessages: 0,
    modulesVisited: [],
    scratchpadChars: 0,
    silenceMs: 0,
  };
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
    lastLedger: defaultLedger(),
  };
}

// --- Session History ---

function loadHistory(): SessionHistory {
  if (typeof window === 'undefined') return { records: [], watcherEntries: [] };
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return { records: [], watcherEntries: [] };
    const parsed = JSON.parse(stored);
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      watcherEntries: Array.isArray(parsed.watcherEntries) ? parsed.watcherEntries : [],
    };
  } catch {
    return { records: [], watcherEntries: [] };
  }
}

function saveHistory(history: SessionHistory) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* quota */ }
}

// --- Watcher Questions (examination-of-conscience register) ---

const WATCHER_QUESTIONS: string[] = [
  'what did you avoid this week?',
  'what word kept returning?',
  'are you building or maintaining?',
  'what would you change about how you entered?',
  'where did you drift, and was the drift meaningful?',
  'what did you read that changed something?',
  'is your vector still the right one?',
  'what are you not saying in the log?',
  'who did you write for?',
  'what question are you circling without asking?',
  'what habit feels hollow now?',
  'where is the edge of your attention?',
  'what would the threshold say about this week?',
  'are you passing through or settling in?',
  'what did MAGI help you avoid thinking about?',
  'what signal did you ignore?',
  'is this system still serving you, or are you serving it?',
  'what did you mean to write but didn\'t?',
  'when were you most coherent, and why?',
  'what would you tell the operator from last month?',
  'what are you afraid to start?',
  'which window do you open first, and why?',
  'what did you learn that you didn\'t expect?',
  'where does your attention go when you stop directing it?',
  'what is the difference between this week and last?',
  'are you reading to learn or reading to avoid?',
  'what would you build if no one would see it?',
  'what does coherence feel like in your body?',
  'what did you finish?',
  'what conversation are you postponing?',
  'which habit actually changes your day?',
  'what did the silence teach you?',
  'are you writing toward something or away from something?',
  'what would you remove from this system?',
  'when did you last surprise yourself?',
  'what pattern are you in?',
  'what is the most honest sentence you could write right now?',
  'what do you keep coming back to?',
  'where are you rushing?',
  'what would rest look like today?',
  'what did you give your best attention to?',
  'what are you not measuring that matters?',
  'is the gate helping or has it become furniture?',
  'what changed between entering and now?',
  'what do you owe no one?',
  'where is the gap between your vector and your action?',
  'what are you pretending not to know?',
  'what would you do differently with the same hours?',
  'what did you carry in that you should have left outside?',
  'what will you remember from this week?',
];

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
  'READ': ['writing', 'tarot'],
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

/** Rolling session history — 30 days of records + watcher entries */
export const sessionHistory = writable<SessionHistory>(loadHistory());

/** Current session's activity ledger — tracks what the operator actually did */
export const sessionLedger = writable<SessionLedger>(defaultLedger());

/** Increment a numeric field in the session ledger */
export function updateLedger(field: keyof SessionLedger, value: number) {
  sessionLedger.update(l => {
    const current = l[field];
    if (typeof current === 'number') {
      return { ...l, [field]: current + value };
    }
    return l;
  });
}

/** Record a module visit (called from Workspace only when focused module changes) */
export function recordModuleVisit(moduleId: string) {
  sessionLedger.update(l => {
    const visited = [...l.modulesVisited, moduleId];
    // Cap at 100 entries to prevent unbounded growth
    if (visited.length > 100) visited.splice(0, visited.length - 100);
    return { ...l, modulesVisited: visited };
  });
}

// --- Recent patterns derived from session history ---

export const recentPatterns = derived(sessionHistory, ($history): RecentPatterns | null => {
  const records = $history.records;
  if (records.length < 2) return null;

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;

  // Use string comparison instead of Date construction (dates are YYYY-MM-DD, lexicographic = chronological)
  const weekAgoStr = new Date(weekAgo).toISOString().slice(0, 10);
  const twoWeeksAgoStr = new Date(twoWeeksAgo).toISOString().slice(0, 10);

  const recentRecords = records.filter(r => r.date >= weekAgoStr);
  const priorRecords = records.filter(r => r.date >= twoWeeksAgoStr && r.date < weekAgoStr);

  // Vector distribution (ms per vector, last 7 days)
  const vectorDistribution: Record<string, number> = {};
  for (const r of recentRecords) {
    if (r.vector) {
      vectorDistribution[r.vector] = (vectorDistribution[r.vector] || 0) + r.durationMs;
    }
  }

  // Average coherence (last 7 sessions with valid data)
  const validCoherence = records
    .filter(r => r.coherencePercent >= 0)
    .slice(-7);
  const averageCoherence = validCoherence.length > 0
    ? Math.round(validCoherence.reduce((s, r) => s + r.coherencePercent, 0) / validCoherence.length)
    : -1;

  // Drift trend: compare recent vs prior coherence averages
  const recentCoherence = recentRecords.filter(r => r.coherencePercent >= 0);
  const priorCoherence = priorRecords.filter(r => r.coherencePercent >= 0);
  let driftTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (recentCoherence.length >= 2 && priorCoherence.length >= 2) {
    const recentAvg = recentCoherence.reduce((s, r) => s + r.coherencePercent, 0) / recentCoherence.length;
    const priorAvg = priorCoherence.reduce((s, r) => s + r.coherencePercent, 0) / priorCoherence.length;
    if (recentAvg - priorAvg > 5) driftTrend = 'improving';
    else if (priorAvg - recentAvg > 5) driftTrend = 'worsening';
  }

  return {
    vectorDistribution,
    averageCoherence,
    driftTrend,
    sessionsThisWeek: recentRecords.length,
  };
});

// --- Watcher functions ---

/** Check if the Watcher should appear this session */
export function shouldShowWatcher(): boolean {
  const mem = get(sessionMemory);
  if (mem.totalSessions < 7) return false;
  if (mem.totalSessions % 7 !== 0) return false;
  const history = get(sessionHistory);
  const today = todayStr();
  return !history.watcherEntries.some(e => e.date === today);
}

/** Get the Watcher question for this session (deterministic by totalSessions) */
export function getWatcherQuestion(): string {
  const mem = get(sessionMemory);
  return WATCHER_QUESTIONS[Math.floor(mem.totalSessions / 7) % WATCHER_QUESTIONS.length];
}

/** Build a compressed summary of recent sessions for the Watcher display */
export function getWatcherSummary(): WatcherSummary {
  const history = get(sessionHistory);
  const recent = history.records.slice(-7);

  const totalDurationMs = recent.reduce((s, r) => s + r.durationMs, 0);
  const vectorDist: Record<string, number> = {};
  let totalWords = 0, totalSignals = 0, totalHabits = 0;
  const moduleCount: Record<string, number> = {};

  for (const r of recent) {
    if (r.vector) vectorDist[r.vector] = (vectorDist[r.vector] || 0) + r.durationMs;
    if (r.ledger) {
      totalWords += r.ledger.wordsWritten || 0;
      totalSignals += r.ledger.signalsRead || 0;
      totalHabits += r.ledger.habitsCompleted || 0;
    }
    for (const m of r.modulesVisited || []) {
      moduleCount[m] = (moduleCount[m] || 0) + 1;
    }
  }

  const validCoherence = recent.filter(r => r.coherencePercent >= 0);
  const avgCoherence = validCoherence.length > 0
    ? Math.round(validCoherence.reduce((s, r) => s + r.coherencePercent, 0) / validCoherence.length)
    : -1;

  const mostVisited = Object.entries(moduleCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([m]) => m);

  // Drift pattern from recentPatterns
  const patterns = get(recentPatterns);
  const driftPattern = patterns?.driftTrend || 'stable';

  // Previous watcher entry
  const previousWatcherEntry = history.watcherEntries.length > 0
    ? history.watcherEntries[history.watcherEntries.length - 1]
    : undefined;

  return {
    sessionCount: recent.length,
    totalDurationMs,
    vectorDistribution: vectorDist,
    avgCoherence,
    totalWordsWritten: totalWords,
    totalSignalsRead: totalSignals,
    totalHabitsCompleted: totalHabits,
    mostVisitedModules: mostVisited,
    driftPattern,
    previousWatcherEntry,
  };
}

/** Save a Watcher entry */
export function saveWatcherEntry(question: string, response: string) {
  sessionHistory.update(h => {
    const entry: WatcherEntry = {
      date: todayStr(),
      sessionNumber: get(sessionMemory).totalSessions,
      question,
      response: response.slice(0, 280),
    };
    const entries = [...h.watcherEntries, entry];
    if (entries.length > MAX_WATCHER_ENTRIES) entries.splice(0, entries.length - MAX_WATCHER_ENTRIES);
    const updated = { ...h, watcherEntries: entries };
    saveHistory(updated);
    return updated;
  });
}

/** Append a session record to history (called from saveSessionState) */
export function appendSessionRecord(record: SessionRecord) {
  sessionHistory.update(h => {
    // Dedupe: don't add if same date + sessionIndex exists
    const exists = h.records.some(r => r.date === record.date && r.sessionIndex === record.sessionIndex);
    if (exists) {
      // Update existing record
      const records = h.records.map(r =>
        r.date === record.date && r.sessionIndex === record.sessionIndex ? record : r
      );
      const updated = { ...h, records };
      saveHistory(updated);
      return updated;
    }
    const records = [...h.records, record];
    if (records.length > MAX_HISTORY_RECORDS) records.splice(0, records.length - MAX_HISTORY_RECORDS);
    const updated = { ...h, records };
    saveHistory(updated);
    return updated;
  });
}

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
    return { brightnessReduction: 0, speedReduction: 0, shapePerturbation: 0, driftLevel: 0 as 0 | 1 | 2 | 3 | 4 | 5 };
  }
  if (dm < DRIFT_MILD_MINUTES) {
    return { brightnessReduction: 0, speedReduction: 0, shapePerturbation: 0, driftLevel: 1 as 0 | 1 | 2 | 3 | 4 | 5 };
  }
  if (dm < DRIFT_MODERATE_MINUTES) {
    return { brightnessReduction: 0.025, speedReduction: 0.15, shapePerturbation: 0.3, driftLevel: 2 as 0 | 1 | 2 | 3 | 4 | 5 };
  }
  if (dm < DRIFT_SEVERE_MINUTES) {
    return { brightnessReduction: 0.025, speedReduction: 0.15, shapePerturbation: 0.3, driftLevel: 3 as 0 | 1 | 2 | 3 | 4 | 5 };
  }
  if (dm < DRIFT_TERMINAL_MINUTES) {
    return { brightnessReduction: 0.05, speedReduction: 0.25, shapePerturbation: 0.6, driftLevel: 4 as 0 | 1 | 2 | 3 | 4 | 5 };
  }
  return { brightnessReduction: 0.07, speedReduction: 0.35, shapePerturbation: 0.8, driftLevel: 5 as 0 | 1 | 2 | 3 | 4 | 5 };
});

export interface SealSummary {
  duration: string;
  vector: SessionVector;
  coherencePercent: number; // -1 if insufficient data
  ledger: SessionLedger;
  closingPhrase: string;
  sessionMs: number; // raw milliseconds for threshold check
}

/** Build a structured seal summary from current session state */
export function buildSealSummary(sessionStartTime: number): SealSummary {
  const now = Date.now();
  const sessionMs = now - sessionStartTime;
  const duration = formatDurationShort(sessionMs);
  const vector = get(sessionVector);
  const cs = get(coherenceState);
  const ledger = get(sessionLedger);

  const coherencePercent = (vector && vector !== 'BROWSE' && cs.totalFocusedMs > 60000)
    ? Math.round(cs.ratio * 100)
    : -1;

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
  const closingPhrase = closingPhrases[hash % closingPhrases.length];

  return { duration, vector, coherencePercent, ledger, closingPhrase, sessionMs };
}

/** Generate the seal message for status bar (used for passive/auto-seal on tab blur) */
export function sealSession(sessionStartTime: number) {
  const summary = buildSealSummary(sessionStartTime);

  const parts = [`SESSION SEALED — ${summary.duration}`];
  if (summary.vector) parts.push(`VECTOR: ${summary.vector}`);
  if (summary.coherencePercent >= 0) parts.push(`${summary.coherencePercent}% COHERENT`);
  parts.push(summary.closingPhrase);

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
  if (!vec || vec === 'BROWSE') return;

  const aligned = VECTOR_MODULES[vec] || [];
  const now = Date.now();

  coherenceState.update(cs => {
    const elapsed = now - cs.lastUpdateTime;
    if (elapsed <= 0 || elapsed > 5000) {
      return { ...cs, lastUpdateTime: now };
    }

    const isAligned = focusedModule ? aligned.includes(focusedModule) : false;
    const isFocused = !!focusedModule;

    let { vectorAlignedMs, totalFocusedMs, driftMinutes } = cs;

    if (isFocused) {
      totalFocusedMs += elapsed;
      if (isAligned) {
        vectorAlignedMs += elapsed;
        driftMinutes = Math.max(0, driftMinutes - (elapsed / 120000) * driftMinutes);
      } else {
        driftMinutes += elapsed / 60000;
      }
    }

    const ratio = totalFocusedMs > 0 ? vectorAlignedMs / totalFocusedMs : 1;

    // Skip store notification if drift level hasn't crossed a threshold boundary
    // This prevents driftModifiers derived store from cascading every second
    const oldDriftLevel = cs.driftMinutes < DRIFT_GRACE_MINUTES ? 0 : cs.driftMinutes < DRIFT_MILD_MINUTES ? 1 : cs.driftMinutes < DRIFT_MODERATE_MINUTES ? 2 : cs.driftMinutes < DRIFT_SEVERE_MINUTES ? 3 : cs.driftMinutes < DRIFT_TERMINAL_MINUTES ? 4 : 5;
    const newDriftLevel = driftMinutes < DRIFT_GRACE_MINUTES ? 0 : driftMinutes < DRIFT_MILD_MINUTES ? 1 : driftMinutes < DRIFT_MODERATE_MINUTES ? 2 : driftMinutes < DRIFT_SEVERE_MINUTES ? 3 : driftMinutes < DRIFT_TERMINAL_MINUTES ? 4 : 5;
    const ratioChanged = Math.abs(ratio - cs.ratio) > 0.01;

    if (!isFocused && oldDriftLevel === newDriftLevel && !ratioChanged) {
      // Nothing meaningful changed — update timestamp but don't trigger derived stores
      cs.lastUpdateTime = now;
      return cs; // Same reference = Svelte skips notification
    }

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
  sessionPeakDrift = 0;
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
    lastLedger: prev.lastLedger || defaultLedger(),
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

/** Track peak drift for session records */
let sessionPeakDrift = 0;

/** Save current session state (call periodically and on unload) */
export function saveSessionState(openWindowIds: string[], sessionStartTime: number) {
  const now = Date.now();
  const duration = now - sessionStartTime;
  const currentVector = get(sessionVector);
  const coherencePercent = getCoherencePercent();
  const ledger = get(sessionLedger);
  const cs = get(coherenceState);

  // Track peak drift
  if (cs.driftMinutes > sessionPeakDrift) {
    sessionPeakDrift = cs.driftMinutes;
  }

  sessionMemory.update(s => {
    const updated = {
      ...s,
      lastVisit: now,
      lastSessionDuration: duration,
      lastWindowsOpen: openWindowIds,
      lastVector: currentVector || s.lastVector,
      lastCoherence: coherencePercent >= 0 ? coherencePercent : s.lastCoherence,
      lastLedger: ledger,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch { /* quota */ }
    return updated;
  });

  // Append to session history (only for sessions > 60 seconds)
  if (duration > 60000) {
    const today = todayStr();
    const history = get(sessionHistory);
    const todayRecords = history.records.filter(r => r.date === today);
    const sessionIndex = todayRecords.length;

    // Dedupe unique modules
    const uniqueModules = ledger.modulesVisited
      .filter((m, i, arr) => i === 0 || arr[i - 1] !== m)
      .filter((m, i, arr) => arr.indexOf(m) === i);

    appendSessionRecord({
      date: today,
      sessionIndex,
      vector: currentVector,
      durationMs: duration,
      coherencePercent,
      ledger: { ...ledger },
      driftPeakMinutes: Math.round(sessionPeakDrift * 10) / 10,
      modulesVisited: uniqueModules.slice(0, 20),
    });
  }
}

/** Update time of day (call on a 1-minute interval) */
export function updateTimeOfDay() {
  timeOfDay.set(getTimeOfDay());
}
