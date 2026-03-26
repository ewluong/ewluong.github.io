/**
 * Weather store — current weather conditions for canvas reactivity.
 */

import { writable } from 'svelte/store';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'thunderstorm' | 'fog' | 'unknown';

export interface WeatherState {
  temp: number | null;        // Celsius
  condition: WeatherCondition;
  isNight: boolean;
  location: string;
  lastFetch: number;          // timestamp
}

export const weather = writable<WeatherState>({
  temp: null,
  condition: 'unknown',
  isNight: false,
  location: '',
  lastFetch: 0,
});
