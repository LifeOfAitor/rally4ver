import { distanceMeters } from '../geo';
import { buildPath, curvatures, resample } from '../path';
import { buildRoad, MADRID, offset } from '../../test/helpers';

describe('resample', () => {
  it('emits evenly spaced points with cumulative distance', () => {
    const pts = resample([{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: 8, y: 12 }], 5);
    expect(pts.map((p) => p.s)).toEqual([0, 5, 10, 15, 20]);
    expect(pts[3]).toMatchObject({ x: 3, y: 12 });
  });

  it('keeps a short final remainder', () => {
    const pts = resample([{ x: 0, y: 0 }, { x: 0, y: 12 }], 5);
    expect(pts[pts.length - 1].s).toBeCloseTo(12);
  });
});

describe('buildPath', () => {
  it('measures the route length', () => {
    const path = buildPath([MADRID, offset(MADRID, 1000, 70)]);
    expect(path.length).toBeCloseTo(distanceMeters(MADRID, offset(MADRID, 1000, 70)), -1);
  });
});

describe('curvatures', () => {
  it('is ~0 on a straight', () => {
    const k = curvatures(buildPath(buildRoad([{ straight: 300 }])));
    expect(Math.max(...k.map(Math.abs))).toBeLessThan(1e-4);
  });

  it.each([30, 60, 120])('recovers the radius of a %i m arc', (radius) => {
    const path = buildPath(buildRoad([{ straight: 100 }, { turn: 'R', radius, angle: 120 }, { straight: 100 }]));
    const k = curvatures(path);
    const peak = Math.max(...k);
    expect(1 / peak).toBeGreaterThan(radius * 0.9);
    expect(1 / peak).toBeLessThan(radius * 1.1);
  });

  it('is negative for left turns', () => {
    const k = curvatures(buildPath(buildRoad([{ straight: 50 }, { turn: 'L', radius: 50, angle: 90 }, { straight: 50 }])));
    expect(Math.min(...k)).toBeLessThan(-1 / 60);
    expect(Math.max(...k)).toBeLessThan(1e-4);
  });
});
