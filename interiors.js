/* Interior layouts for KDP paperbacks. Builds a PDFDoc from a spec. Browser + Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./pdfwriter'), require('./generators'));
  else root.Interiors = factory(root.PDFWriter, root.Generators);
})(typeof self !== 'undefined' ? self : this, function (PW, G) {
  'use strict';
  const IN = 72, MM = 72 / 25.4;

  const TRIMS = {
    '5x8': [5, 8], '5.06x7.81': [5.06, 7.81], '5.25x8': [5.25, 8], '5.5x8.5': [5.5, 8.5], '6x9': [6, 9], '6.14x9.21': [6.14, 9.21],
    '6.69x9.61': [6.69, 9.61], '7x10': [7, 10], '7.44x9.69': [7.44, 9.69], '7.5x9.25': [7.5, 9.25], '8x10': [8, 10], '8.25x6': [8.25, 6],
    '8.25x8.25': [8.25, 8.25], '8.5x8.5': [8.5, 8.5], '8.5x11': [8.5, 11], '8.27x11.69': [8.27, 11.69],
  };
  function gutterFor(pages) {
    if (pages <= 150) return 0.375; if (pages <= 300) return 0.5; if (pages <= 500) return 0.625; if (pages <= 700) return 0.75; return 0.875;
  }
  function spineWidth(pages, paper) { // inches
    const per = { white: 0.002252, cream: 0.0025, color: 0.002347 }[paper] || 0.002252;
    return pages * per;
  }

  function frame(spec, pageIndex) {
    const [tw, th] = TRIMS[spec.trim] || TRIMS['6x9'];
    const bleed = spec.bleed ? 0.125 : 0;
    const pw = (tw + bleed) * IN, ph = (th + 2 * bleed) * IN;
    const outer = Math.max(spec.bleed ? 0.375 : 0.25, spec.outerMargin || 0) * IN;
    const gutter = Math.max(gutterFor(spec.pages), spec.gutter || 0) * IN;
    const right = (pageIndex + 1) % 2 === 1; // page 1 is a right-hand page
    const left = right ? gutter : bleed * IN + outer;
    const rgt = right ? pw - bleed * IN - outer : pw - gutter;
    const top = bleed * IN + outer, bottom = ph - bleed * IN - outer;
    return { pw, ph, x: left, y: top, w: rgt - left, h: bottom - top, right };
  }

  function footer(page, fr, spec, pageNo) {
    if (spec.pageNumbers) page.text(String(pageNo), fr.x + fr.w / 2, fr.y + fr.h + 14, 9, { align: 'center', gray: 0.35, overlay: true });
    if (spec.free) page.text('made with blankpress', fr.right ? fr.x + fr.w : fr.x, fr.y + fr.h + 14, 6.5, { align: fr.right ? 'right' : 'left', gray: 0.6 });
  }
  function heading(page, fr, txt, size = 14) {
    page.text(txt, fr.x, fr.y + size, size, { font: 'Helvetica-Bold' });
    return fr.y + size + 10;
  }

  // ---------- page painters ----------
  const P = {};
  P.blank = () => {};
  P.lined = (page, fr, o) => {
    const sp = (o.spacing || 7.1) * MM;
    let y = fr.y + (o.dateLine ? 30 : sp);
    if (o.dateLine) { page.text('Date:', fr.x, fr.y + 12, 10, { gray: 0.4 }); page.lineWidth(0.6).stroke(0.6).line(fr.x + 32, fr.y + 14, fr.x + fr.w * 0.5, fr.y + 14); }
    page.lineWidth(0.5).stroke(0.72);
    for (; y <= fr.y + fr.h; y += sp) page.line(fr.x, y, fr.x + fr.w, y);
    if (o.marginLine) page.stroke([0.85, 0.55, 0.55]).line(fr.x + 0.9 * IN, fr.y, fr.x + 0.9 * IN, fr.y + fr.h);
  };
  P.dotgrid = (page, fr, o) => {
    const sp = (o.spacing || 5) * MM, r = 0.55;
    const nx = Math.floor(fr.w / sp), ny = Math.floor(fr.h / sp);
    const ox = fr.x + (fr.w - nx * sp) / 2, oy = fr.y + (fr.h - ny * sp) / 2;
    page.fill(0.55);
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) page.dot(ox + i * sp, oy + j * sp, r);
  };
  P.graph = (page, fr, o) => {
    const sp = (o.spacing || 5) * MM;
    const nx = Math.floor(fr.w / sp), ny = Math.floor(fr.h / sp);
    const ox = fr.x + (fr.w - nx * sp) / 2, oy = fr.y + (fr.h - ny * sp) / 2;
    page.lineWidth(0.35).stroke(0.75);
    for (let i = 0; i <= nx; i++) page.line(ox + i * sp, oy, ox + i * sp, oy + ny * sp);
    for (let j = 0; j <= ny; j++) page.line(ox, oy + j * sp, ox + nx * sp, oy + j * sp);
  };
  P.handwriting = (page, fr, o) => {
    const rowH = (o.rowHeight || 0.6) * IN, gap = 0.22 * IN;
    let y = fr.y + 6;
    while (y + rowH <= fr.y + fr.h) {
      page.dash([]).lineWidth(0.8).stroke(0.3).line(fr.x, y, fr.x + fr.w, y).line(fr.x, y + rowH, fr.x + fr.w, y + rowH);
      page.dash([3, 3]).lineWidth(0.5).stroke(0.55).line(fr.x, y + rowH / 2, fr.x + fr.w, y + rowH / 2);
      y += rowH + gap;
    }
    page.dash([]);
  };
  P.daily = (page, fr) => {
    page.text('Date', fr.x, fr.y + 12, 10, { gray: 0.4 });
    page.lineWidth(0.6).stroke(0.5).line(fr.x + 28, fr.y + 14, fr.x + fr.w * 0.45, fr.y + 14);
    page.text('M  T  W  T  F  S  S', fr.x + fr.w, fr.y + 12, 10, { align: 'right', gray: 0.4 });
    const colW = fr.w * 0.46, gap = fr.w * 0.06;
    // left: top 3 + notes
    let y = heading(page, { x: fr.x, y: fr.y + 30, w: colW }, 'Top 3 priorities', 11);
    page.lineWidth(0.5).stroke(0.6);
    for (let i = 0; i < 3; i++) { page.rect(fr.x, y + 3, 9, 9); page.line(fr.x + 15, y + 12, fr.x + colW, y + 12); y += 20; }
    y = heading(page, { x: fr.x, y: y + 10, w: colW }, 'To do', 11);
    for (let i = 0; i < 8; i++) { page.rect(fr.x, y + 3, 9, 9); page.line(fr.x + 15, y + 12, fr.x + colW, y + 12); y += 20; }
    y = heading(page, { x: fr.x, y: y + 10, w: colW }, 'Notes', 11);
    page.stroke(0.72);
    for (; y + 18 <= fr.y + fr.h; y += 18) page.line(fr.x, y + 12, fr.x + colW, y + 12);
    // right: schedule
    const sx = fr.x + colW + gap, sw = fr.w - colW - gap;
    let sy = heading(page, { x: sx, y: fr.y + 30, w: sw }, 'Schedule', 11);
    const hours = ['6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const slot = Math.min(26, (fr.y + fr.h - sy) / hours.length);
    page.stroke(0.6);
    hours.forEach((h, i) => { const yy = sy + i * slot; page.text(h, sx + 14, yy + 10, 8, { align: 'right', gray: 0.4 }); page.line(sx + 20, yy + 12, sx + sw, yy + 12); });
  };
  P.weekly = (page, fr) => {
    page.text('Week of', fr.x, fr.y + 12, 10, { gray: 0.4 });
    page.lineWidth(0.6).stroke(0.5).line(fr.x + 42, fr.y + 14, fr.x + fr.w * 0.5, fr.y + 14);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Notes'];
    const cols = 2, rows = 4, gap = 10;
    const bw = (fr.w - gap) / cols, bh = (fr.h - 30 - gap * (rows - 1)) / rows;
    days.forEach((d, i) => {
      const bx = fr.x + (i % cols) * (bw + gap), by = fr.y + 30 + Math.floor(i / cols) * (bh + gap);
      page.lineWidth(0.7).stroke(0.35).rect(bx, by, bw, bh);
      page.text(d, bx + 8, by + 14, 10, { font: 'Helvetica-Bold' });
      page.lineWidth(0.4).stroke(0.75);
      for (let y = by + 32; y < by + bh - 6; y += 16) page.line(bx + 8, y, bx + bw - 8, y);
    });
  };
  P.habit = (page, fr) => {
    page.text('Month', fr.x, fr.y + 12, 10, { gray: 0.4 });
    page.lineWidth(0.6).stroke(0.5).line(fr.x + 34, fr.y + 14, fr.x + fr.w * 0.4, fr.y + 14);
    const labelW = Math.min(110, fr.w * 0.28), days = 31, rows = Math.min(14, Math.floor((fr.h - 40) / 22));
    const cw = (fr.w - labelW) / days, rh = (fr.h - 40) / (rows + 1), top = fr.y + 30;
    page.lineWidth(0.4).stroke(0.5);
    for (let d = 0; d < days; d++) page.text(String(d + 1), fr.x + labelW + d * cw + cw / 2, top + rh - 5, 6, { align: 'center', gray: 0.3 });
    for (let r = 0; r <= rows + 1; r++) page.line(fr.x, top + r * rh, fr.x + fr.w, top + r * rh);
    for (let d = 0; d <= days; d++) page.line(fr.x + labelW + d * cw, top, fr.x + labelW + d * cw, top + (rows + 1) * rh);
    page.line(fr.x, top, fr.x, top + (rows + 1) * rh);
    page.text('Habit', fr.x + 4, top + rh - 5, 8, { font: 'Helvetica-Bold' });
  };

  // ---------- puzzles ----------
  function drawSudoku(page, x, y, size, grid, opts = {}) {
    const c = size / 9;
    page.lineWidth(0.5).stroke(0.4);
    for (let i = 0; i <= 9; i++) { page.line(x + i * c, y, x + i * c, y + size); page.line(x, y + i * c, x + size, y + i * c); }
    page.lineWidth(1.6).stroke(0);
    for (let i = 0; i <= 9; i += 3) { page.line(x + i * c, y, x + i * c, y + size); page.line(x, y + i * c, x + size, y + i * c); }
    const fs = opts.fontSize || c * 0.55;
    for (let i = 0; i < 81; i++) {
      const v = grid[i]; if (!v) continue;
      const col = i % 9, row = Math.floor(i / 9);
      const bold = opts.given && opts.given[i];
      page.text(String(v), x + col * c + c / 2, y + row * c + c / 2 + fs * 0.35, fs, { align: 'center', font: bold ? 'Helvetica-Bold' : 'Helvetica', gray: opts.gray });
    }
  }
  function drawWordsearch(page, x, y, size, ws, opts = {}) {
    const n = ws.grid.length, c = size / n;
    page.lineWidth(0.8).stroke(0.2).rect(x, y, size, size);
    const fs = c * 0.6;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) page.text(ws.grid[r][k], x + k * c + c / 2, y + r * c + c / 2 + fs * 0.35, fs, { align: 'center', font: 'Helvetica' });
    if (opts.solution) {
      page.lineWidth(c * 0.7).stroke(0.78);
      for (const p of ws.placed) {
        const x1 = x + p.x * c + c / 2, y1 = y + p.y * c + c / 2;
        const x2 = x + (p.x + p.dx * (p.word.length - 1)) * c + c / 2, y2 = y + (p.y + p.dy * (p.word.length - 1)) * c + c / 2;
        page.line(x1, y1, x2, y2);
      }
      // redraw letters on top
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) page.text(ws.grid[r][k], x + k * c + c / 2, y + r * c + c / 2 + fs * 0.35, fs, { align: 'center' });
    }
  }
  function drawMaze(page, x, y, w, h, m, opts = {}) {
    const cw = w / m.cols, ch = h / m.rows;
    page.lineWidth(opts.lineWidth || 1.4).stroke(0);
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
      const cell = m.cells[r][c], x0 = x + c * cw, y0 = y + r * ch;
      if (cell.n) page.line(x0, y0, x0 + cw, y0);
      if (cell.w) page.line(x0, y0, x0, y0 + ch);
      if (cell.s) page.line(x0, y0 + ch, x0 + cw, y0 + ch);
      if (cell.e) page.line(x0 + cw, y0, x0 + cw, y0 + ch);
    }
    if (opts.solution) {
      page.lineWidth(Math.min(cw, ch) * 0.35).stroke(0.6);
      const pts = m.path.map(([c, r]) => [x + c * cw + cw / 2, y + r * ch + ch / 2]);
      pts.unshift([x + cw / 2, y - ch * 0.4]); pts.push([x + (m.cols - 0.5) * cw, y + h + ch * 0.4]);
      for (let i = 1; i < pts.length; i++) page.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    }
    if (opts.labels !== false) {
      page.text('START', x + cw / 2, y - 4, Math.max(6, Math.min(9, cw * 0.5)), { align: 'center', gray: 0.3 });
      page.text('END', x + (m.cols - 0.5) * cw, y + h + 10, Math.max(6, Math.min(9, cw * 0.5)), { align: 'center', gray: 0.3 });
    }
  }

  // ---------- builders ----------
  function build(spec) {
    const doc = new PW.PDFDoc({ title: spec.title || 'Interior', author: spec.author || '' });
    const o = spec.options || {};
    let pageNo = 0;
    const newPage = () => { const fr0 = frame(spec, pageNo); const page = doc.addPage(fr0.pw, fr0.ph); pageNo++; const fr = frame(spec, pageNo - 1); return { page, fr }; };
    const finish = (page, fr) => footer(page, fr, spec, pageNo);

    if (spec.titlePage) {
      const { page, fr } = newPage();
      page.text(spec.title || '', fr.x + fr.w / 2, fr.y + fr.h * 0.4, 24, { align: 'center', font: 'Helvetica-Bold' });
      if (spec.subtitle) page.text(spec.subtitle, fr.x + fr.w / 2, fr.y + fr.h * 0.4 + 26, 12, { align: 'center', gray: 0.4 });
      if (spec.free) footer(page, fr, { free: true }, 0);
      const b = newPage(); if (spec.free) footer(b.page, b.fr, { free: true }, 0); // blank verso
    }

    const type = spec.type;
    if (P[type]) {
      const cache = {};
      while (pageNo < spec.pages) {
        const { page, fr } = newPage();
        const key = fr.right ? 'R' : 'L';
        if (cache[key]) { page.ops = cache[key].ops; cache[key].fonts.forEach((fn) => page.fonts.add(fn)); }
        else { P[type](page, fr, o); cache[key] = { ops: page.ops, fonts: new Set(page.fonts) }; }
        finish(page, fr);
      }
      return doc;
    }

    if (type === 'sudoku') {
      const count = spec.count || 50, seed = spec.seed || 1;
      const puzzles = []; for (let i = 0; i < count; i++) puzzles.push(G.sudoku(seed * 1000 + i, o.difficulty || 'medium'));
      const perPage = o.perPage || 2;
      for (let i = 0; i < puzzles.length; i += perPage) {
        const { page, fr } = newPage();
        const cols = perPage >= 4 ? 2 : 1, rowsN = Math.ceil(perPage / cols);
        const slotW = fr.w / cols, slotH = fr.h / rowsN;
        for (let k = 0; k < perPage && i + k < puzzles.length; k++) {
          const size = Math.min(slotW - (cols > 1 ? 14 : 0), slotH - 40);
          const sx = fr.x + (k % cols) * slotW, sy = fr.y + Math.floor(k / cols) * slotH;
          const gx = sx + (slotW - size) / 2, gy = sy + 28;
          page.text(`Puzzle ${i + k + 1}`, gx, sy + 14, 11, { font: 'Helvetica-Bold' });
          page.text((o.difficulty || 'medium').replace(/^./, (c) => c.toUpperCase()), gx + size, sy + 14, 9, { align: 'right', gray: 0.45 });
          drawSudoku(page, gx, gy, size, puzzles[i + k].puzzle);
        }
        finish(page, fr);
      }
      if (o.solutions !== false) {
        const cols = fr0cols(spec) , per = cols * cols * 1;
        for (let i = 0; i < puzzles.length; i += per) {
          const { page, fr } = newPage();
          heading(page, fr, i === 0 ? 'Solutions' : 'Solutions (continued)', 13);
          const gap = 12, size = (fr.w - gap * (cols - 1)) / cols;
          for (let k = 0; k < per && i + k < puzzles.length; k++) {
            const gx = fr.x + (k % cols) * (size + gap), gy = fr.y + 34 + Math.floor(k / cols) * (size + 24);
            if (gy + size > fr.y + fr.h) break;
            page.text(`${i + k + 1}`, gx, gy - 3, 8, { gray: 0.4 });
            drawSudoku(page, gx, gy, size, puzzles[i + k].solution, { fontSize: size / 9 * 0.5 });
          }
          finish(page, fr);
        }
      }
      return doc;
    }

    if (type === 'wordsearch') {
      const count = spec.count || 30, seed = spec.seed || 1, n = o.size || 15;
      const themes = Object.keys(G.WORD_THEMES);
      const list = [];
      for (let i = 0; i < count; i++) {
        let words, title;
        if (o.words && o.words.length) { words = G.shuffle(o.words.slice(), G.rng(seed * 7 + i)).slice(0, o.perPuzzle || 15); title = o.title || `Puzzle ${i + 1}`; }
        else { const t = themes[i % themes.length]; words = G.shuffle(G.WORD_THEMES[t].slice(), G.rng(seed * 7 + i)).slice(0, o.perPuzzle || 15); title = t.replace(/^./, (c) => c.toUpperCase()); }
        list.push({ title, ws: G.wordsearch(words, n, seed * 1000 + i, { diagonal: o.diagonal !== false, backwards: !!o.backwards }) });
      }
      list.forEach((item, i) => {
        const { page, fr } = newPage();
        page.text(`${i + 1}. ${item.title}`, fr.x, fr.y + 14, 13, { font: 'Helvetica-Bold' });
        const size = Math.min(fr.w, fr.h * 0.62);
        const gx = fr.x + (fr.w - size) / 2, gy = fr.y + 28;
        drawWordsearch(page, gx, gy, size, item.ws);
        const words = item.ws.words.slice().sort(), cols = 3, cw = fr.w / cols;
        let wy = gy + size + 22;
        words.forEach((w, k) => { page.text(w, fr.x + (k % cols) * cw, wy + Math.floor(k / cols) * 14, 9.5); });
        finish(page, fr);
      });
      if (o.solutions !== false) {
        const per = 4;
        for (let i = 0; i < list.length; i += per) {
          const { page, fr } = newPage();
          heading(page, fr, i === 0 ? 'Solutions' : 'Solutions (continued)', 13);
          const gap = 14, size = Math.min((fr.w - gap) / 2, (fr.h - 40 - gap) / 2 - 14);
          for (let k = 0; k < per && i + k < list.length; k++) {
            const gx = fr.x + (k % 2) * (size + gap + (fr.w - 2 * size - gap) / 2), gy = fr.y + 40 + Math.floor(k / 2) * (size + gap + 14);
            page.text(`${i + k + 1}. ${list[i + k].title}`, gx, gy - 3, 8, { gray: 0.4 });
            drawWordsearch(page, gx, gy, size, list[i + k].ws, { solution: true });
          }
          finish(page, fr);
        }
      }
      return doc;
    }

    if (type === 'maze') {
      const count = spec.count || 30, seed = spec.seed || 1;
      const dims = { easy: 10, medium: 16, hard: 24, expert: 32 }[o.difficulty || 'medium'] || 16;
      const mazes = [];
      for (let i = 0; i < count; i++) {
        const { page, fr } = newPage();
        const boxW = fr.w, boxH = fr.h - 40;
        const cols = dims, rows = Math.max(4, Math.round(dims * (boxH / boxW)));
        const m = G.maze(cols, rows, seed * 1000 + i); mazes.push(m);
        page.text(`Maze ${i + 1}`, fr.x, fr.y + 14, 13, { font: 'Helvetica-Bold' });
        const cell = Math.min(boxW / cols, boxH / rows), w = cell * cols, h = cell * rows;
        drawMaze(page, fr.x + (fr.w - w) / 2, fr.y + 34, w, h, m);
        finish(page, fr);
      }
      if (o.solutions !== false) {
        const per = 4;
        for (let i = 0; i < mazes.length; i += per) {
          const { page, fr } = newPage();
          heading(page, fr, i === 0 ? 'Solutions' : 'Solutions (continued)', 13);
          const gap = 18, bw = (fr.w - gap) / 2, bh = (fr.h - 44 - gap) / 2 - 14;
          for (let k = 0; k < per && i + k < mazes.length; k++) {
            const m = mazes[i + k];
            const cell = Math.min(bw / m.cols, bh / m.rows), w = cell * m.cols, h = cell * m.rows;
            const bx = fr.x + (k % 2) * (bw + gap) + (bw - w) / 2, by = fr.y + 48 + Math.floor(k / 2) * (bh + gap + 14);
            page.text(`Maze ${i + k + 1}`, bx, by - 4, 8, { gray: 0.4 });
            drawMaze(page, bx, by, w, h, m, { solution: true, labels: false, lineWidth: 0.8 });
          }
          finish(page, fr);
        }
      }
      return doc;
    }
    throw new Error('unknown type ' + type);
  }
  function fr0cols(spec) { const [tw] = TRIMS[spec.trim] || [6]; return tw >= 8 ? 3 : 2; }

  /** Full-wrap cover template with trim/bleed/spine guides. Returns PDFDoc. */
  function coverTemplate(spec) {
    const [tw, th] = TRIMS[spec.trim] || TRIMS['6x9'];
    const spine = spineWidth(spec.pages, spec.paper || 'white');
    const bleed = 0.125;
    const W = (tw * 2 + spine + bleed * 2) * IN, H = (th + bleed * 2) * IN;
    const doc = new PW.PDFDoc({ title: 'Cover template' });
    const p = doc.addPage(W, H);
    p.lineWidth(0.5).stroke([0.9, 0.3, 0.3]).dash([4, 3]).rect(bleed * IN, bleed * IN, W - 2 * bleed * IN, H - 2 * bleed * IN);
    p.dash([]).stroke([0.2, 0.5, 0.9]).line((bleed + tw) * IN, 0, (bleed + tw) * IN, H).line((bleed + tw + spine) * IN, 0, (bleed + tw + spine) * IN, H);
    const safe = 0.25 * IN;
    p.stroke([0.3, 0.7, 0.4]).dash([2, 2]).rect(bleed * IN + safe, bleed * IN + safe, tw * IN - 2 * safe, th * IN - 2 * safe).rect((bleed + tw + spine) * IN + safe, bleed * IN + safe, tw * IN - 2 * safe, th * IN - 2 * safe);
    p.dash([]);
    p.text('BACK COVER', (bleed + tw / 2) * IN, H / 2, 14, { align: 'center', gray: 0.6 });
    p.text('FRONT COVER', (bleed + tw + spine + tw / 2) * IN, H / 2, 14, { align: 'center', gray: 0.6 });
    p.text(`Spine ${spine.toFixed(3)}" (${spec.pages} pages, ${spec.paper || 'white'} paper)`, W / 2, H - 6, 7, { align: 'center', gray: 0.4 });
    p.text(`Full cover ${(W / IN).toFixed(3)}" x ${(H / IN).toFixed(3)}" incl. 0.125" bleed. Red dashed = trim, blue = spine, green = safe area. Delete guides before upload.`, W / 2, 10, 7, { align: 'center', gray: 0.4 });
    return doc;
  }

  return { TRIMS, gutterFor, spineWidth, frame, build, coverTemplate, IN, MM };
});
