/**
 * UI Sound Engine — synthesized audio feedback for ewluong.os.
 * All sounds generated via Web Audio API oscillators. Zero mp3 files.
 * Separate AudioContext from the music engine to avoid coupling.
 */

import { get } from 'svelte/store';
import { soundSettings } from '../stores/sound';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function getVolume(): number {
  const s = get(soundSettings);
  if (!s.enabled) return 0;
  return s.volume;
}

/** Play a tone at given frequency for given duration */
function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volumeMul = 1.0,
  startOffset = 0,
) {
  const ac = getCtx();
  if (!ac) return;
  const vol = getVolume() * volumeMul;
  if (vol <= 0) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol * 0.15, ac.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + startOffset);
  osc.stop(ac.currentTime + startOffset + duration + 0.01);
}

/** Noise burst through a bandpass filter */
function noiseBurst(duration: number, centerFreq: number, volumeMul = 1.0) {
  const ac = getCtx();
  if (!ac) return;
  const vol = getVolume() * volumeMul;
  if (vol <= 0) return;

  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ac.createBufferSource();
  source.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = centerFreq;
  filter.Q.value = 2;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol * 0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start();
  source.stop(ac.currentTime + duration + 0.01);
}

// --- Public sound functions ---

/** Window open — two ascending tones */
export function playOpen() {
  tone(440, 0.08, 'sine', 0.8, 0);
  tone(660, 0.08, 'sine', 0.8, 0.06);
}

/** Window close — two descending tones */
export function playClose() {
  tone(660, 0.08, 'sine', 0.7, 0);
  tone(440, 0.08, 'sine', 0.7, 0.06);
}

/** Window focus / dock click — subtle tick */
export function playClick() {
  tone(1200, 0.025, 'square', 0.3);
}

/** Boot sequence — ascending C4-E4-G4-C5 */
export function playBoot() {
  tone(262, 0.15, 'sine', 0.6, 0);
  tone(330, 0.15, 'sine', 0.6, 0.12);
  tone(392, 0.15, 'sine', 0.6, 0.24);
  tone(523, 0.2, 'sine', 0.8, 0.36);
}

/** Alert / timer complete — NERV alarm tone */
export function playAlert() {
  tone(800, 0.2, 'sawtooth', 0.5, 0);
  tone(600, 0.2, 'sawtooth', 0.5, 0.2);
  tone(800, 0.2, 'sawtooth', 0.5, 0.4);
}

/** Command palette open — filtered noise whoosh */
export function playPaletteOpen() {
  noiseBurst(0.06, 2000, 0.5);
}

/** Error sound — low buzz */
export function playError() {
  tone(120, 0.15, 'sawtooth', 0.4);
}

/** Close the AudioContext and release resources */
export function destroySoundEngine() {
  if (ctx) {
    ctx.close().catch(() => {});
    ctx = null;
  }
}
