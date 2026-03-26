/**
 * Audio Engine — Web Audio API pipeline.
 * Creates AudioContext, AnalyserNode, and computes RMS.
 * This is a singleton service; import and call init() once.
 */

import { rmsLevel, frequencyData, isPlaying } from '../stores/audio';

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let animFrameId: number | null = null;
let fadeFrameId: number | null = null;
let smoothedRms = 0;

const FFT_SIZE = 256;
const SMOOTHING = 0.85;
const RMS_SMOOTHING = 0.15; // Low-pass filter on RMS so shapes breathe, not twitch

export function getAudioElement(): HTMLAudioElement | null {
  return audioElement;
}

export function init(element: HTMLAudioElement) {
  audioElement = element;

  // Listen for play/pause to update store
  element.addEventListener('play', () => isPlaying.set(true));
  element.addEventListener('pause', () => isPlaying.set(false));
  element.addEventListener('ended', () => isPlaying.set(false));
}

function ensureContext() {
  if (audioContext) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = SMOOTHING;

  if (audioElement) {
    source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }
}

function analyse() {
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  // Compute RMS from frequency data
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    const normalized = dataArray[i] / 255;
    sum += normalized * normalized;
  }
  const rawRms = Math.sqrt(sum / bufferLength);

  // Smooth RMS with low-pass filter
  smoothedRms += (rawRms - smoothedRms) * RMS_SMOOTHING;

  rmsLevel.set(smoothedRms);
  frequencyData.set(dataArray);

  animFrameId = requestAnimationFrame(analyse);
}

export async function play() {
  if (!audioElement) return;
  ensureContext();

  // Cancel any fadeOut in progress
  if (fadeFrameId !== null) {
    cancelAnimationFrame(fadeFrameId);
    fadeFrameId = null;
  }

  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }

  try {
    await audioElement.play();
  } catch {
    // play() can throw if interrupted by another load — safe to ignore
    return;
  }

  // Always ensure analysis loop is running
  if (animFrameId === null) {
    analyse();
  }
}

export function pause() {
  audioElement?.pause();
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  // Fade RMS to zero smoothly
  const fadeOut = () => {
    smoothedRms *= 0.9;
    if (smoothedRms > 0.001) {
      rmsLevel.set(smoothedRms);
      fadeFrameId = requestAnimationFrame(fadeOut);
    } else {
      smoothedRms = 0;
      rmsLevel.set(0);
      fadeFrameId = null;
    }
  };
  fadeOut();
}

export function seek(fraction: number) {
  if (!audioElement || !Number.isFinite(fraction)) return;
  const clamped = Math.max(0, Math.min(1, fraction));
  const duration = audioElement.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  audioElement.currentTime = clamped * duration;
}

export function setTrack(src: string) {
  if (!audioElement) return;

  // Stop current analysis while switching
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (fadeFrameId !== null) {
    cancelAnimationFrame(fadeFrameId);
    fadeFrameId = null;
  }

  audioElement.src = src;
  audioElement.load();

  // Wait for audio to be ready, then play
  audioElement.addEventListener('canplay', function onCanPlay() {
    audioElement!.removeEventListener('canplay', onCanPlay);
    play();
  }, { once: true });
}

export function destroy() {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId);
  audioContext?.close();
  audioContext = null;
  analyser = null;
  source = null;
  audioElement = null;
}
