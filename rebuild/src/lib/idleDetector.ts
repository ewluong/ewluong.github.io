/**
 * Idle Detector — tracks user activity and exports isIdle store.
 * Triggers after configurable timeout of no mouse/keyboard/touch input.
 */

import { writable } from 'svelte/store';

const STORAGE_KEY = 'ewluong-os-screensaver';
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const isIdle = writable(false);

let timeout: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function getTimeout(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.timeout ?? DEFAULT_TIMEOUT;
  } catch {
    return DEFAULT_TIMEOUT;
  }
}

function resetTimer() {
  isIdle.set(false);
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    isIdle.set(true);
  }, getTimeout());
}

export function initIdleDetector() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  for (const event of events) {
    window.addEventListener(event, resetTimer, { passive: true });
  }
  resetTimer();
}

export function destroyIdleDetector() {
  if (!initialized || typeof window === 'undefined') return;
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  for (const event of events) {
    window.removeEventListener(event, resetTimer);
  }
  if (timeout) clearTimeout(timeout);
  initialized = false;
}
