import { parseGpx } from '../gpx';
import { extractUrl, isShortLink, parseRouteLink, unwrapConsent } from '../importLink';

describe('extractUrl', () => {
  it('finds the link in shared text', () => {
    expect(extractUrl('Ruta a Navacerrada https://maps.app.goo.gl/AbC123 ')).toBe('https://maps.app.goo.gl/AbC123');
    expect(extractUrl('nada')).toBeNull();
  });

  it('recognises short links', () => {
    expect(isShortLink('https://maps.app.goo.gl/AbC123')).toBe(true);
    expect(isShortLink('https://www.google.com/maps/dir/a/b')).toBe(false);
  });
});

describe('parseRouteLink — Google', () => {
  it('parses the api=1 format', () => {
    const r = parseRouteLink(
      'https://www.google.com/maps/dir/?api=1&origin=40.4168,-3.7038&destination=Navacerrada&waypoints=40.6,-3.9|Cercedilla',
    );
    expect(r).toEqual({
      source: 'google',
      origin: { kind: 'point', point: { latitude: 40.4168, longitude: -3.7038 } },
      destination: { kind: 'place', query: 'Navacerrada' },
      waypoints: [
        { kind: 'point', point: { latitude: 40.6, longitude: -3.9 } },
        { kind: 'place', query: 'Cercedilla' },
      ],
    });
  });

  it('parses the /dir/ path format and fills names from the data blob', () => {
    const url =
      'https://www.google.com/maps/dir/40.4168,-3.7038/Puerto+de+Navacerrada,+Madrid/Segovia/@40.7,-4.0,10z/' +
      'data=!3m1!4b1!4m14!4m13!1m0!1m5!1m1!1s0xd41:0x1!2m2!1d-4.0103!2d40.7853!1m5!1m1!1s0xd41:0x2!2m2!1d-4.1184!2d40.9429!3e0';
    const r = parseRouteLink(url)!;
    expect(r.origin).toEqual({ kind: 'point', point: { latitude: 40.4168, longitude: -3.7038 } });
    expect(r.waypoints).toEqual([{ kind: 'point', point: { latitude: 40.7853, longitude: -4.0103 } }]);
    expect(r.destination).toEqual({ kind: 'point', point: { latitude: 40.9429, longitude: -4.1184 } });
  });

  it('keeps place names when there are no embedded coordinates', () => {
    const r = parseRouteLink('https://www.google.es/maps/dir/Madrid/Toledo/')!;
    expect(r.origin).toEqual({ kind: 'place', query: 'Madrid' });
    expect(r.destination).toEqual({ kind: 'place', query: 'Toledo' });
  });

  it('treats an empty first stop as "my location"', () => {
    const r = parseRouteLink('https://www.google.com/maps/dir//Toledo/@39.8,-4.0,12z')!;
    expect(r.origin).toBeNull();
    expect(r.destination).toEqual({ kind: 'place', query: 'Toledo' });
  });

  it('unwraps the EU consent page', () => {
    const wrapped =
      'https://consent.google.com/m?continue=' +
      encodeURIComponent('https://www.google.com/maps/dir/Madrid/Toledo/') +
      '&gl=ES';
    expect(unwrapConsent(wrapped)).toBe('https://www.google.com/maps/dir/Madrid/Toledo/');
    expect(parseRouteLink(wrapped)?.destination).toEqual({ kind: 'place', query: 'Toledo' });
  });

  it('rejects unrelated links', () => {
    expect(parseRouteLink('https://example.com/maps/dir/a/b')).toBeNull();
    expect(parseRouteLink('no es un enlace')).toBeNull();
  });
});

describe('parseRouteLink — Waze', () => {
  it('reads the destination', () => {
    expect(parseRouteLink('https://waze.com/ul?ll=40.78,-4.01&navigate=yes')).toEqual({
      source: 'waze',
      origin: null,
      destination: { kind: 'point', point: { latitude: 40.78, longitude: -4.01 } },
      waypoints: [],
    });
  });
});

describe('parseGpx', () => {
  it('reads track points and the name', () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><name><![CDATA[Puerto]]></name><trkseg>
      <trkpt lat="40.1" lon="-3.1"><ele>800</ele></trkpt>
      <trkpt lon='-3.2' lat='40.2'></trkpt>
    </trkseg></trk></gpx>`;
    expect(parseGpx(gpx)).toEqual({
      name: 'Puerto',
      points: [
        { latitude: 40.1, longitude: -3.1 },
        { latitude: 40.2, longitude: -3.2 },
      ],
    });
  });

  it('falls back to route points', () => {
    expect(parseGpx('<gpx><rte><rtept lat="1" lon="2"/></rte></gpx>').points).toEqual([{ latitude: 1, longitude: 2 }]);
  });
});
