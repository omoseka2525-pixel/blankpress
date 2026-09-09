/* Tiny dependency-free PDF writer (works in browser and Node).
 * Units: points (1 in = 72 pt). Origin bottom-left (PDF native). Helpers use top-left via page.h - y.
 * Identical page content is deduplicated into shared Form XObjects, so 300 identical pages stay tiny.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PDFWriter = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Helvetica AFM widths (per 1000 em) for chars 32..126
  const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const HELVB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  const COUR = 600;

  function textWidth(str, size, font) {
    let w = 0;
    for (const ch of String(str)) {
      const c = ch.charCodeAt(0);
      let cw;
      if (font === 'Courier' || font === 'Courier-Bold') cw = COUR;
      else {
        const tbl = font === 'Helvetica-Bold' ? HELVB : HELV;
        cw = c >= 32 && c <= 126 ? tbl[c - 32] : 556;
      }
      w += cw;
    }
    return (w / 1000) * size;
  }

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?');
  }
  const f = (n) => (Math.round(n * 100) / 100).toString();

  class Page {
    constructor(doc, w, h) {
      this.doc = doc; this.w = w; this.h = h; this.ops = []; this.overlay = [];
      this.fonts = new Set();
    }
    // y is from TOP for all helpers
    _y(y) { return this.h - y; }
    lineWidth(lw) { this.ops.push(`${f(lw)} w`); return this; }
    stroke(g) { this.ops.push(typeof g === 'number' ? `${f(g)} G` : `${g.map(f).join(' ')} RG`); return this; }
    fill(g) { this.ops.push(typeof g === 'number' ? `${f(g)} g` : `${g.map(f).join(' ')} rg`); return this; }
    dash(arr) { this.ops.push(arr && arr.length ? `[${arr.map(f).join(' ')}] 0 d` : '[] 0 d'); return this; }
    line(x1, y1, x2, y2) { this.ops.push(`${f(x1)} ${f(this._y(y1))} m ${f(x2)} ${f(this._y(y2))} l S`); return this; }
    rect(x, y, w, h, mode = 'S') { this.ops.push(`${f(x)} ${f(this._y(y + h))} ${f(w)} ${f(h)} re ${mode}`); return this; }
    dot(cx, cy, r) { // filled circle via bezier
      const k = 0.5523 * r, y = this._y(cy);
      this.ops.push(`${f(cx + r)} ${f(y)} m ${f(cx + r)} ${f(y + k)} ${f(cx + k)} ${f(y + r)} ${f(cx)} ${f(y + r)} c ${f(cx - k)} ${f(y + r)} ${f(cx - r)} ${f(y + k)} ${f(cx - r)} ${f(y)} c ${f(cx - r)} ${f(y - k)} ${f(cx - k)} ${f(y - r)} ${f(cx)} ${f(y - r)} c ${f(cx + k)} ${f(y - r)} ${f(cx + r)} ${f(y - k)} ${f(cx + r)} ${f(y)} c f`);
      return this;
    }
    circle(cx, cy, r) { // stroked circle
      const k = 0.5523 * r, y = this._y(cy);
      this.ops.push(`${f(cx + r)} ${f(y)} m ${f(cx + r)} ${f(y + k)} ${f(cx + k)} ${f(y + r)} ${f(cx)} ${f(y + r)} c ${f(cx - k)} ${f(y + r)} ${f(cx - r)} ${f(y + k)} ${f(cx - r)} ${f(y)} c ${f(cx - r)} ${f(y - k)} ${f(cx - k)} ${f(y - r)} ${f(cx)} ${f(y - r)} c ${f(cx + k)} ${f(y - r)} ${f(cx + r)} ${f(y - k)} ${f(cx + r)} ${f(y)} c S`);
      return this;
    }
    text(str, x, y, size = 12, opt = {}) {
      const font = opt.font || 'Helvetica';
      this.fonts.add(font);
      let tx = x;
      const w = textWidth(str, size, font);
      if (opt.align === 'center') tx = x - w / 2;
      else if (opt.align === 'right') tx = x - w;
      const gray = opt.gray != null ? `${f(opt.gray)} g ` : '';
      (opt.overlay ? this.overlay : this.ops).push(`BT ${gray}/${this.doc._fontKey(font)} ${f(size)} Tf ${f(tx)} ${f(this._y(y))} Td (${esc(str)}) Tj ET` + (opt.gray != null ? ' 0 g' : ''));
      return w;
    }
    textWidth(str, size, font) { return textWidth(str, size, font || 'Helvetica'); }
    content() { return this.ops.join('\n'); }
  }

  class PDFDoc {
    constructor(opts = {}) {
      this.pages = [];
      this.fontKeys = {};
      this.title = opts.title || '';
      this.author = opts.author || '';
    }
    _fontKey(name) {
      if (!this.fontKeys[name]) this.fontKeys[name] = 'F' + (Object.keys(this.fontKeys).length + 1);
      return this.fontKeys[name];
    }
    addPage(w, h) { const p = new Page(this, w, h); this.pages.push(p); return p; }

    /** Build PDF as a binary string (latin1). */
    build() {
      const objs = []; // strings (object bodies)
      const add = (body) => { objs.push(body); return objs.length; };
      const fontIds = {};
      for (const [name, key] of Object.entries(this.fontKeys)) {
        fontIds[key] = add(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`);
      }
      const fontRes = Object.entries(fontIds).map(([k, id]) => `/${k} ${id} 0 R`).join(' ');

      // Deduplicate identical content into Form XObjects
      const xobjByHash = new Map();
      const pageObjIds = [];
      const pagesId = objs.length + 1 + this.pages.length * 2 + 1; // placeholder computed later; we instead reserve
      // We'll create page objects after content, so collect specs first.
      const specs = [];
      for (const p of this.pages) {
        const c = p.content();
        const key = p.w + 'x' + p.h + ':' + c;
        let xid = xobjByHash.get(key);
        if (!xid) {
          const stream = c;
          xid = add(`<< /Type /XObject /Subtype /Form /BBox [0 0 ${f(p.w)} ${f(p.h)}] /Resources << /Font << ${fontRes} >> >> /Length ${byteLen(stream)} >>\nstream\n${stream}\nendstream`);
          xobjByHash.set(key, xid);
        }
        specs.push({ p, xid });
      }
      const pagesObjIndex = add('PLACEHOLDER');
      for (const s of specs) {
        const content = `/X${s.xid} Do` + (s.p.overlay.length ? '\n' + s.p.overlay.join('\n') : '');
        const cid = add(`<< /Length ${byteLen(content)} >>\nstream\n${content}\nendstream`);
        const pid = add(`<< /Type /Page /Parent ${pagesObjIndex} 0 R /MediaBox [0 0 ${f(s.p.w)} ${f(s.p.h)}] /Resources << /Font << ${fontRes} >> /XObject << /X${s.xid} ${s.xid} 0 R >> >> /Contents ${cid} 0 R >>`);
        pageObjIds.push(pid);
      }
      objs[pagesObjIndex - 1] = `<< /Type /Pages /Kids [${pageObjIds.map((i) => i + ' 0 R').join(' ')}] /Count ${pageObjIds.length} >>`;
      const catalogId = add(`<< /Type /Catalog /Pages ${pagesObjIndex} 0 R >>`);
      const infoId = add(`<< /Producer (BlankPress) /Title (${esc(this.title)}) /Author (${esc(this.author)}) >>`);

      let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
      const offsets = [];
      objs.forEach((body, i) => {
        offsets.push(byteLen(out));
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
      });
      const xref = byteLen(out);
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      for (const o of offsets) out += String(o).padStart(10, '0') + ' 00000 n \n';
      out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return out;
    }
    toUint8Array() {
      const s = this.build();
      const u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
      return u;
    }
    toBlob() { return new Blob([this.toUint8Array()], { type: 'application/pdf' }); }
  }
  function byteLen(s) { return s.length; } // latin1 only

  return { PDFDoc, textWidth, IN: 72, MM: 72 / 25.4 };
});
