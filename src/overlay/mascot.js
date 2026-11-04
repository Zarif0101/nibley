// Nibley's pixel mascot (brand board, 2026-10-28) as crisp SVG rects. Used by the overlay and test/make-icons.js.
const C = {
  O: '#1E6FEB', // outline
  B: '#2F8BFF', // body
  L: '#4DA3FF', // body light
  S: '#6CCCFF', // face
  H: '#A7E3FF', // shine
  E: '#2B3A4B', // eyes, mouth
  W: '#FFFFFF', // eye glint
  R: '#FF8B7A', // error mark
};

// 20 x 20. Faces differ only in rows 8-13 (eyes and mouth) plus small extras.
const BODY = [
  '..........OO........',
  '.........OBO........',
  '........OBBO..OO....',
  '.......OBBBBOOBO....',
  '.....OOBBBBBBBBO....',
  '....OBBLLLLLLBBBO...',
  '...OBLLSSSSSSLLBBO..',
  '..OBLSHHSSSSSSSLBBO.',
  '..OBLSHSSSSSSSSSLBO.',
  '.OBLSSSSSSSSSSSSLBO.',
  '.OBLSSSSSSSSSSSSLBO.',
  '.OBLSSSSSSSSSSSSLBO.',
  '.OBLSSSSSSSSSSSSLBO.',
  '.OBLSSSSSSSSSSSSLBO.',
  '..OBLSSSSSSSSSSLBO..',
  '..OBBLLSSSSSSLLBBO..',
  '...OOBBLLLLLLBBOO...',
  '.....OOOBBBBOOO.....',
  '........OOOO........',
  '....................',
];

// Face overlays: [row, col, chars]. '.' in an overlay means "leave as is".
const EYES_OPEN = [[9, 6, 'WE....WE'], [10, 6, 'EE....EE'], [11, 6, 'EE....EE']];
const FACES = {
  happy: [...EYES_OPEN, [12, 9, 'E.E'], [13, 10, 'E']],
  listening: [...EYES_OPEN, [12, 10, 'E']],
  thinking: [[8, 7, 'WE....WE'], [9, 7, 'EE....EE'], [10, 7, 'EE....EE'], [12, 10, 'EE']],
  speaking: [...EYES_OPEN, [12, 9, 'EEE'], [13, 9, 'EEE']],
  confused: [...EYES_OPEN, [12, 10, 'E.E'], [13, 9, 'E.E'], [13, 11, '.']],
  error: [[9, 6, 'E.E..E.E'], [10, 7, 'E....E'], [11, 6, 'E.E..E.E'], [13, 9, 'EEE'], [0, 16, 'R..R'], [1, 17, 'RR'], [2, 17, 'RR'], [3, 16, 'R..R']],
};

function grid(face) {
  const g = BODY.map((r) => r.split(''));
  for (const [row, col, s] of FACES[face] || FACES.happy) {
    [...s].forEach((ch, i) => { if (ch !== '.') g[row][col + i] = ch; });
  }
  return g;
}

// SVG markup at `size` px. Same-colour runs in a row become one rect (fewer nodes).
function svg(face = 'happy', size = 32) {
  const rects = [];
  grid(face).forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let n = 1;
      while (row[x + n] === ch) n++;
      if (ch !== '.') rects.push(`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${C[ch]}"/>`);
      x += n;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="${size}" height="${size}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { svg, grid, FACES, COLORS: C };
