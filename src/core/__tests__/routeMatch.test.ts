import { mostSimilar, overlap } from '../routeMatch';
import { buildRoad, MADRID } from '../../test/helpers';

// Two ways from the same start to roughly the same finish: over the hill or round the valley.
const hill = buildRoad([
  { straight: 500 },
  { turn: 'L', radius: 200, angle: 60 },
  { turn: 'R', radius: 200, angle: 120 },
]);
const valley = buildRoad([{ straight: 500 }, { turn: 'R', radius: 300, angle: 60 }, { straight: 600 }]);

describe('overlap', () => {
  it('is 1 for the same route and works in reverse', () => {
    expect(overlap(hill, hill)).toBe(1);
    expect(overlap(hill, [...hill].reverse())).toBe(1);
  });

  it('is partial for routes sharing only the start', () => {
    const o = overlap(hill, valley);
    expect(o).toBeGreaterThan(0.2);
    expect(o).toBeLessThan(0.7);
  });
});

describe('mostSimilar', () => {
  it('keeps the chosen route after reversing start and finish', () => {
    const reversed = [[...valley].reverse(), [...hill].reverse()];
    expect(mostSimilar(reversed, hill)).toBe(1);
    expect(mostSimilar(reversed, valley)).toBe(0);
  });

  it('handles a single candidate', () => {
    expect(mostSimilar([[MADRID]], hill)).toBe(0);
  });
});
