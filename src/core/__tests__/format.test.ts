import { formatKm, formatTime } from '../format';

describe('formatKm', () => {
  it.each([
    [850, '850 m'],
    [14321, '14,3 km'],
  ])('%i → %s', (m, out) => expect(formatKm(m)).toBe(out));
});

describe('formatTime', () => {
  it.each([
    [48.34, '48,3'],
    [725.66, '12:05,7'],
    [59.96, '1:00,0'],
    [600, '10:00,0'],
  ])('%f → %s', (s, out) => expect(formatTime(s)).toBe(out));
});
