/**
 * Palimpsest store — the canvas remembers.
 *
 * The Ledger Pulse: module activity creates real-time marks on the canvas.
 * Words produce horizontal lines that fill like a page. Signals flash as dots.
 * Habits expand as ripple rings. Coherence encodes quality — focused sessions
 * leave clean parallel marks, drifted sessions leave scattered fragments.
 *
 * Live marks (this session) render at higher opacity, then settle into the
 * archive layer over ~60 seconds. Past days' marks fade over 7 days.
 */

import { writable, get } from 'svelte/store';
import { sessionVector, sessionLedger, coherenceState, type SessionVector, type SessionLedger } from './temporal';
import { silenceActive } from './silence';

// --- Interfaces ---

export interface PalimpsestMark {
  type: 'line' | 'node' | 'ripple' | 'dot';
  x: number;      // 0-1 normalized
  y: number;      // 0-1 normalized
  intensity: number;  // 0-1
  angle?: number;     // radians, for lines
  radius?: number;    // 0-1 normalized, for ripples
}

export interface LiveMark extends PalimpsestMark {
  birthFrame: number;
}

export interface PalimpsestDay {
  date: string;       // YYYY-MM-DD
  vector: SessionVector;
  marks: PalimpsestMark[];
  durationMs: number;
}

// --- Constants ---

const STORAGE_KEY = 'ewluong-os-palimpsest';
const MAX_DAYS = 7;
const MAX_MARKS_PER_DAY = 120;
const MAX_LIVE_MARKS = 200;

// --- Persistence ---

function loadPalimpsest(): PalimpsestDay[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const days: PalimpsestDay[] = JSON.parse(stored);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return days.filter(d => d.date >= cutoffStr);
  } catch {
    return [];
  }
}

function savePalimpsest(days: PalimpsestDay[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  } catch { /* quota */ }
}

// --- Frame tracking (set by CanvasBackground each render) ---

let currentFrame = 0;
export function setCurrentFrame(f: number) { currentFrame = f; }
export function getCurrentFrame(): number { return currentFrame; }

// --- Stores ---

/** Archived marks from past days */
export const palimpsestDays = writable<PalimpsestDay[]>(loadPalimpsest());

/** Live marks from current session — higher opacity, settling over time */
export const liveMarks = writable<LiveMark[]>([]);

// --- Coherence-aware quality ---

type MarkQuality = 'clean' | 'normal' | 'scattered';

function getCoherenceQuality(): MarkQuality {
  const cs = get(coherenceState);
  if (cs.totalFocusedMs < 60000) return 'normal';
  if (cs.ratio > 0.75) return 'clean';
  if (cs.ratio < 0.40) return 'scattered';
  return 'normal';
}

// --- Word mark Y progression (fills page-like) ---

let wordMarkY = 0.25;

/** Reset live state for a new session */
export function resetLiveMarks() {
  liveMarks.set([]);
  wordMarkY = 0.25;
}

// --- Pulse emitters (one per activity type) ---

function addLiveMark(mark: PalimpsestMark) {
  liveMarks.update(marks => {
    const next = [...marks, { ...mark, birthFrame: currentFrame }];
    // Cap to prevent unbounded growth
    return next.length > MAX_LIVE_MARKS ? next.slice(-MAX_LIVE_MARKS) : next;
  });
}

function emitWordPulse(count: number) {
  const quality = getCoherenceQuality();
  const markCount = Math.min(3, Math.ceil(count / 20));

  for (let i = 0; i < markCount; i++) {
    const angleVariance = quality === 'clean' ? 0.03 : quality === 'scattered' ? 0.3 : 0.1;
    addLiveMark({
      type: 'line',
      x: 0.18 + Math.random() * 0.28,
      y: wordMarkY + (Math.random() - 0.5) * 0.02,
      intensity: quality === 'clean' ? 0.7 + Math.random() * 0.2 : quality === 'scattered' ? 0.2 + Math.random() * 0.3 : 0.4 + Math.random() * 0.4,
      angle: (Math.random() - 0.5) * angleVariance,
    });
    wordMarkY += 0.008;
    if (wordMarkY > 0.75) wordMarkY = 0.25;
  }
}

function emitSignalPulse() {
  const quality = getCoherenceQuality();
  const spread = quality === 'clean' ? 0.3 : quality === 'scattered' ? 0.7 : 0.5;
  const cx = quality === 'clean' ? 0.5 : 0.15 + Math.random() * 0.7;
  const cy = quality === 'clean' ? 0.5 : 0.15 + Math.random() * 0.7;

  addLiveMark({
    type: 'dot',
    x: cx + (Math.random() - 0.5) * spread,
    y: cy + (Math.random() - 0.5) * spread,
    intensity: 0.5 + Math.random() * 0.4,
  });
}

function emitHabitPulse() {
  // Habits are inherently aligned — always clean ripples from center
  addLiveMark({
    type: 'ripple',
    x: 0.4 + Math.random() * 0.2,
    y: 0.35 + Math.random() * 0.3,
    intensity: 0.6 + Math.random() * 0.3,
    radius: 0.04 + Math.random() * 0.06,
  });
}

function emitChatPulse() {
  const quality = getCoherenceQuality();
  const baseX = quality === 'scattered' ? 0.2 + Math.random() * 0.6 : 0.55 + Math.random() * 0.25;

  addLiveMark({
    type: 'node',
    x: baseX,
    y: 0.2 + Math.random() * 0.6,
    intensity: quality === 'clean' ? 0.6 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4,
  });
}

function emitScratchPulse() {
  addLiveMark({
    type: 'dot',
    x: 0.85 + Math.random() * 0.1,
    y: 0.2 + Math.random() * 0.6,
    intensity: 0.2 + Math.random() * 0.3,
  });
}

// --- Ledger subscription: detect activity deltas and emit pulses ---

function defaultSnapshot(): SessionLedger {
  return { wordsWritten: 0, signalsRead: 0, habitsCompleted: 0, chatMessages: 0, modulesVisited: [], scratchpadChars: 0, silenceMs: 0 };
}

let lastLedgerSnapshot: SessionLedger = defaultSnapshot();
let ledgerSubInitialized = false;

if (typeof window !== 'undefined') {
  sessionLedger.subscribe(ledger => {
    // Skip the initial subscription call (store initialization)
    if (!ledgerSubInitialized) {
      lastLedgerSnapshot = { ...ledger };
      ledgerSubInitialized = true;
      return;
    }

    // Don't emit marks during silence
    if (get(silenceActive)) {
      lastLedgerSnapshot = { ...ledger };
      return;
    }

    const wordDelta = ledger.wordsWritten - lastLedgerSnapshot.wordsWritten;
    const signalDelta = ledger.signalsRead - lastLedgerSnapshot.signalsRead;
    const habitDelta = ledger.habitsCompleted - lastLedgerSnapshot.habitsCompleted;
    const chatDelta = ledger.chatMessages - lastLedgerSnapshot.chatMessages;
    const scratchDelta = ledger.scratchpadChars - lastLedgerSnapshot.scratchpadChars;

    if (wordDelta > 0) emitWordPulse(wordDelta);
    if (signalDelta > 0) emitSignalPulse();
    if (habitDelta > 0) emitHabitPulse();
    if (chatDelta > 0) emitChatPulse();
    if (scratchDelta > 0) emitScratchPulse();

    lastLedgerSnapshot = { ...ledger };
  });
}

// --- Session end: settle live marks into archive ---

/** Transfer live marks to today's archived day, then clear live marks */
export function settleLiveMarks(durationMs: number) {
  const marks = get(liveMarks);
  if (marks.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const vector = get(sessionVector);

  // Convert LiveMarks to PalimpsestMarks (strip birthFrame)
  const archived: PalimpsestMark[] = marks.map(({ birthFrame, ...rest }) => rest);

  palimpsestDays.update(days => {
    const existing = days.find(d => d.date === today);
    if (existing) {
      const merged = [...existing.marks, ...archived].slice(0, MAX_MARKS_PER_DAY);
      existing.marks = merged;
      existing.durationMs += durationMs;
      if (vector) existing.vector = vector;
    } else {
      days.push({
        date: today,
        vector,
        marks: archived.slice(0, MAX_MARKS_PER_DAY),
        durationMs,
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const pruned = days.filter(d => d.date >= cutoffStr);

    savePalimpsest(pruned);
    return pruned;
  });

  liveMarks.set([]);
}
