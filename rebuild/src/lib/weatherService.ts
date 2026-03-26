/**
 * Weather Service — fetches from wttr.in and updates the weather store.
 * No API key required. Caches to localStorage.
 */

import { weather, type WeatherCondition } from '../stores/weather';

const STORAGE_KEY = 'ewluong-os-weather';
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  temp: number;
  condition: WeatherCondition;
  isNight: boolean;
  location: string;
  lastFetch: number;
}

function mapConditionCode(code: number): WeatherCondition {
  // wttr.in WWO weather codes
  if (code === 113) return 'clear';
  if (code === 116 || code === 119 || code === 122) return 'cloudy';
  if (code === 143 || code === 248 || code === 260) return 'fog';
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(code)) return 'rain';
  if ([200, 386, 389, 392, 395].includes(code)) return 'thunderstorm';
  if ([179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(code)) return 'snow';
  return 'cloudy';
}

function loadCache(): CachedWeather | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCache(data: CachedWeather) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export async function fetchWeather() {
  // Check cache first
  const cached = loadCache();
  if (cached && Date.now() - cached.lastFetch < CACHE_MS) {
    weather.set({
      temp: cached.temp,
      condition: cached.condition,
      isNight: isCurrentlyNight(),
      location: cached.location,
      lastFetch: cached.lastFetch,
    });
    return;
  }

  try {
    const res = await fetch('https://wttr.in/?format=j1', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const current = data.current_condition?.[0];
    if (!current) throw new Error('No current condition');

    const tempRaw = parseInt(current.temp_C, 10);
    const temp = Number.isFinite(tempRaw) ? tempRaw : 0;
    const codeRaw = parseInt(current.weatherCode, 10);
    const code = Number.isFinite(codeRaw) ? codeRaw : 0;
    const condition = mapConditionCode(code);
    const location = data.nearest_area?.[0]?.areaName?.[0]?.value ?? '';
    const night = isCurrentlyNight();

    const state: CachedWeather = { temp, condition, isNight: night, location, lastFetch: Date.now() };
    saveCache(state);

    weather.set({
      temp,
      condition,
      isNight: night,
      location,
      lastFetch: Date.now(),
    });
  } catch {
    // Use cache if available, otherwise leave as unknown
    if (cached) {
      weather.set({
        temp: cached.temp,
        condition: cached.condition,
        isNight: isCurrentlyNight(),
        location: cached.location,
        lastFetch: cached.lastFetch,
      });
    }
  }
}

function isCurrentlyNight(): boolean {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 20;
}
