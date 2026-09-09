(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const PRO_HASH = '02043222489ac08a4901499adb92381ae10bd45e950537e61af0c2969561703f';
  const BUY_URL = window.BLANKPRESS_BUY_URL || '#pricing';
  const FREE_PAGES = 30, FREE_PUZZLES = 10;

  const TYPES = [
    { id: 'lined', name: 'Lined journal', img: 'PV:lined', pages: true, opts: [
      { k: 'spacing', label: 'Line spacing', type: 'select', v: [['7.1', 'College (7.1 mm)'], ['8.7', 'Wide (8.7 mm)'], ['6.35', 'Narrow (6.35 mm)'], ['10', 'Extra wide (10 mm)']] },
      { k: 'dateLine', label: 'Date line at top', type: 'check', d: true }, { k: 'marginLine', label: 'Red margin line', type: 'check', d: false }] },
    { id: 'dotgrid', name: 'Dot grid', img: 'PV:dot', pages: true, opts: [{ k: 'spacing', label: 'Dot spacing', type: 'select', v: [['5', '5 mm'], ['6.35', '0.25 in'], ['4', '4 mm']] }] },
    { id: 'graph', name: 'Graph paper', img: 'PV:graph', pages: true, opts: [{ k: 'spacing', label: 'Grid size', type: 'select', v: [['5', '5 mm'], ['6.35', '0.25 in'], ['10', '10 mm']] }] },
    { id: 'handwriting', name: 'Handwriting practice', img: 'PV:hand', pages: true, opts: [{ k: 'rowHeight', label: 'Row height', type: 'select', v: [['0.6', 'Standard (0.6 in)'], ['0.75', 'Large (0.75 in)'], ['0.5', 'Small (0.5 in)']] }] },
    { id: 'daily', name: 'Daily planner', img: 'PV:daily', pages: true, opts: [] },
    { id: 'weekly', name: 'Weekly planner', img: 'PV:weekly', pages: true, opts: [] },
    { id: 'habit', name: 'Habit tracker', img: 'PV:habit', pages: true, opts: [] },
    { id: 'blank', name: 'Blank (numbered)', img: 'PV:blank', pages: true, opts: [] },
    { id: 'sudoku', name: 'Sudoku book', img: 'PV:sudoku', count: true, opts: [
      { k: 'difficulty', label: 'Difficulty', type: 'select', v: [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert']] },
      { k: 'perPage', label: 'Puzzles per page', type: 'select', v: [['2', '2'], ['1', '1 (large print)'], ['4', '4']] },
      { k: 'solutions', label: 'Include solutions', type: 'check', d: true }] },
    { id: 'wordsearch', name: 'Word search book', img: 'PV:ws', count: true, opts: [
      { k: 'size', label: 'Grid size', type: 'select', v: [['15', '15 x 15'], ['12', '12 x 12 (kids)'], ['18', '18 x 18'], ['20', '20 x 20']] },
      { k: 'words', label: 'Your own words (optional, one per line or comma-separated; leave empty for built-in themes)', type: 'textarea' },
      { k: 'backwards', label: 'Allow backwards words', type: 'check', d: false }, { k: 'solutions', label: 'Include solutions', type: 'check', d: true }] },
    { id: 'maze', name: 'Maze book', img: 'PV:maze', count: true, opts: [
      { k: 'difficulty', label: 'Size', type: 'select', v: [['easy', 'Easy (10 wide)'], ['medium', 'Medium (16 wide)'], ['hard', 'Hard (24 wide)'], ['expert', 'Expert (32 wide)']] },
      { k: 'solutions', label: 'Include solutions', type: 'check', d: true }] },
  ];
  let cur = TYPES[0];

  // ---- pro state ----
  async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  function isPro() { try { return localStorage.getItem('bp.pro') === '1'; } catch (e) { return false; } }
  function renderPlan() {
    const pro = isPro();
    $('planHint').textContent = pro ? 'Pro: unlimited pages, no branding.' : `Free: up to ${FREE_PAGES} pages / ${FREE_PUZZLES} puzzles with a small footer. Pro removes limits.`;
    $('unlockBtn').textContent = pro ? 'Pro active' : 'Enter unlock code';
    $('unlockBtn').className = pro ? 'badge good' : 'btn ghost sm';
  }
  $('unlockBtn').addEventListener('click', () => { if (!isPro()) { $('unlockModal').classList.add('open'); $('codeMsg').textContent = ''; setTimeout(() => $('codeInput').focus(), 50); } });
  $('codeCancel').addEventListener('click', () => $('unlockModal').classList.remove('open'));
  $('codeOk').addEventListener('click', async () => {
    const code = $('codeInput').value.trim().toUpperCase();
    if (!code) return;
    if ((await sha256(code)) === PRO_HASH) { try { localStorage.setItem('bp.pro', '1'); } catch (e) {} $('unlockModal').classList.remove('open'); renderPlan(); toast('Pro unlocked on this browser. Thank you!'); }
    else $('codeMsg').textContent = 'That code is not valid. Check for typos, or email hello@blankpress.app with your receipt.';
  });
  $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('codeOk').click(); });
  $('buyBtn').href = BUY_URL;
  // auto-unlock via ?code= (link shown after checkout)
  const q = new URLSearchParams(location.search);
  if (q.get('code')) { sha256(q.get('code').trim().toUpperCase()).then((h) => { if (h === PRO_HASH) { try { localStorage.setItem('bp.pro', '1'); } catch (e) {} renderPlan(); toast('Pro unlocked. Thank you for your purchase!'); history.replaceState(null, '', location.pathname); } }); }

  let tt; function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }

  // ---- type UI ----
  const typesEl = $('types');
  TYPES.forEach((t) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'type' + (t === cur ? ' on' : ''); b.dataset.id = t.id;
    b.innerHTML = `<img src="${window.PREVIEWS[t.img.slice(3)] || ''}" alt=""><span>${t.name}</span>`;
    b.addEventListener('click', () => { cur = t; [...typesEl.children].forEach((c) => c.classList.toggle('on', c.dataset.id === t.id)); renderOpts(); updateSpec(); });
    typesEl.appendChild(b);
  });
  function renderOpts() {
    $('pagesWrap').classList.toggle('hidden', !cur.pages);
    $('countWrap').classList.toggle('hidden', !cur.count);
    const box = $('opts'); box.innerHTML = '';
    cur.opts.forEach((o) => {
      const id = 'opt_' + o.k;
      if (o.type === 'select') box.insertAdjacentHTML('beforeend', `<label for="${id}">${o.label}</label><select id="${id}">${o.v.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`);
      else if (o.type === 'check') box.insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" id="${id}" ${o.d ? 'checked' : ''}> ${o.label}</label>`);
      else if (o.type === 'textarea') box.insertAdjacentHTML('beforeend', `<label for="${id}">${o.label}</label><textarea id="${id}"></textarea>`);
    });
    box.querySelectorAll('input,select,textarea').forEach((el) => el.addEventListener('change', updateSpec));
  }
  function readOpts() {
    const o = {};
    cur.opts.forEach((opt) => {
      const el = $('opt_' + opt.k); if (!el) return;
      if (opt.type === 'check') o[opt.k] = el.checked;
      else if (opt.type === 'textarea') o[opt.k] = el.value.split(/[\n,、]/).map((s) => s.trim()).filter(Boolean);
      else o[opt.k] = isNaN(Number(el.value)) ? el.value : Number(el.value);
    });
    return o;
  }
  function buildSpec(free) {
    const pages = Math.max(24, Math.min(828, Number($('pages').value) || 120));
    const count = Math.max(1, Math.min(500, Number($('count').value) || 50));
    return {
      type: cur.id, trim: $('trim').value, bleed: $('bleed').checked, pages: cur.pages ? pages : Math.max(24, count * 2),
      count, seed: Number($('seedVal')?.value) || Math.floor(Math.random() * 1e6) + 1,
      pageNumbers: $('pageNumbers').checked, title: $('title').value.trim(), subtitle: $('subtitle').value.trim(), titlePage: !!$('title').value.trim(),
      free, options: readOpts(),
    };
  }
  function updateSpec() {
    const s = buildSpec(!isPro());
    const g = Interiors.gutterFor(s.pages);
    const [tw, th] = Interiors.TRIMS[s.trim];
    const pw = (tw + (s.bleed ? 0.125 : 0)).toFixed(3), ph = (th + (s.bleed ? 0.25 : 0)).toFixed(3);
    $('spec').innerHTML = `<span>Page size <b>${pw}" x ${ph}"</b></span><span>Inside margin <b>${g}"</b></span><span>Outside margin <b>${s.bleed ? 0.375 : 0.25}"</b></span>` + (cur.count ? `<span>Puzzles <b>${s.count}</b></span>` : `<span>Pages <b>${s.pages}</b></span>`);
  }
  ['trim', 'pages', 'count', 'bleed', 'pageNumbers', 'title'].forEach((id) => $(id).addEventListener('input', updateSpec));

  // ---- generate ----
  $('genBtn').addEventListener('click', () => {
    const pro = isPro();
    const s = buildSpec(!pro);
    $('msg').innerHTML = '';
    if (!pro) {
      if (cur.pages && s.pages > FREE_PAGES) { s.pages = FREE_PAGES; $('msg').innerHTML = `<div class="notice warn">Free plan: generated the first ${FREE_PAGES} pages so you can check the layout. <a href="${BUY_URL}">Get Pro ($29, lifetime)</a> for up to 828 pages without the footer.</div>`; }
      if (cur.count && s.count > FREE_PUZZLES) { s.count = FREE_PUZZLES; $('msg').innerHTML = `<div class="notice warn">Free plan: generated ${FREE_PUZZLES} puzzles so you can check the layout. <a href="${BUY_URL}">Get Pro ($29, lifetime)</a> for unlimited puzzles without the footer.</div>`; }
    }
    const btn = $('genBtn'); btn.disabled = true; btn.textContent = 'Generating…';
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const doc = Interiors.build(s);
        const blob = doc.toBlob();
        const name = `${(s.title || cur.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${s.trim}-${doc.pages.length}p.pdf`;
        save(blob, name);
        $('msg').insertAdjacentHTML('beforeend', `<div class="notice good">Done: ${doc.pages.length} pages, ${(blob.size / 1024).toFixed(0)} KB, ${((performance.now() - t0) / 1000).toFixed(1)} s. Upload it as your manuscript on KDP and run the previewer.</div>`);
      } catch (e) {
        $('msg').innerHTML = `<div class="notice warn">Something went wrong: ${e.message}</div>`;
      } finally { btn.disabled = false; btn.textContent = 'Generate PDF'; }
    }, 30);
  });
  function save(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  // ---- cover calc ----
  const cTrim = $('cTrim');
  Object.keys(Interiors.TRIMS).forEach((k) => cTrim.insertAdjacentHTML('beforeend', `<option ${k === '6x9' ? 'selected' : ''}>${k}</option>`));
  function coverCalc() {
    const trim = cTrim.value, pages = Math.max(24, Math.min(828, Number($('cPages').value) || 120)), paper = $('cPaper').value;
    const [tw, th] = Interiors.TRIMS[trim]; const spine = Interiors.spineWidth(pages, paper);
    const W = tw * 2 + spine + 0.25, H = th + 0.25;
    $('coverOut').innerHTML = `<span>Spine width</span><b>${spine.toFixed(3)}" (${(spine * 25.4).toFixed(1)} mm)</b><span>Full cover size</span><b>${W.toFixed(3)}" x ${H.toFixed(3)}" (${(W * 25.4).toFixed(1)} x ${(H * 25.4).toFixed(1)} mm)</b><span>At 300 dpi</span><b>${Math.round(W * 300)} x ${Math.round(H * 300)} px</b>`;
    return { trim, pages, paper };
  }
  ['cTrim', 'cPages', 'cPaper'].forEach((id) => $(id).addEventListener('input', coverCalc));
  $('coverBtn').addEventListener('click', () => { const s = coverCalc(); save(Interiors.coverTemplate(s).toBlob(), `cover-template-${s.trim}-${s.pages}p.pdf`); });

  renderOpts(); updateSpec(); coverCalc(); renderPlan();
})();
