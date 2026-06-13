// ==UserScript==
// @name         Hordes.io – Movable UI (Layout Editor)
// @namespace    https://hordes.io/
// @version      3.4.0
// @description  Jedes UI-Element einzeln verschieben & per Rand-Griff skalieren (inkl. Buff-Icon-Größe und Minimap selbst), ein-/ausblenden, Hintergründe abschalten, Layout exportieren/importieren. Im Bearbeiten-Modus werden Spiel-Tooltips/Klicks blockiert. Speichert alles, übersteht Game-Reloads.
// @author       xmarzl
// @match        https://hordes.io/play
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* =========================================================================
   *  NAMEN
   * ========================================================================= */
  const MENU_NAMES = {
    sysgem: 'Shop / Edelsteine', syschar: 'Charakter', sysbook: 'Skills / Buch',
    sysbag: 'Inventar', syspvp: 'PvP', sysclan: 'Klan', systrophy: 'Erfolge',
    syssocial: 'Sozial', syscog: 'Einstellungen', sysfullscreen: 'Vollbild', sysback: 'Zurück',
  };
  function tlName(el, i) {
    if (el.classList.contains('party')) return 'Party-Button';
    if (el.id === 'partybtn') return 'Party-Status';
    if (el.classList.contains('textexp')) return 'EXP / h';
    if (el.classList.contains('textcyan')) return 'Gold / h';
    return 'Status ' + (i + 1);
  }

  /* =========================================================================
   *  REGISTRIERUNGEN (nur Einzelteile)   rz:true => per Rand-Griff skalierbar
   * ========================================================================= */
  const REG = [
    // ---- Skills: jeder Slot einzeln ----
    {
      cat: 'Skills', sel: '#skillbar > .slot', multi: true,
      id: (el, i) => 'skill_' + ((el.id && el.id !== 'sk') ? el.id : 'i' + i),
      name: (el, i) => { const k = el.querySelector('.key'); const t = k && k.textContent.trim(); return 'Skill ' + (t || ('#' + (i + 1))); },
    },

    // ---- Spieler ----
    { cat: 'Spieler', sel: '#ufplayer .iconcontainer', id: 'player_icon', name: 'Spieler: Klassen-Icon' },
    { cat: 'Spieler', sel: '#ufplayer .bar:not(.dark)', id: 'player_hp', name: 'Spieler: Lebensleiste', rz: true },
    { cat: 'Spieler', sel: '#ufplayer .bar.dark', id: 'player_mp', name: 'Spieler: Mana / Wut / Energie', rz: true },
    { cat: 'Spieler', sel: '#ufplayer .tag', id: 'player_tag', name: 'Spieler: Fraktions-Icon' },
    { cat: 'Spieler', sel: '#ufplayer .buffarray', multi: true, rz: true,
      id: (el, i) => 'player_buffs_' + i, name: (el, i) => 'Spieler: Buffs / Debuffs' + (i ? ' ' + (i + 1) : '') },

    // ---- Ziel ----
    { cat: 'Ziel', sel: '#uftarget .iconcontainer', id: 'target_icon', name: 'Ziel: Klassen-Icon' },
    { cat: 'Ziel', sel: '#uftarget .bar:not(.dark)', id: 'target_hp', name: 'Ziel: Lebensleiste', rz: true },
    { cat: 'Ziel', sel: '#uftarget .bar.dark', id: 'target_mp', name: 'Ziel: Mana / Wut / Energie', rz: true },
    { cat: 'Ziel', sel: '#uftarget .tag', id: 'target_tag', name: 'Ziel: Fraktions-Icon' },
    { cat: 'Ziel', sel: '#uftarget .buffarray', multi: true, rz: true,
      id: (el, i) => 'target_buffs_' + i, name: (el, i) => 'Ziel: Buffs / Debuffs' + (i ? ' ' + (i + 1) : '') },

    // ---- Gruppe (erscheint mit aktiver Party) ----
    { cat: 'Gruppe', sel: '.partyframes .bar:not(.dark)', multi: true, rz: true,
      id: (el, i) => 'party_hp_' + i, name: (el, i) => 'Gruppe: Leben #' + (i + 1) },
    { cat: 'Gruppe', sel: '.partyframes .bar.dark', multi: true, rz: true,
      id: (el, i) => 'party_mp_' + i, name: (el, i) => 'Gruppe: Mana #' + (i + 1) },
    { cat: 'Gruppe', sel: '.partyframes .buffarray', multi: true, rz: true,
      id: (el, i) => 'party_buffs_' + i, name: (el, i) => 'Gruppe: Buffs #' + (i + 1) },

    // ---- Menü-Buttons (oben rechts, jeder einzeln) ----
    { cat: 'Menü-Buttons', sel: '.l-corner-ur .btnbar > div', multi: true,
      id: (el, i) => 'menu_' + (el.id || ('i' + i)), name: (el, i) => MENU_NAMES[el.id] || ('Button ' + (i + 1)) },

    // ---- Statusleiste (oben links, einzeln) ----
    { cat: 'Statusleiste', sel: '.l-corner-ul .btnbar > div', multi: true,
      id: (el, i) => 'tl_' + (el.id || (el.classList.contains('party') ? 'party'
        : el.classList.contains('textexp') ? 'exp' : el.classList.contains('textcyan') ? 'gold' : 'i' + i)),
      name: tlName },

    // ---- Diverses ----
    { cat: 'Diverses', sel: '#minimapcontainer canvas', id: 'minimap', name: 'Minimap', rz: true },
    { cat: 'Diverses', sel: '.l-corner-ll', id: 'chat', name: 'Chat', rz: true },
    { cat: 'Diverses', sel: '#expbar', id: 'expbar', name: 'EXP-Leiste', rz: true },
  ];

  const OPTIONS = [
    { key: 'noskillbg',  cls: 'mui-opt-noskillbg',  name: 'Skill-Leiste: Hintergrund ausblenden' },
    { key: 'noslotbg',   cls: 'mui-opt-noslotbg',   name: 'Skill-Slots: Rahmen ausblenden' },
    { key: 'nobarframe', cls: 'mui-opt-nobarframe', name: 'HP/Mana: Rahmen ausblenden' },
  ];
  // HP/MP-Text-Schalter (Body-Klassen; greifen auf allen HP/MP-Leisten)
  const TEXTOPTS = [
    { key: 'hpnoname',  cls: 'simpleui-hp-noname',  name: 'Lebensleiste: Name ausblenden' },
    { key: 'hpnonum',   cls: 'simpleui-hp-nonum',   name: 'Lebensleiste: Zahl ausblenden' },
    { key: 'hppct',     cls: 'simpleui-hp-pct',     name: 'Lebensleiste: Zahl in Prozent' },
    { key: 'mpnolevel', cls: 'simpleui-mp-nolevel', name: 'Mana/Wut/Energie: Level ausblenden' },
    { key: 'mpnonum',   cls: 'simpleui-mp-nonum',   name: 'Mana/Wut/Energie: Zahl ausblenden' },
    { key: 'mppct',     cls: 'simpleui-mp-pct',     name: 'Mana/Wut/Energie: Zahl in Prozent' },
  ];

  const CAT_ORDER = ['Skills', 'Spieler', 'Ziel', 'Gruppe', 'Buffs/Debuffs', 'Menü-Buttons', 'Statusleiste', 'Diverses', 'Fenster'];
  const CURSOR = { e: 'ew-resize', w: 'ew-resize', n: 'ns-resize', s: 'ns-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
  // Spiel-Events, die im Bearbeiten-Modus blockiert werden (Tooltips, Fenster öffnen, Kamera)
  const BLOCK_EVENTS = ['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'contextmenu', 'wheel'];

  const STORAGE_KEY = 'hordes-movable-ui-v3';
  const EDGE = 8;

  /* =========================================================================
   *  STATE
   * ========================================================================= */
  let state = loadState();                 // { items:{id:{l,t,w,h,bs,hidden}}, options:{} }
  const registry = new Map();              // id -> { el, name, cat }
  const splitObservers = new Map();        // baseBuffId -> { obs, pos, neg }
  let editMode = false, listOpen = false, hashImported = false;
  let drag = null, hoverHost = null, layoutObserver = null, saveTimer = null;

  const cssEsc = (window.CSS && CSS.escape) ? CSS.escape : (s) => String(s).replace(/[^\w-]/g, '\\$&');
  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function enc(s) { return btoa(unescape(encodeURIComponent(s))); }
  function dec(s) { return decodeURIComponent(escape(atob(s))); }

  function loadState() {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) { const p = JSON.parse(r); if (p && p.items) { p.options = p.options || {}; return p; } } } catch (e) {}
    return { items: {}, options: {} };
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }, 200); }
  function cfgOf(id) { return (state.items[id] = state.items[id] || {}); }
  function elOf(id) { return document.querySelector('[data-mui-id="' + cssEsc(id) + '"]'); }

  /* =========================================================================
   *  HELFER
   * ========================================================================= */
  function ancestorScale(el) {
    let s = 1, n = el.parentElement;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.transform && cs.transform !== 'none') { try { s *= new DOMMatrixReadOnly(cs.transform).a; } catch (e) {} }
      const z = parseFloat(cs.zoom); if (!isNaN(z) && z > 0) s *= z;
      n = n.parentElement;
    }
    return s || 1;
  }
  function ensurePositioned(el) { if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; }

  function applySaved(el, id) {
    const c = state.items[id];
    el.classList.remove('mui-hidden', 'mui-bs'); el.style.removeProperty('--mui-bs');
    if (!c) { el.style.left = el.style.top = el.style.width = el.style.height = ''; return; }
    if (c.l != null || c.t != null || c.w != null || c.h != null) ensurePositioned(el);
    el.style.left = c.l != null ? c.l + 'px' : '';
    el.style.top = c.t != null ? c.t + 'px' : '';
    el.style.width = c.w != null ? c.w + 'px' : '';
    el.style.height = c.h != null ? c.h + 'px' : '';
    if (c.bs != null) { el.style.setProperty('--mui-bs', c.bs + 'px'); el.classList.add('mui-bs'); }
    if (c.hidden) el.classList.add('mui-hidden');
  }
  function applyOptions() {
    OPTIONS.forEach(o => document.body.classList.toggle(o.cls, !!state.options[o.key]));
    TEXTOPTS.forEach(o => document.body.classList.toggle(o.cls, !!state.options[o.key]));
  }

  // Prozent-Anzeige in HP/MP-Leisten (eigene Span, aus Balkenbreite gespeist)
  function setupPctBars() {
    document.querySelectorAll('.progressBar.bghealth:not(.hpdelta):not(.simpleui-pct-initd), .progressBar.bgmana:not(.simpleui-pct-initd)').forEach(pb => {
      pb.classList.add('simpleui-pct-initd');
      const span = document.createElement('span'); span.className = 'simpleui-pct';
      pb.appendChild(span);
      const upd = () => { const w = parseFloat(pb.style.width); span.textContent = (isNaN(w) ? 0 : Math.round(w)) + '%'; };
      upd();
      new MutationObserver(upd).observe(pb, { attributes: true, attributeFilter: ['style'] });
    });
  }

  // Namens-Labels im Editor: nahe oberem Bildschirmrand nach unten klappen
  function updateLabelDirs() {
    if (!editMode) return;
    document.querySelectorAll('[data-mui-id]').forEach(el => {
      if (el.closest('#mui-panel') || el.closest('#mui-list')) return;
      const r = el.getBoundingClientRect();
      el.classList.toggle('mui-lbl-below', r.top < 40);
    });
  }
  function reapplyAll() { document.querySelectorAll('[data-mui-id]').forEach(el => applySaved(el, el.dataset.muiId)); }

  /* =========================================================================
   *  SCAN / REGISTRIERUNG
   * ========================================================================= */
  function register(el, id, name, cat, rz) {
    if (!el) return;
    if (!el.dataset.muiReg) {
      el.dataset.muiReg = '1'; el.dataset.muiId = id; el.dataset.muiName = name;
      if (rz) el.dataset.muiResizable = '1';
      ensurePositioned(el); applySaved(el, id);
    }
    const had = registry.has(id);
    registry.set(id, { el, name, cat });
    if (!had && listOpen) scheduleListRender();
  }

  function scan() {
    if (!document.querySelector('.layout')) return;
    if (layoutObserver) layoutObserver.disconnect();
    try {
      REG.forEach(r => {
        const els = r.multi ? document.querySelectorAll(r.sel) : (document.querySelector(r.sel) ? [document.querySelector(r.sel)] : []);
        els.forEach((el, i) => register(el, r.multi ? r.id(el, i) : r.id, r.multi ? r.name(el, i) : r.name, r.cat, r.rz));
      });
      document.querySelectorAll('.window').forEach(el => {
        const t = el.querySelector('.titleframe .title') || el.querySelector('[name="title"]');
        const title = (t ? t.textContent.trim() : '') || 'Fenster';
        register(el, 'win:' + title, title, 'Fenster', true);
      });
      setupPctBars();
      injectSettingsTab();
      if (state.options.splitbuffs) document.querySelectorAll('.buffarray[data-mui-id]:not(.mui-splitsource)').forEach(setupSplit);
    } catch (err) { /* nie den Tab blockieren */ }
    finally { if (layoutObserver) { const lay = document.querySelector('.layout'); if (lay) layoutObserver.observe(lay, { childList: true, subtree: true }); } }
  }
  const queueScan = debounce(scan, 200);
  const scheduleListRender = debounce(() => { if (listOpen) renderList(); }, 400);

  /* =========================================================================
   *  DRAG & RESIZE
   * ========================================================================= */
  function hostFromEvent(e) {
    const host = e.target.closest('[data-mui-id]');
    if (!host || host.closest('#mui-panel') || host.closest('#mui-list')) return null;
    return host;
  }
  function resizeZone(host, e) {
    const r = host.getBoundingClientRect();
    const E = Math.max(4, Math.min(EDGE, r.width / 3, r.height / 3));
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const L = x <= E, R = x >= r.width - E, T = y <= E, B = y >= r.height - E;
    if (T && L) return 'nw'; if (T && R) return 'ne'; if (B && L) return 'sw'; if (B && R) return 'se';
    if (L) return 'w'; if (R) return 'e'; if (T) return 'n'; if (B) return 's';
    return null;
  }
  function isInOurUI(t) { return t.closest && (t.closest('#mui-panel') || t.closest('#mui-list')); }

  function onPointerDown(e) {
    if (!editMode || e.button !== 0) return;
    if (isInOurUI(e.target)) return;
    e.preventDefault(); e.stopPropagation();           // Spiel im Edit-Modus nie reagieren lassen
    const host = hostFromEvent(e); if (!host) return;
    ensurePositioned(host);
    const cs = getComputedStyle(host);
    const zone = host.dataset.muiResizable ? resizeZone(host, e) : null;
    const slot = host.querySelector('.slot');
    drag = {
      host, id: host.dataset.muiId, mode: zone || 'move', scale: ancestorScale(host),
      isBuff: host.classList.contains('buffarray') || host.classList.contains('mui-bcont'),
      sx: e.clientX, sy: e.clientY,
      bl: parseFloat(cs.left) || 0, bt: parseFloat(cs.top) || 0,
      bw: host.offsetWidth, bh: host.offsetHeight,
      bbs: (slot ? slot.offsetWidth : 0) || 28,
    };
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
    host.classList.add('mui-dragging');
  }

  function doDragMove(e) {
    const d = drag, s = d.scale;
    const dx = (e.clientX - d.sx) / s, dy = (e.clientY - d.sy) / s;
    const c = cfgOf(d.id);
    if (d.mode === 'move') {
      const l = Math.round(d.bl + dx), t = Math.round(d.bt + dy);
      d.host.style.left = l + 'px'; d.host.style.top = t + 'px'; c.l = l; c.t = t;
      saveSoon(); return;
    }
    const horiz = d.mode.includes('e') || d.mode.includes('w');
    const vert = d.mode.includes('n') || d.mode.includes('s');

    if (horiz) {
      let w = d.bw, l = d.bl;
      if (d.mode.includes('e')) w = d.bw + dx;
      if (d.mode.includes('w')) { w = d.bw - dx; l = d.bl + dx; }
      w = Math.max(12, Math.round(w)); d.host.style.width = w + 'px'; c.w = w;
      if (d.mode.includes('w')) { d.host.style.left = Math.round(l) + 'px'; c.l = Math.round(l); }
    }
    if (vert) {
      if (d.isBuff) {
        // bei Buffs: vertikal = Icon-Größe statt Container-Höhe
        const vd = (d.mode.includes('s') ? dy : 0) + (d.mode.includes('n') ? -dy : 0);
        const bs = Math.max(12, Math.min(96, Math.round(d.bbs + vd)));
        d.host.style.setProperty('--mui-bs', bs + 'px'); d.host.classList.add('mui-bs'); c.bs = bs;
      } else {
        let h = d.bh, t = d.bt;
        if (d.mode.includes('s')) h = d.bh + dy;
        if (d.mode.includes('n')) { h = d.bh - dy; t = d.bt + dy; }
        h = Math.max(8, Math.round(h)); d.host.style.height = h + 'px'; c.h = h;
        if (d.mode.includes('n')) { d.host.style.top = Math.round(t) + 'px'; c.t = Math.round(t); }
      }
    }
    saveSoon();
  }

  function onPointerMove(e) {
    if (drag) { e.preventDefault(); e.stopPropagation(); doDragMove(e); return; }
    if (!editMode) return;
    e.stopPropagation();                               // Hover/Kamera des Spiels unterbinden
    let host = e.target.closest('[data-mui-id]');
    if (host && isInOurUI(host)) host = null;
    if (hoverHost && hoverHost !== host) { hoverHost.style.cursor = ''; hoverHost = null; }
    if (!host) return;
    const zone = host.dataset.muiResizable ? resizeZone(host, e) : null;
    host.style.cursor = zone ? CURSOR[zone] : 'move';
    hoverHost = host;
  }
  function onPointerUp(e) { if (editMode) e.stopPropagation(); if (!drag) return; drag.host.classList.remove('mui-dragging'); drag = null; updateLabelDirs(); }

  // Blockt alle übrigen Spiel-Events im Bearbeiten-Modus (Tooltips, Klicks, Zoom)
  function swallow(e) {
    if (!editMode || isInOurUI(e.target)) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }

  /* =========================================================================
   *  AKTIONEN
   * ========================================================================= */
  function setHidden(id, hidden) {
    const c = cfgOf(id); if (hidden) c.hidden = 1; else delete c.hidden;
    const el = elOf(id); if (el) el.classList.toggle('mui-hidden', !!hidden);
    saveSoon(); if (listOpen) renderList();
  }
  function resetOne(id) {
    delete state.items[id];
    const el = elOf(id); if (el) applySaved(el, id);
    saveSoon(); if (listOpen) renderList();
  }
  function resetAll() {
    if (!confirm('Alle Positionen, Größen, Sichtbarkeiten und Optionen zurücksetzen?')) return;
    state.items = {}; state.options = {}; applyOptions(); reapplyAll(); saveSoon(); if (listOpen) renderList();
  }
  function toggleOption(key) { state.options[key] = !state.options[key]; applyOptions(); saveSoon(); if (listOpen) renderList(); }
  let flashTimer = null;
  function flash(id) {
    const el = elOf(id); if (!el) return;
    if (cfgOf(id).hidden) setHidden(id, false);
    el.classList.add('mui-flash'); clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('mui-flash'), 1100);
  }

  function exportLayout() {
    const code = enc(JSON.stringify({ items: state.items, options: state.options }));
    try { navigator.clipboard.writeText(code); } catch (e) {}
    window.prompt('Layout-Code (ist bereits kopiert – sonst Strg/Cmd+C):', code);
  }
  function importLayout() {
    const code = window.prompt('Layout-Code hier einfügen:');
    if (code) applyImport(code.trim());
  }
  function applyImport(code) {
    try {
      const obj = JSON.parse(dec(code));
      if (!obj || typeof obj !== 'object' || !obj.items) throw new Error('bad');
      state.items = obj.items || {}; state.options = obj.options || {};
      applyOptions(); reapplyAll(); saveSoon(); if (listOpen) renderList();
    } catch (e) { window.alert('Ungültiger Layout-Code.'); }
  }
  function importFromHash() {
    if (hashImported) return;
    const m = (location.hash || '').match(/mui=([^&]+)/);
    if (m) {
      hashImported = true;
      applyImport(decodeURIComponent(m[1]));
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
  }

  /* =========================================================================
   *  BUFF/DEBUFF-TRENNUNG (Klon-basiert, Svelte-sicher, opt-in)
   *  Wir fassen Sveltes Buff-Slots NICHT an, sondern spiegeln sie in zwei
   *  eigene Container (.mui-bcont): positive -> Buffs, negative -> Debuffs.
   * ========================================================================= */
  function buffPrefix(id) {
    return id.indexOf('player') === 0 ? 'Spieler' : id.indexOf('target') === 0 ? 'Ziel' : id.indexOf('party') === 0 ? 'Gruppe' : 'Buffs';
  }
  function cloneInto(baseEl, pos, neg) {
    try {
      const slots = baseEl.querySelectorAll('.slot');
      const fp = document.createDocumentFragment(), fn = document.createDocumentFragment();
      slots.forEach(s => { const c = s.cloneNode(true); c.removeAttribute('id'); (s.classList.contains('negative') ? fn : fp).appendChild(c); });
      pos.replaceChildren(fp); neg.replaceChildren(fn);
    } catch (e) {}
  }
  function setupSplit(baseEl) {
    if (!baseEl || baseEl.dataset.muiSplit) return;
    const baseId = baseEl.dataset.muiId; if (!baseId) return;
    const old = splitObservers.get(baseId);
    if (old) { try { old.obs.disconnect(); } catch (e) {} old.pos.remove(); old.neg.remove(); }
    baseEl.dataset.muiSplit = '1'; baseEl.classList.add('mui-splitsource');
    const prefix = buffPrefix(baseId);
    const pos = document.createElement('div'); pos.className = 'mui-bcont';
    const neg = document.createElement('div'); neg.className = 'mui-bcont';
    const parent = baseEl.parentElement || document.querySelector('.layout');
    parent.appendChild(pos); parent.appendChild(neg);
    register(pos, baseId + '__pos', prefix + ': Buffs', 'Buffs/Debuffs', true);
    register(neg, baseId + '__neg', prefix + ': Debuffs', 'Buffs/Debuffs', true);
    const doClone = debounce(() => cloneInto(baseEl, pos, neg), 120);
    const obs = new MutationObserver(doClone);
    obs.observe(baseEl, { childList: true, subtree: true });
    splitObservers.set(baseId, { obs, pos, neg });
    cloneInto(baseEl, pos, neg);
  }
  function teardownSplit(baseId) {
    const rec = splitObservers.get(baseId); if (!rec) return;
    try { rec.obs.disconnect(); } catch (e) {}
    rec.pos.remove(); rec.neg.remove();
    registry.delete(baseId + '__pos'); registry.delete(baseId + '__neg');
    const base = elOf(baseId);
    if (base) { base.classList.remove('mui-splitsource'); delete base.dataset.muiSplit; applySaved(base, baseId); }
    splitObservers.delete(baseId);
  }
  function setSplitBuffs(on) {
    state.options.splitbuffs = on;
    if (on) document.querySelectorAll('.buffarray[data-mui-id]:not(.mui-splitsource)').forEach(setupSplit);
    else [...splitObservers.keys()].forEach(teardownSplit);
    saveSoon(); if (listOpen) renderList();
  }

  /* =========================================================================
   *  SETTINGS-INTEGRATION: eigener Reiter „Movable UI" im Spiel-Settings-Fenster
   * ========================================================================= */
  function suiBtn(label, onClick) {
    const b = document.createElement('div'); b.className = 'btn blue simpleui-btn'; b.textContent = label;
    b.addEventListener('click', onClick); return b;
  }
  function suiToggleRow(grid, label, isOn, onToggle) {
    const a = document.createElement('div'); a.textContent = label;
    const b = document.createElement('div'); b.className = 'btn checkbox' + (isOn ? ' active' : '');
    b.addEventListener('click', () => { b.classList.toggle('active'); onToggle(); });
    grid.appendChild(a); grid.appendChild(b);
  }
  function suiHead(grid, text) {
    const a = document.createElement('div'); a.className = 'textprimary'; a.textContent = text;
    const b = document.createElement('div'); grid.appendChild(a); grid.appendChild(b);
  }
  function buildSettingsPane() {
    const pane = document.createElement('div'); pane.className = 'menu panel-black scrollbar simpleui-pane'; pane.style.display = 'none';
    const h = document.createElement('h3'); h.className = 'textprimary'; h.textContent = 'Movable UI'; pane.appendChild(h);
    const actions = document.createElement('div'); actions.className = 'simpleui-actions';
    actions.appendChild(suiBtn('✏️ Bearbeiten-Modus (F8)', () => {
      const win = pane.closest('.window'); const x = win && win.querySelector('.titleframe img[src*="cross"]');
      if (x) x.click();
      setEditMode(true);
    }));
    actions.appendChild(suiBtn('☰ Elemente-Liste', () => { setListOpen(!listOpen); }));
    actions.appendChild(suiBtn('⤓ Export', exportLayout));
    actions.appendChild(suiBtn('⤒ Import', importLayout));
    actions.appendChild(suiBtn('↺ Reset', resetAll));
    pane.appendChild(actions);
    const grid = document.createElement('div'); grid.className = 'settings simpleui-grid';
    suiHead(grid, 'Hintergründe');
    OPTIONS.forEach(o => suiToggleRow(grid, o.name, !!state.options[o.key], () => toggleOption(o.key)));
    suiHead(grid, 'Buffs');
    suiToggleRow(grid, 'Buffs & Debuffs trennen', !!state.options.splitbuffs, () => setSplitBuffs(!state.options.splitbuffs));
    suiHead(grid, 'Lebensleiste (Text)');
    ['hpnoname', 'hpnonum', 'hppct'].forEach(k => suiToggleRow(grid, TEXTOPTS.find(t => t.key === k).name, !!state.options[k], () => toggleOption(k)));
    suiHead(grid, 'Mana / Wut / Energie (Text)');
    ['mpnolevel', 'mpnonum', 'mppct'].forEach(k => suiToggleRow(grid, TEXTOPTS.find(t => t.key === k).name, !!state.options[k], () => toggleOption(k)));
    pane.appendChild(grid);
    return pane;
  }
  function injectSettingsTab() {
    const $divide = document.querySelector('.window .divide:not(.simpleui-initd)');
    if (!$divide) return;
    $divide.classList.add('simpleui-initd');
    const $choices = $divide.querySelector(':scope > div');
    const $gameMenu = $divide.querySelector(':scope > .menu');
    if (!$choices) return;
    const $choice = document.createElement('div'); $choice.className = 'choice simpleui-choice'; $choice.textContent = 'Movable UI';
    $choices.appendChild($choice);
    const $pane = buildSettingsPane();
    $divide.appendChild($pane);
    const activate = () => {
      $divide.querySelectorAll('.choice').forEach(c => c.classList.remove('active'));
      $choice.classList.add('active');
      if ($gameMenu) $gameMenu.style.display = 'none';
      $pane.style.display = '';
    };
    const deactivate = () => { $choice.classList.remove('active'); $pane.style.display = 'none'; if ($gameMenu) $gameMenu.style.display = ''; };
    $choice.addEventListener('click', activate);
    $choices.querySelectorAll('.choice:not(.simpleui-choice)').forEach(c => c.addEventListener('click', deactivate));
  }

  /* =========================================================================
   *  PANEL & LISTE
   * ========================================================================= */
  function setEditMode(on) {
    editMode = on;
    document.body.classList.toggle('mui-editing', on);
    const p = document.getElementById('mui-panel'); if (p) p.classList.toggle('mui-open', on);
    const t = document.getElementById('mui-toggle'); if (t) t.textContent = on ? '✓ Fertig' : '⛶ Layout';
    if (hoverHost) { hoverHost.style.cursor = ''; hoverHost = null; }
    if (on) updateLabelDirs();
    if (!on) setListOpen(false);
  }
  function setListOpen(on) {
    listOpen = on;
    const l = document.getElementById('mui-list'); if (l) l.classList.toggle('mui-show', on);
    const b = document.getElementById('mui-listbtn'); if (b) b.classList.toggle('mui-active', on);
    if (on) renderList();
  }

  function renderList() {
    const l = document.getElementById('mui-list'); if (!l) return;
    let html = '<div class="mui-list-head"><div class="mui-list-title">Elemente'
      + '<div class="mui-io"><button class="mui-act" data-act="export">⤓ Export</button><button class="mui-act" data-act="import">⤒ Import</button></div></div>'
      + '<span class="mui-list-hint">Mitte = verschieben · Rand = Größe · bei Buffs oben/unten = Icon-Größe</span></div>';

    html += '<div class="mui-cat">Optionen</div>';
    OPTIONS.forEach(o => {
      const on = !!state.options[o.key];
      html += '<div class="mui-row mui-optrow" data-opt="' + o.key + '"><span class="mui-row-name">' + o.name + '</span><button class="mui-opt' + (on ? ' mui-on' : '') + '">' + (on ? '✓' : '✗') + '</button></div>';
    });
    const sb = !!state.options.splitbuffs;
    html += '<div class="mui-row mui-optrow" data-split="1"><span class="mui-row-name">Buffs &amp; Debuffs trennen</span><button class="mui-opt' + (sb ? ' mui-on' : '') + '">' + (sb ? '✓' : '✗') + '</button></div>';

    const byCat = new Map();
    registry.forEach((entry, id) => {
      if (!document.body.contains(entry.el)) return;
      if (entry.el.classList && entry.el.classList.contains('mui-splitsource')) return;
      const a = byCat.get(entry.cat) || []; a.push([id, entry]); byCat.set(entry.cat, a);
    });
    const cats = CAT_ORDER.filter(c => byCat.has(c)).concat([...byCat.keys()].filter(c => !CAT_ORDER.includes(c)));
    cats.forEach(cat => {
      html += '<div class="mui-cat">' + cat + '</div>';
      byCat.get(cat).forEach(([id, entry]) => {
        const hidden = !!cfgOf(id).hidden;
        html += '<div class="mui-row' + (hidden ? ' mui-row-hidden' : '') + '" data-id="' + String(id).replace(/"/g, '&quot;') + '">'
          + '<span class="mui-row-name">' + entry.name + '</span>'
          + '<button class="mui-eye" title="Ein-/Ausblenden">' + (hidden ? '🚫' : '👁') + '</button>'
          + '<button class="mui-reset-one" title="Zurücksetzen">⟲</button></div>';
      });
    });
    l.innerHTML = html;
  }

  function buildPanel() {
    if (document.getElementById('mui-panel')) return;

    const list = document.createElement('div');
    list.id = 'mui-list';
    list.addEventListener('click', e => {
      const act = e.target.closest('.mui-act'); if (act) { act.dataset.act === 'export' ? exportLayout() : importLayout(); return; }
      if (e.target.closest('[data-split]')) { setSplitBuffs(!state.options.splitbuffs); return; }
      const opt = e.target.closest('.mui-optrow'); if (opt) { toggleOption(opt.dataset.opt); return; }
      const row = e.target.closest('.mui-row'); if (!row) return;
      const id = row.dataset.id; if (!id) return;
      if (e.target.closest('.mui-eye')) setHidden(id, !cfgOf(id).hidden);
      else if (e.target.closest('.mui-reset-one')) resetOne(id);
      else flash(id);
    });
    document.body.appendChild(list);

    const panel = document.createElement('div');
    panel.id = 'mui-panel';
    panel.innerHTML = '<button id="mui-toggle" type="button">⛶ Layout</button>'
      + '<div id="mui-actions">'
      + '<button id="mui-listbtn" type="button">☰ Elemente</button>'
      + '<span class="mui-hint">Mitte ziehen = verschieben · Rand ziehen = Größe</span>'
      + '<button id="mui-reset" type="button">Zurücksetzen</button></div>';
    document.body.appendChild(panel);

    document.getElementById('mui-toggle').addEventListener('click', () => setEditMode(!editMode));
    document.getElementById('mui-listbtn').addEventListener('click', () => setListOpen(!listOpen));
    document.getElementById('mui-reset').addEventListener('click', resetAll);
  }

  /* =========================================================================
   *  STYLES
   * ========================================================================= */
  function injectCSS() {
    if (document.getElementById('mui-style')) return;
    const css = `
      /* Ausblenden OHNE Verrutschen der Nachbarn: Box bleibt erhalten */
      .mui-hidden{ visibility:hidden !important; pointer-events:none !important; }
      .mui-editing .mui-hidden{ visibility:visible !important; opacity:.4 !important; pointer-events:auto !important; }

      .mui-opt-noskillbg #skillbar{ background:transparent !important; border-color:transparent !important; box-shadow:none !important; }
      .mui-opt-noslotbg #skillbar > .slot{ background:transparent !important; border-color:transparent !important; box-shadow:none !important; }
      .mui-opt-nobarframe .barsInner{ background:transparent !important; border-color:transparent !important; box-shadow:none !important; }

      /* Buffs: umbrechbar (Slots liegen unter .container) + eigene Icon-Größe */
      .buffarray[data-mui-id] > .container{ display:flex !important; flex-wrap:wrap !important; align-content:flex-start; width:100%; }
      .mui-editing .buffarray[data-mui-id]{ min-width:20px; min-height:20px; }
      .buffarray[data-mui-id].mui-bs .slot{ width:var(--mui-bs) !important; height:var(--mui-bs) !important; min-width:0 !important; min-height:0 !important; }
      .buffarray[data-mui-id].mui-bs .slot img{ width:100% !important; height:100% !important; max-width:none !important; }

      /* Geteilte Buff/Debuff-Container (Klone, Svelte-sicher) */
      .mui-bcont{ position:absolute; display:flex; flex-wrap:wrap; align-content:flex-start; gap:1px; }
      .mui-editing .mui-bcont{ min-width:24px; min-height:24px; }
      .mui-bcont.mui-bs .slot{ width:var(--mui-bs) !important; height:var(--mui-bs) !important; min-width:0 !important; min-height:0 !important; }
      .mui-bcont .slot img{ max-width:none !important; }
      .mui-bcont.mui-bs .slot img{ width:100% !important; height:100% !important; }
      .mui-splitsource{ position:absolute !important; width:1px !important; height:1px !important; overflow:hidden !important; opacity:0 !important; pointer-events:none !important; }

      /* HP/MP-Text-Optionen */
      .simpleui-hp-noname  .progressBar.bghealth > .left{ display:none !important; }
      .simpleui-hp-nonum   .progressBar.bghealth > .right{ display:none !important; }
      .simpleui-mp-nolevel .progressBar.bgmana > .left{ display:none !important; }
      .simpleui-mp-nonum   .progressBar.bgmana > .right{ display:none !important; }
      .simpleui-pct{ position:absolute; right:7px; z-index:1; display:none; }
      .simpleui-hp-pct .progressBar.bghealth > .right{ display:none !important; }
      .simpleui-hp-pct .progressBar.bghealth > .simpleui-pct{ display:inline !important; }
      .simpleui-mp-pct .progressBar.bgmana > .right{ display:none !important; }
      .simpleui-mp-pct .progressBar.bgmana > .simpleui-pct{ display:inline !important; }

      /* Panel nur im Bearbeiten-Modus sichtbar */
      body:not(.mui-editing) #mui-panel{ display:none !important; }

      /* Settings-Reiter „Movable UI" */
      .simpleui-choice{ cursor:pointer; }
      .simpleui-pane h3{ margin-top:0; }
      .simpleui-actions{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .simpleui-actions .simpleui-btn{ cursor:pointer; }
      .simpleui-grid{ display:grid; grid-template-columns:2fr 1fr; gap:6px 10px; align-items:center; }
      .simpleui-grid .textprimary{ margin-top:8px; }
      .simpleui-grid .btn.checkbox{ justify-self:start; }

      /* Bearbeiten-Modus */
      .mui-editing .slotdescription{ display:none !important; }   /* Spiel-Tooltips aus */
      .mui-editing [data-mui-id]{ outline:1px dashed rgba(120,200,255,.55); outline-offset:1px; cursor:move; }
      .mui-editing [data-mui-resizable]{ outline-color:rgba(150,255,210,.6); }
      .mui-editing [data-mui-id]:hover{ outline-width:2px; outline-style:solid; }
      .mui-editing [data-mui-id].mui-dragging{ outline:2px solid rgba(255,210,120,.95); }
      .mui-editing [data-mui-id]::after{
        content:attr(data-mui-name); position:absolute; top:0; left:0; transform:translateY(-100%);
        background:rgba(18,22,30,.92); color:#cfe8ff; font:600 11px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif;
        padding:1px 6px; border-radius:5px 5px 0 0; white-space:nowrap; pointer-events:none; z-index:2147483646; opacity:.9; }
      .mui-editing [data-mui-id]:hover::after{ opacity:1; background:rgba(18,22,30,.98); }
      .mui-editing [data-mui-id].mui-lbl-below::after{ top:auto; bottom:0; transform:translateY(100%); border-radius:0 0 5px 5px; }
      #mui-panel [data-mui-id], #mui-list [data-mui-id]{ outline:none !important; }
      #mui-panel [data-mui-id]::after, #mui-list [data-mui-id]::after{ content:none !important; }

      @keyframes muiFlash{ 0%,100%{ outline-color:rgba(255,220,120,0);} 50%{ outline-color:rgba(255,220,120,1);} }
      .mui-flash{ outline:3px solid rgba(255,220,120,1) !important; outline-offset:2px; animation:muiFlash .55s ease-in-out 2; }

      #mui-panel{ position:fixed; right:14px; bottom:14px; z-index:2147483647; display:flex; align-items:center; gap:8px;
        font:600 13px/1 -apple-system,"Segoe UI",system-ui,sans-serif; color:#e7f1ff; user-select:none; }
      #mui-panel button{ appearance:none; border:1px solid rgba(120,160,200,.35); background:rgba(20,26,36,.82);
        backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); color:#e7f1ff; padding:8px 14px; border-radius:10px;
        cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,.35); transition:background .15s,border-color .15s,transform .05s; }
      #mui-panel button:hover{ background:rgba(34,44,60,.92); border-color:rgba(150,200,255,.6); }
      #mui-panel button:active{ transform:translateY(1px); }
      #mui-toggle{ font-weight:700; }
      #mui-panel.mui-open #mui-toggle{ background:rgba(40,90,70,.92); border-color:rgba(120,255,180,.55); }
      #mui-actions{ display:none; align-items:center; gap:8px; }
      #mui-panel.mui-open #mui-actions{ display:flex; }
      #mui-listbtn.mui-active{ background:rgba(40,70,110,.92); border-color:rgba(150,200,255,.7); }
      #mui-panel .mui-hint{ background:rgba(20,26,36,.82); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
        border:1px solid rgba(120,160,200,.25); border-radius:10px; padding:8px 12px; color:#acc4dd; font-weight:500; }

      #mui-list{ position:fixed; right:14px; bottom:64px; z-index:2147483647; width:320px; max-height:64vh; overflow-y:auto;
        display:none; background:rgba(16,20,28,.95); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        border:1px solid rgba(120,160,200,.3); border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,.5);
        color:#e7f1ff; font:500 13px/1.4 -apple-system,"Segoe UI",system-ui,sans-serif; padding:10px; }
      #mui-list.mui-show{ display:block; }
      .mui-list-head{ padding:2px 4px 8px; border-bottom:1px solid rgba(120,160,200,.2); margin-bottom:6px; }
      .mui-list-title{ display:flex; align-items:center; justify-content:space-between; font-weight:700; font-size:14px; }
      .mui-io{ display:flex; gap:6px; }
      .mui-io .mui-act{ appearance:none; border:1px solid rgba(120,160,200,.35); background:rgba(30,38,52,.8); color:#e7f1ff;
        font:600 11px/1 -apple-system,system-ui,sans-serif; padding:5px 8px; border-radius:7px; cursor:pointer; }
      .mui-io .mui-act:hover{ background:rgba(50,64,86,.95); }
      .mui-list-hint{ display:block; font-weight:500; font-size:10px; color:#8aa4be; margin-top:6px; }
      .mui-cat{ font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#7fa7d6; font-weight:700; margin:10px 4px 3px; }
      .mui-row{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:4px; padding:3px 4px; border-radius:7px; }
      .mui-optrow{ grid-template-columns:1fr auto; }
      .mui-row:hover{ background:rgba(120,160,200,.14); }
      .mui-row-name{ cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .mui-row-name:hover{ color:#ffe07a; }
      .mui-row-hidden .mui-row-name{ opacity:.45; text-decoration:line-through; }
      .mui-row button{ appearance:none; border:1px solid rgba(120,160,200,.3); background:rgba(30,38,52,.7); color:#e7f1ff;
        width:26px; height:24px; border-radius:6px; cursor:pointer; font-size:12px; line-height:1; padding:0; }
      .mui-row button:hover{ background:rgba(50,64,86,.95); }
      .mui-opt.mui-on{ background:rgba(40,90,70,.9); border-color:rgba(120,255,180,.55); }
      #mui-list::-webkit-scrollbar{ width:9px; }
      #mui-list::-webkit-scrollbar-thumb{ background:rgba(120,160,200,.35); border-radius:6px; }
    `;
    const s = document.createElement('style'); s.id = 'mui-style'; s.textContent = css; document.head.appendChild(s);
  }

  /* =========================================================================
   *  LISTENER (einmalig)
   * ========================================================================= */
  function wireGlobalListeners() {
    if (document.body.dataset.muiListeners) return;
    document.body.dataset.muiListeners = '1';
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    BLOCK_EVENTS.forEach(t => document.addEventListener(t, swallow, { capture: true, passive: false }));
    window.addEventListener('keydown', e => { if (e.key === 'F8') { e.preventDefault(); setEditMode(!editMode); } });
  }

  /* =========================================================================
   *  BOOT (idempotent – verkraftet Game-Reloads)
   * ========================================================================= */
  function boot() {
    if (!document.querySelector('.layout')) return;
    injectCSS(); buildPanel(); wireGlobalListeners(); applyOptions();
    if (!layoutObserver) layoutObserver = new MutationObserver(queueScan);
    scan();
    importFromHash();
  }
  new MutationObserver(() => { if (document.querySelector('.layout')) boot(); }).observe(document.body, { childList: true, subtree: true });
  boot();
})();
