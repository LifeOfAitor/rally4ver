import { buildPath } from '../path';
import { generatePacenotes, gradeFor, roundCallDistance } from '../pacenotes';
import { noteLabel, noteSpeech } from '../phrase';
import { buildRoad, type Segment } from '../../test/helpers';

const notesFor = (segments: Segment[]) => generatePacenotes(buildPath(buildRoad(segments)));

describe('gradeFor', () => {
  it.each([
    [10, 1],
    [30, 2],
    [50, 3],
    [70, 4],
    [100, 5],
    [180, 6],
  ])('radius %i m → grade %i', (radius, grade) => {
    expect(gradeFor(radius)).toBe(grade);
  });
});

describe('roundCallDistance', () => {
  it.each([
    [33, 30],
    [88, 100],
    [130, 150],
    [440, 400],
    [960, 1000],
  ])('%i m → %i', (m, expected) => {
    expect(roundCallDistance(m)).toBe(expected);
  });
});

describe('generatePacenotes', () => {
  it('calls nothing on a straight or a gentle sweep', () => {
    expect(notesFor([{ straight: 500 }])).toEqual([]);
    expect(notesFor([{ straight: 100 }, { turn: 'R', radius: 400, angle: 30 }, { straight: 100 }])).toEqual([]);
  });

  it('ignores small kinks', () => {
    expect(notesFor([{ straight: 100 }, { turn: 'L', radius: 40, angle: 10 }, { straight: 100 }])).toEqual([]);
  });

  it.each([
    [25, 2],
    [45, 3],
    [70, 4],
    [110, 5],
    [160, 6],
  ])('grades a %i m right as %i', (radius, grade) => {
    const notes = notesFor([{ straight: 150 }, { turn: 'R', radius, angle: 120 }, { straight: 150 }]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ direction: 'derecha', grade, hairpin: false });
    expect(notes[0].angle).toBeGreaterThan(110);
    expect(notes[0].angle).toBeLessThan(130);
  });

  it('grades a short bend faster than a long one of the same radius', () => {
    const [short] = notesFor([{ straight: 150 }, { turn: 'R', radius: 35, angle: 30 }, { straight: 150 }]);
    const [long] = notesFor([{ straight: 150 }, { turn: 'R', radius: 35, angle: 120 }, { straight: 150 }]);
    expect(short.grade).toBeGreaterThanOrEqual(5);
    expect(long.grade).toBe(3);
  });

  it('does not call bends that are flat out on the racing line', () => {
    expect(notesFor([{ straight: 150 }, { turn: 'R', radius: 180, angle: 25 }, { straight: 150 }])).toEqual([]);
  });

  it('detects a hairpin', () => {
    const [note] = notesFor([{ straight: 100 }, { turn: 'L', radius: 12, angle: 170 }, { straight: 100 }]);
    expect(note).toMatchObject({ direction: 'izquierda', hairpin: true });
    expect(noteSpeech(note)).toBe('horquilla izquierda');
  });

  it('warns "cuidado" for a tight bend after a long straight', () => {
    const [note] = notesFor([{ straight: 400 }, { turn: 'R', radius: 25, angle: 90 }, { straight: 50 }]);
    expect(note.modifiers[0]).toBe('cuidado');
    expect(noteSpeech(note)).toBe('cuidado derecha dos');
  });

  it('chains close bends with "y" and others with a distance', () => {
    const notes = notesFor([
      { straight: 100 },
      { turn: 'L', radius: 60, angle: 60 },
      { straight: 10 },
      { turn: 'R', radius: 60, angle: 60 },
      { straight: 100 },
      { turn: 'L', radius: 100, angle: 60 },
      { straight: 100 },
    ]);
    expect(notes.map(noteSpeech)).toEqual(['izquierda cuatro y', 'derecha cuatro cien', 'izquierda cinco']);
  });

  it('merges a same-direction bend drawn in two pieces', () => {
    const notes = notesFor([{ straight: 100 }, { turn: 'R', radius: 70, angle: 40 }, { straight: 4 }, { turn: 'R', radius: 70, angle: 40 }, { straight: 100 }]);
    expect(notes).toHaveLength(1);
  });

  it('calls a long bend "larga"', () => {
    const [note] = notesFor([{ straight: 100 }, { turn: 'R', radius: 110, angle: 100 }, { straight: 100 }]);
    expect(note.modifiers).toContain('larga');
    expect(noteLabel(note)).toBe('DER 5 LARGA ▶');
  });

  it('detects a tightening and an opening bend', () => {
    const closes = notesFor([{ straight: 100 }, { turn: 'L', radius: 120, angle: 30 }, { turn: 'L', radius: 42, angle: 60 }, { straight: 100 }]);
    expect(closes).toHaveLength(1);
    expect(closes[0].modifiers).toContain('cierra');
    expect(closes[0].grade).toBe(3);

    const opens = notesFor([{ straight: 100 }, { turn: 'L', radius: 35, angle: 60 }, { turn: 'L', radius: 120, angle: 30 }, { straight: 100 }]);
    expect(opens[0].modifiers).toContain('abre');
  });

  it('works with a real-looking OSM polyline (one node per bend)', () => {
    // A 90° corner drawn as a single vertex, like a town junction in OSM.
    const notes = notesFor([{ straight: 200 }, { turn: 'R', radius: 0.1, angle: 90 }, { straight: 200 }]);
    expect(notes).toHaveLength(1);
    expect(notes[0].grade).toBeLessThanOrEqual(2);
  });
});
