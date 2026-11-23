import { distanceMeters } from '../geo';
import { farthestPoint, hasRetrace, viaCandidates, withoutDetours } from '../alternatives';
import { buildRoad, MADRID, offset } from '../../test/helpers';

describe('viaCandidates', () => {
  it('gives points on both sides of A→B', () => {
    const b = offset(MADRID, 10_000, 90); // due east
    const vias = viaCandidates(MADRID, b, 0.12);
    expect(vias).toHaveLength(6);
    const north = vias.filter((v) => v.latitude > MADRID.latitude).length;
    expect(north).toBe(3);
    for (const v of vias) expect(Math.abs(distanceMeters(MADRID, v) - distanceMeters(b, v))).toBeLessThan(4000);
  });
});

describe('hasRetrace', () => {
  it('detects a drive into a dead end and back', () => {
    const deadEnd = buildRoad([{ straight: 500 }, { turn: 'L', radius: 2, angle: 180 }, { straight: 500 }]);
    expect(hasRetrace(deadEnd)).toBe(true);
  });

  it('does not flag hairpins or normal bends', () => {
    const hairpins = buildRoad([
      { straight: 200 },
      { turn: 'L', radius: 25, angle: 180 },
      { straight: 200 },
      { turn: 'R', radius: 25, angle: 180 },
      { straight: 200 },
    ]);
    expect(hasRetrace(hairpins)).toBe(false);
    expect(hasRetrace(buildRoad([{ straight: 300 }, { turn: 'R', radius: 60, angle: 90 }, { straight: 300 }]))).toBe(
      false,
    );
  });
});

describe('withoutDetours', () => {
  it('cuts an out-and-back stretch', () => {
    const road = buildRoad([
      { straight: 400 },
      { turn: 'L', radius: 0.1, angle: 90 },
      { straight: 300 },
      { turn: 'L', radius: 5, angle: 180 },
      { straight: 300 },
      { turn: 'L', radius: 0.1, angle: 90 },
      { straight: 400 },
    ]);
    const len = (r: typeof road) => r.slice(1).reduce((s, p, i) => s + distanceMeters(r[i], p), 0);
    expect(len(withoutDetours(road))).toBeLessThan(len(road) - 400);
  });
});

describe('farthestPoint', () => {
  it('finds where a route leaves the known one', () => {
    const straight = buildRoad([{ straight: 2000 }]);
    const detour = buildRoad([
      { turn: 'L', radius: 500, angle: 30 },
      { turn: 'R', radius: 500, angle: 60 },
      { turn: 'L', radius: 500, angle: 30 },
    ]);
    const { distance } = farthestPoint(detour, [straight]);
    expect(distance).toBeGreaterThan(80);
    expect(farthestPoint(straight, [straight]).distance).toBeLessThan(30);
  });
});
