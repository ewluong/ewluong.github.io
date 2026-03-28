/**
 * Environment store — drives atmospheric modifiers across the system.
 * When certain windows are focused, the environment responds.
 */

import { writable, derived } from 'svelte/store';

export type EnvironmentMode = 'default' | 'focus' | 'music';

export const environmentMode = writable<EnvironmentMode>('default');

export const envModifiers = derived(environmentMode, ($mode) => ({
  /** Canvas shape opacity multiplier */
  canvasDim: $mode === 'focus' ? 0.6 : 1.0,
  /** Shape velocity multiplier */
  shapeSpeed: 1.0,
  /** Scanline overlay intensity */
  scanlineIntensity: 0.03,
  /** Audio pulse multiplier for shapes */
  shapePulse: $mode === 'music' ? 2.0 : 1.0,
  /** Overall workspace brightness */
  brightness: $mode === 'focus' ? 0.92 : 1.0,
}));
