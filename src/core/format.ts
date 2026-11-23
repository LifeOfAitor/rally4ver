/** "850 m" below 1 km, "12,4 km" above. */
export function formatKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Stage time: "48,3" under a minute, "12:05,7" above. */
export function formatTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const m = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  const s = rest.toFixed(1).replace('.', ',');
  return m > 0 ? `${m}:${rest < 10 ? '0' : ''}${s}` : s;
}
