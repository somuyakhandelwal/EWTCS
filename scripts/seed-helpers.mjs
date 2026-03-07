/**
 * seed-helpers.mjs
 * Shared utility functions for the EWTCS seed scripts.
 */

export const rand    = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick    = (arr)  => arr[Math.floor(Math.random() * arr.length)];
export const minsAgo = (m)    => new Date(Date.now() - m * 60000);
export const addMins = (d, m) => new Date(d.getTime() + m * 60000);

/**
 * Returns the shift id that covers the given date.
 * Morning 06:00–14:00 · Evening 14:00–22:00 · Night 22:00–06:00
 */
export function shiftFor(date, shifts) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6  && h < 14) return shifts.find(s => s.name === 'Morning')?.id ?? null;
  if (h >= 14 && h < 22) return shifts.find(s => s.name === 'Evening')?.id ?? null;
  return shifts.find(s => s.name === 'Night')?.id ?? null;
}
