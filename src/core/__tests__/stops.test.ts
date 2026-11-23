import { insertStop, reverseStops } from '../stops';
import { MADRID, offset } from '../../test/helpers';

const at = (km: number, lateral = 0) => offset(offset(MADRID, km * 1000, 90), lateral, 0);

describe('insertStop', () => {
  it('first two taps are start and finish', () => {
    expect(insertStop(insertStop([], at(0)), at(10))).toEqual([at(0), at(10)]);
  });

  it('puts a via point in the leg it belongs to', () => {
    const stops = [at(0), at(5, 300), at(10)];
    expect(insertStop(stops, at(2, 500))).toEqual([at(0), at(2, 500), at(5, 300), at(10)]);
    expect(insertStop(stops, at(8, -400))).toEqual([at(0), at(5, 300), at(8, -400), at(10)]);
  });
});

describe('reverseStops', () => {
  it('swaps start and finish and keeps vias in order', () => {
    expect(reverseStops([at(0), at(1), at(2)])).toEqual([at(2), at(1), at(0)]);
  });
});
