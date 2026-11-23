import { parseOsrm } from '../routing';

describe('parseOsrm', () => {
  it('extracts geometry and meaningful maneuvers', () => {
    const [route] = parseOsrm({
      code: 'Ok',
      routes: [
        {
          distance: 1234,
          duration: 90,
          geometry: {
            coordinates: [
              [-3.7, 40.4],
              [-3.71, 40.41],
            ],
          },
          legs: [
            {
              steps: [
                { name: 'Calle A', distance: 100, maneuver: { location: [-3.7, 40.4], type: 'depart' } },
                {
                  name: 'M-601',
                  ref: 'M-601',
                  distance: 800,
                  maneuver: { location: [-3.705, 40.405], type: 'turn', modifier: 'left' },
                },
                { name: 'M-601', maneuver: { location: [-3.708, 40.408], type: 'new name' } },
                { name: '', maneuver: { location: [-3.71, 40.41], type: 'arrive' } },
              ],
            },
          ],
        },
      ],
    });
    expect(route.coordinates).toEqual([
      { latitude: 40.4, longitude: -3.7 },
      { latitude: 40.41, longitude: -3.71 },
    ]);
    expect(route.summary).toBe('Calle A · M-601');
    expect(route.maneuvers).toEqual([
      { location: { latitude: 40.405, longitude: -3.705 }, type: 'turn', modifier: 'left', name: 'M-601' },
    ]);
  });

  it('throws on errors', () => {
    expect(() => parseOsrm({ code: 'NoRoute', message: 'Impossible route' })).toThrow('Impossible route');
  });
});
