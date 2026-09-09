/* Puzzle generators: seeded RNG, sudoku, word search, maze. Browser + Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Generators = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rng(seed) {
    let a = (seed >>> 0) || 123456789;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // ---------------- Sudoku ----------------
  function sudokuSolve(grid, r, countOnly) {
    // returns number of solutions (up to 2) if countOnly, else fills grid in place and returns true/false
    const cells = [];
    for (let i = 0; i < 81; i++) if (grid[i] === 0) cells.push(i);
    let count = 0;
    function ok(i, v) {
      const row = Math.floor(i / 9), col = i % 9;
      for (let k = 0; k < 9; k++) {
        if (grid[row * 9 + k] === v || grid[k * 9 + col] === v) return false;
      }
      const br = row - (row % 3), bc = col - (col % 3);
      for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) if (grid[(br + rr) * 9 + bc + cc] === v) return false;
      return true;
    }
    function rec(idx) {
      if (idx === cells.length) { count++; return !countOnly || count >= 2; }
      const i = cells[idx];
      const vals = r ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const v of vals) {
        if (ok(i, v)) {
          grid[i] = v;
          if (rec(idx + 1)) return true;
          grid[i] = 0;
        }
      }
      return false;
    }
    rec(0);
    return countOnly ? count : count > 0;
  }

  function sudoku(seed, difficulty = 'medium') {
    const r = rng(seed);
    const sol = new Array(81).fill(0);
    sudokuSolve(sol, r, false);
    const puzzle = sol.slice();
    const targetClues = { easy: 40, medium: 32, hard: 27, expert: 24 }[difficulty] || 32;
    const order = shuffle([...Array(81).keys()], r);
    let clues = 81;
    for (const i of order) {
      if (clues <= targetClues) break;
      const backup = puzzle[i];
      puzzle[i] = 0;
      const test = puzzle.slice();
      if (sudokuSolve(test, null, true) !== 1) puzzle[i] = backup; else clues--;
    }
    return { puzzle, solution: sol, clues };
  }

  // ---------------- Word search ----------------
  function wordsearch(words, size, seed, opts = {}) {
    const r = rng(seed);
    const allowDiag = opts.diagonal !== false, allowBack = !!opts.backwards;
    const grid = Array.from({ length: size }, () => new Array(size).fill(''));
    let dirs = [[1, 0], [0, 1]];
    if (allowDiag) dirs.push([1, 1], [1, -1]);
    if (allowBack) dirs = dirs.concat(dirs.map(([dx, dy]) => [-dx, -dy]));
    const placed = [];
    const clean = words.map((w) => String(w).toUpperCase().replace(/[^A-Z]/g, '')).filter((w) => w.length >= 2 && w.length <= size);
    clean.sort((a, b) => b.length - a.length);
    for (const w of clean) {
      let done = false;
      for (let attempt = 0; attempt < 200 && !done; attempt++) {
        const [dx, dy] = dirs[Math.floor(r() * dirs.length)];
        const x0 = Math.floor(r() * size), y0 = Math.floor(r() * size);
        const xe = x0 + dx * (w.length - 1), ye = y0 + dy * (w.length - 1);
        if (xe < 0 || ye < 0 || xe >= size || ye >= size) continue;
        let fits = true;
        for (let k = 0; k < w.length; k++) { const c = grid[y0 + dy * k][x0 + dx * k]; if (c && c !== w[k]) { fits = false; break; } }
        if (!fits) continue;
        for (let k = 0; k < w.length; k++) grid[y0 + dy * k][x0 + dx * k] = w[k];
        placed.push({ word: w, x: x0, y: y0, dx, dy });
        done = true;
      }
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!grid[y][x]) grid[y][x] = letters[Math.floor(r() * 26)];
    return { grid, placed, words: placed.map((p) => p.word) };
  }

  // ---------------- Maze (recursive backtracker) ----------------
  function maze(cols, rows, seed) {
    const r = rng(seed);
    // walls: each cell has {n,e,s,w} = true means wall present
    const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true, v: false })));
    const stack = [[0, 0]];
    cells[0][0].v = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [];
      if (y > 0 && !cells[y - 1][x].v) nb.push([x, y - 1, 'n', 's']);
      if (x < cols - 1 && !cells[y][x + 1].v) nb.push([x + 1, y, 'e', 'w']);
      if (y < rows - 1 && !cells[y + 1][x].v) nb.push([x, y + 1, 's', 'n']);
      if (x > 0 && !cells[y][x - 1].v) nb.push([x - 1, y, 'w', 'e']);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, d1, d2] = nb[Math.floor(r() * nb.length)];
      cells[y][x][d1] = false; cells[ny][nx][d2] = false; cells[ny][nx].v = true;
      stack.push([nx, ny]);
    }
    // entrance top-left (open north), exit bottom-right (open south)
    cells[0][0].n = false; cells[rows - 1][cols - 1].s = false;
    // solve with BFS
    const prev = new Map(); const q = [[0, 0]]; const seen = new Set(['0,0']);
    while (q.length) {
      const [x, y] = q.shift();
      if (x === cols - 1 && y === rows - 1) break;
      const c = cells[y][x];
      const opts = [];
      if (!c.n && y > 0) opts.push([x, y - 1]); if (!c.s && y < rows - 1) opts.push([x, y + 1]);
      if (!c.e && x < cols - 1) opts.push([x + 1, y]); if (!c.w && x > 0) opts.push([x - 1, y]);
      for (const [nx, ny] of opts) { const k = nx + ',' + ny; if (!seen.has(k)) { seen.add(k); prev.set(k, [x, y]); q.push([nx, ny]); } }
    }
    const path = []; let cur = [cols - 1, rows - 1];
    while (cur) { path.push(cur); cur = prev.get(cur[0] + ',' + cur[1]); }
    path.reverse();
    return { cols, rows, cells, path };
  }

  const WORD_THEMES = {
    animals: 'LION TIGER ELEPHANT GIRAFFE ZEBRA MONKEY PANDA KOALA RABBIT TURTLE DOLPHIN WHALE EAGLE PARROT PENGUIN CAMEL HORSE SHEEP GOAT WOLF FOX BEAR DEER OTTER'.split(' '),
    fruits: 'APPLE BANANA CHERRY GRAPE LEMON MANGO MELON ORANGE PEACH PEAR PLUM KIWI PAPAYA APRICOT COCONUT FIG LIME BERRY GUAVA LYCHEE'.split(' '),
    space: 'PLANET STAR GALAXY COMET ROCKET ORBIT MOON SUN MARS VENUS SATURN JUPITER NEBULA ASTEROID METEOR ECLIPSE GRAVITY COSMOS LUNAR SOLAR'.split(' '),
    kitchen: 'SPOON FORK KNIFE PLATE BOWL OVEN STOVE KETTLE WHISK LADLE GRATER BLENDER TOASTER SKILLET SPATULA APRON TIMER PANTRY SINK TRAY'.split(' '),
    garden: 'ROSE TULIP DAISY LILY SEED SOIL SHOVEL RAKE WATER SUNLIGHT COMPOST FENCE HEDGE BLOOM PETAL ROOT LEAF STEM VINE HERB'.split(' '),
    ocean: 'CORAL SHARK CRAB SHELL WAVE TIDE REEF SEAL SQUID OCTOPUS JELLYFISH KELP SAND PEARL ANCHOR SAILOR ISLAND LAGOON STARFISH OYSTER'.split(' '),
    school: 'PENCIL ERASER NOTEBOOK TEACHER STUDENT DESK CHALK LESSON RECESS LIBRARY SCIENCE HISTORY MATH ART MUSIC LOCKER BACKPACK QUIZ GRADE CLASS'.split(' '),
    travel: 'PASSPORT TICKET HOTEL BEACH MOUNTAIN TRAIN PLANE MAP CAMERA SUITCASE JOURNEY ADVENTURE TOURIST CRUISE ROAD CITY VILLAGE SUNSET COMPASS TENT'.split(' '),
    holidays: 'GIFT CANDLE SNOW SLEIGH CAROL COOKIE RIBBON WREATH STOCKING LIGHTS FAMILY FEAST TURKEY PUMPKIN LANTERN FIREWORK PARADE BUNNY BASKET CONFETTI'.split(' '),
    sports: 'SOCCER TENNIS GOLF HOCKEY RUGBY BOXING CYCLING SKIING SURFING ROWING BASEBALL VOLLEYBALL SPRINT MARATHON JUDO KARATE ARCHERY FENCING DIVING CRICKET'.split(' '),
  };

  return { rng, shuffle, sudoku, sudokuSolve, wordsearch, maze, WORD_THEMES };
});
