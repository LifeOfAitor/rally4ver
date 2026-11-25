/** Examples for the "how to read the notes" guide (same as the README table). */
export interface GuideRow {
  /** How the note looks on the drive screen. */
  label: string;
  meaning: string;
  /** What the co-driver says (voice clip tokens). */
  say: string[];
  tight?: boolean;
}

export const GUIDE_ROWS: GuideRow[] = [
  { label: 'DER 6 ▶', meaning: 'Curva muy abierta, casi recta', say: ['derecha', 'seis'] },
  { label: '◀ IZQ 3', meaning: 'Curva media', say: ['izquierda', 'tres'] },
  { label: 'DER 1 ▶', meaning: 'Curva muy cerrada', say: ['derecha', 'uno'], tight: true },
  { label: '◀ HORQ IZQ', meaning: 'Giro de casi 180 grados', say: ['horquilla', 'izquierda'], tight: true },
  { label: '◀ IZQ 3 CIERRA', meaning: 'La curva se va cerrando', say: ['izquierda', 'tres', 'cierra'] },
  { label: 'DER 4 ABRE ▶', meaning: 'La curva se va abriendo', say: ['derecha', 'cuatro', 'abre'] },
  { label: 'DER 5 LARGA ▶', meaning: 'Curva que dura más de lo normal', say: ['derecha', 'cinco', 'larga'] },
  { label: '100', meaning: '100 metros hasta la siguiente curva', say: ['izquierda', 'cuatro', 'cien'] },
  { label: 'Y', meaning: 'La siguiente curva va pegada a esta', say: ['izquierda', 'tres', 'y', 'derecha', 'dos'] },
  {
    label: '! DER 2 ▶',
    meaning: 'Cuidado: curva cerrada después de una recta larga',
    say: ['cuidado', ',', 'derecha', 'dos'],
    tight: true,
  },
];
