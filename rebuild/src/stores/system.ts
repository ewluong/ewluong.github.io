/**
 * System store — core OS state.
 * Boot status, system messages, global flags.
 */

import { writable, derived } from 'svelte/store';

export type BootPhase = 'off' | 'booting' | 'ready';

export const bootPhase = writable<BootPhase>('off');
export const bootMessages = writable<string[]>([]);
export const statusMessage = writable('just chasing the wind...');
