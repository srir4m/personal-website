/**
 * Approximate subsolar point for a moment in time: good to about a degree, which is
 * plenty for a hatched day/night terminator.
 */
export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86_400_000;
  const lat = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = ((((12 - utcHours) * 15 + 540) % 360) - 180);
  return { lat, lng };
}
