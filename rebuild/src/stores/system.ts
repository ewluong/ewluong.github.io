/**
 * System store — core OS state.
 * Boot status, system messages, global flags, runtime metrics.
 */

import { writable, derived } from 'svelte/store';

export type BootPhase = 'off' | 'booting' | 'ready';

export const bootPhase = writable<BootPhase>('off');
export const bootMessages = writable<string[]>([]);
export const statusMessage = writable('just chasing the wind...');

/** Timestamp when boot sequence completed */
export const bootTime = writable<number>(0);

/** Runtime stats for MAGI panel and status bar */
export const systemStats = writable({
  bootTime: 0,
  windowsOpened: 0,
  tracksPlayed: 0,
});
