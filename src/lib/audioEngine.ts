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

  if (audioContext?.state === 'suspended') {
    await audioContext.resume();
  }

  await audioElement.play();
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
      requestAnimationFrame(fadeOut);
    } else {
      smoothedRms = 0;
      rmsLevel.set(0);
    }
  };
  fadeOut();
}

export function seek(fraction: number) {
  if (!audioElement) return;
  audioElement.currentTime = fraction * audioElement.duration;
}

export function setTrack(src: string) {
  if (!audioElement) return;
  const wasPlaying = !audioElement.paused;
  audioElement.src = src;
  audioElement.load();
  if (wasPlaying) {
    play();
  }
}

export function destroy() {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId);
  audioContext?.close();
  audioContext = null;
  analyser = null;
  source = null;
  audioElement = null;
}
