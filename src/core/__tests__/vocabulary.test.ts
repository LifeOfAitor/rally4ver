import { VOICES } from '../../audio/clips';
import vocabulary from '../../audio/vocabulary.json';
import type { Pacenote } from '../pacenotes';
import { noteTokens } from '../phrase';

const base: Pacenote = {
  id: 0,
  start: 0,
  end: 10,
  direction: 'izquierda',
  grade: 3,
  hairpin: false,
  modifiers: [],
  angle: 90,
  minRadius: 40,
  lineRadius: 45,
  link: null,
};

describe('voice vocabulary', () => {
  it('has a clip for every token the pacenote engine can say', () => {
    const tokens = new Set<string>();
    for (const direction of ['izquierda', 'derecha'] as const)
      for (const grade of [1, 2, 3, 4, 5, 6] as const)
        for (const hairpin of [false, true])
          for (const meters of [30, 50, 70, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1500]) {
            const n: Pacenote = {
              ...base,
              direction,
              grade,
              hairpin,
              modifiers: ['cuidado', 'larga', 'cierra', 'abre'],
              link: { kind: 'distance', meters },
            };
            noteTokens(n).forEach((t) => tokens.add(t));
            noteTokens({ ...n, link: { kind: 'y' } }).forEach((t) => tokens.add(t));
          }
    const missing = [...tokens].filter((t) => !(t in vocabulary));
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(VOICES))('voice %s has a clip for every vocabulary entry', (id) => {
    const clips = VOICES[id as keyof typeof VOICES].clips;
    const missing = [...Object.keys(vocabulary), ','].filter((t) => !(t in clips));
    expect(missing).toEqual([]);
  });
});
