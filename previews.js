/* Thumbnail previews drawn on canvas with the same painters used for the PDF. */
(function () {
  'use strict';
  class CanvasPage {
    constructor(ctx, w, h) { this.ctx = ctx; this.w = w; this.h = h; this._lw = 1; this._stroke = '#000'; this._fill = '#000'; }
    _g(g) { return typeof g === 'number' ? `rgb(${Math.round(g * 255)},${Math.round(g * 255)},${Math.round(g * 255)})` : `rgb(${g.map((v) => Math.round(v * 255)).join(',')})`; }
    lineWidth(lw) { this.ctx.lineWidth = Math.max(0.6, lw); return this; }
    stroke(g) { this.ctx.strokeStyle = this._g(g); return this; }
    fill(g) { this.ctx.fillStyle = this._g(g); return this; }
    dash(arr) { this.ctx.setLineDash(arr && arr.length ? arr : []); return this; }
    line(x1, y1, x2, y2) { this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke(); return this; }
    rect(x, y, w, h, mode = 'S') { if (mode === 'S') this.ctx.strokeRect(x, y, w, h); else this.ctx.fillRect(x, y, w, h); return this; }
    dot(cx, cy, r) { this.ctx.beginPath(); this.ctx.arc(cx, cy, Math.max(0.7, r), 0, Math.PI * 2); this.ctx.fill(); return this; }
    circle(cx, cy, r) { this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, Math.PI * 2); this.ctx.stroke(); return this; }
    text(str, x, y, size = 12, opt = {}) {
      const c = this.ctx; c.save();
      c.font = `${opt.font === 'Helvetica-Bold' ? 'bold ' : ''}${size}px Helvetica, Arial, sans-serif`;
      c.fillStyle = opt.gray != null ? this._g(opt.gray) : '#111';
      c.textAlign = opt.align === 'center' ? 'center' : opt.align === 'right' ? 'right' : 'left';
      c.fillText(String(str), x, y); c.restore(); return 0;
    }
    textWidth(str, size) { return String(str).length * size * 0.5; }
  }
  const W = 240, H = 320;
  function frame() { const m = 18; return { pw: W, ph: H, x: m, y: m, w: W - 2 * m, h: H - 2 * m, right: true }; }
  function make(id) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const page = new CanvasPage(ctx, W, H), fr = frame(), I = window.Interiors, G = window.Generators;
    try {
      if (I.painters[id]) I.painters[id](page, fr, { spacing: id === 'lined' ? 6 : 5, dateLine: true, rowHeight: 0.45 });
      else if (id === 'sudoku') { const s = G.sudoku(7, 'medium'); I.drawSudoku(page, fr.x, fr.y + 18, fr.w, s.puzzle); page.text('Puzzle 1', fr.x, fr.y + 10, 9, { font: 'Helvetica-Bold' }); }
      else if (id === 'wordsearch') { const ws = G.wordsearch(G.WORD_THEMES.animals.slice(0, 12), 12, 3, {}); I.drawWordsearch(page, fr.x, fr.y + 18, fr.w, ws); page.text('1. Animals', fr.x, fr.y + 10, 9, { font: 'Helvetica-Bold' }); ws.words.slice(0, 9).forEach((w, k) => page.text(w, fr.x + (k % 3) * (fr.w / 3), fr.y + 18 + fr.w + 16 + Math.floor(k / 3) * 11, 7)); }
      else if (id === 'maze') { const m = G.maze(12, 15, 5); I.drawMaze(page, fr.x, fr.y + 16, fr.w, fr.h - 30, m, { lineWidth: 1.2 }); }
    } catch (e) { /* leave blank */ }
    return cv.toDataURL('image/png');
  }
  const cache = {};
  window.PREVIEWS = new Proxy({}, { get: (_, id) => { if (!(id in cache)) cache[id] = make(String(id)); return cache[id]; } });
})();
