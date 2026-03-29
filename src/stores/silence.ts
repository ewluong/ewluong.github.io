/**
 * Silence store — the threshold steps aside.
 * A global mode that strips the workspace to radical emptiness.
 * Only clock, palimpsest traces, and vignette remain.
 */

import { writable, get } from 'svelte/store';
import { playSilenceEnter, playSilenceExit } from '../lib/uiSounds';

/** Whether silence mode is currently active */
export const silenceActive = writable(false);

/** True during the 3-second enter/exit transition */
export const silenceTransitioning = writable(false);

/** Timestamp when silence was last entered (for elapsed tracking) */
export const silenceEnteredAt = writable(0);

const TRANSITION_MS = 3000;

export function enterSilence() {
  if (get(silenceActive)) return;
  silenceTransitioning.set(true);
  silenceActive.set(true);
  silenceEnteredAt.set(Date.now());
  playSilenceEnter();
  setTimeout(() => silenceTransitioning.set(false), TRANSITION_MS);
}

export function exitSilence() {
  if (!get(silenceActive)) return;
  silenceTransitioning.set(true);
  silenceActive.set(false);
  playSilenceExit();
  setTimeout(() => silenceTransitioning.set(false), TRANSITION_MS);
}

export function toggleSilence() {
  if (get(silenceActive)) exitSilence();
  else enterSilence();
}
