// ==UserScript==
// @name         Hordes.io – Movable UI (Layout Editor)
// @namespace    https://hordes.io/
// @version      2.0.0
// @description  Macht JEDES UI-Element auf Hordes.io einzeln verschieb-, skalier- und ein-/ausblendbar: jeder Skill, HP-/Mana-/Wut-/Energieleiste, einzelne Menü-Buttons, Party/EXP/Gold, Buffs & Debuffs von Spieler/Ziel/Gruppe. Bearbeiten-Modus per Button oder F8. Speichert alles und übersteht Game-Reloads.
// @author       du
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
   *  REGISTRIERUNGEN
   *  multi:true  -> Selektor kann mehrere Elemente matchen, id/name sind Funktionen.
   *  Reihenfolge = Reihenfolge im Element-Panel.
   * ========================================================================= */
  const REG = [
    // ---- Skills (jeder Slot einzeln) ----
    { cat: 'Skills', sel: '#skillbar', id: 'skillbar', name: 'Skill-Leiste (komplett)' },
    {
      cat: 'Skills', sel: '#skillbar > .slot', multi: true,
      id: (el, i) => 'skill_' + ((el.id && el.id !== 'sk') ? el.id : 'i' + i),
      name: (el, i) => { const k = el.querySelector('.key'); const t = k && k.textContent.trim(); return 'Skill ' + (t || ('#' + (i + 1))); },
    },

    // ---- Spieler ----
    { cat: 'Spieler', sel: '#ufplayer', id: 'player', name: 'Spieler-Frame (am Icon greifen)' },
    { cat: 'Spieler', sel: '#ufplayer .bar:not(.dark)', id: 'player_hp', name: 'Spieler: Lebensleiste' },
    { cat: 'Spieler', sel: '#ufplayer .bar.dark', id: 'player_mp', name: 'Spieler: Mana / Wut / Energie' },
    {
      cat: 'Spieler', sel: '#ufplayer .buffarray', multi: true,
      id: (el, i) => 'player_buffs_' + i,
      name: (el, i) => 'Spieler: Buffs / Debuffs' + (i ? ' ' + (i + 1) : ''),
    },

    // ---- Ziel ----
    { cat: 'Ziel', sel: '#uftarget', id: 'target', name: 'Ziel-Frame (am Icon greifen)' },
    { cat: 'Ziel', sel: '#uftarget .bar:not(.dark)', id: 'target_hp', name: 'Ziel: Lebensleiste' },
    { cat: 'Ziel', sel: '#uftarget .bar.dark', id: 'target_mp', name: 'Ziel: Mana / Wut / Energie' },
    {
      cat: 'Ziel', sel: '#uftarget .buffarray', multi: true,
      id: (el, i) => 'target_buffs_' + i,
      name: (el, i) => 'Ziel: Buffs / Debuffs' + (i ? ' ' + (i + 1) : ''),
    },

    // ---- Gruppe / Party ----
    { cat: 'Gruppe', sel: '.partyframes', id: 'party', name: 'Gruppen-Frames (komplett)' },
    {
      cat: 'Gruppe', sel: '.partyframes .bar:not(.dark)', multi: true,
      id: (el, i) => 'party_hp_' + i, name: (el, i) => 'Gruppe: Leben Mitglied ' + (i + 1),
    },
    {
      cat: 'Gruppe', sel: '.partyframes .bar.dark', multi: true,
      id: (el, i) => 'party_mp_' + i, name: (el, i) => 'Gruppe: Mana Mitglied ' + (i + 1),
    },
    {
      cat: 'Gruppe', sel: '.partyframes .buffarray', multi: true,
      id: (el, i) => 'party_buffs_' + i, name: (el, i) => 'Gruppe: Buffs Mitglied ' + (i + 1),
    },

    // ---- Menü-Buttons (oben rechts, jeder einzeln) ----
    {
      cat: 'Menü-Buttons', sel: '.l-corner-ur .btnbar > div', multi: true,
      id: (el, i) => 'menu_' + (el.id || ('i' + i)),
      name: (el, i) => MENU_NAMES[el.id] || ('Button ' + (i + 1)),
    },

    // ---- Statusleiste (oben links: Party / EXP/h / Gold/h einzeln) ----
    {
      cat: 'Statusleiste', sel: '.l-corner-ul .btnbar > div', multi: true,
      id: (el, i) => 'tl_' + (el.id || (el.classList.contains('party') ? 'party'
        : el.classList.contains('textexp') ? 'exp'
        : el.classList.contains('textcyan') ? 'gold' : 'i' + i)),
      name: tlName,
    },

    // ---- Diverses ----
    { cat: 'Diverses', sel: '#minimapcontainer', id: 'minimap', name: 'Minimap' },
    { cat: 'Diverses', sel: '.l-corner-ll', id: 'chat', name: 'Chat' },
    { cat: 'Diverses', sel: '#expbar', id: 'expbar', name: 'EXP-Leiste' },
  ];

  const CAT_ORDER = ['Skills', 'Spieler', 'Ziel', 'Gruppe', 'Menü-Buttons', 'Statusleiste', 'Diverses', 'Fenster'];

  const STORAGE_KEY = 'hordes-movable-ui-v2';
  const ZOOM_STEP = 0.05, ZOOM_MIN = 0.4, ZOOM_MAX = 2.5;

  /* =========================================================================
   *  STATE
   * ========================================================================= */
  let state = loadState();                 // { items: { id: {l,t,z,h} } }
  const registry = new Map();              // id -> { el, name, cat }
  let editMode = false, listOpen = false;
  let drag = null, layoutObserver = null, scanQueued = false, saveTimer = null;

  const cssEsc = (window.CSS && CSS.escape) ? CSS.escape : (s) => String(s).replace(/[^\w-]/g, '\\$&');

  function loadState() {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) { const p = JSON.parse(r); if (p && p.items) return p; } } catch (e) {}
    return { items: {} };
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }, 200);
  }
  function cfgOf(id) { return (state.items[id] = state.items[id] || {}); }
  function elOf(id) { return document.querySelector('[data-mui-id="' + cssEsc(id) + '"]'); }

  /* =========================================================================
   *  HELFER
   * ========================================================================= */
  // Skalierungsfaktor des Koordinatensystems der Vorfahren (transform + zoom),
  // damit das Ziehen exakt der Maus folgt – egal welche UI-Skala eingestellt ist.
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
    const c = state.items[id]; if (!c) { el.classList.remove('mui-hidden'); return; }
    if (c.l != null || c.t != null) ensurePositioned(el);
    if (c.l != null) el.style.left = c.l + 'px';
    if (c.t != null) el.style.top = c.t + 'px';
    if (c.z != null) el.style.zoom = c.z;
    el.classList.toggle('mui-hidden', !!c.h);
  }

  /* =========================================================================
   *  SCAN / REGISTRIERUNG
   * ========================================================================= */
  function register(el, id, name, cat) {
    if (!el) return;
    if (!el.dataset.muiReg) {
      el.dataset.muiReg = '1';
      el.dataset.muiId = id;
      el.dataset.muiName = name;
      ensurePositioned(el);
      applySaved(el, id);
    }
    registry.set(id, { el, name, cat });
  }

  function scan() {
    if (!document.querySelector('.layout')) return;

    REG.forEach(r => {
      const els = r.multi ? document.querySelectorAll(r.sel) : (document.querySelector(r.sel) ? [document.querySelector(r.sel)] : []);
      els.forEach((el, i) => {
        const id = r.multi ? r.id(el, i) : r.id;
        const name = r.multi ? r.name(el, i) : r.name;
        register(el, id, name, r.cat);
      });
    });

    // Offene Fenster (Inventar, Charakter, Klan …)
    document.querySelectorAll('.window').forEach(el => {
      const t = el.querySelector('[name="title"]');
      const title = (t ? t.textContent.trim() : '') || 'Fenster';
      register(el, 'win:' + title, title, 'Fenster');
    });

    if (listOpen) renderList();
  }
  function queueScan() { if (scanQueued) return; scanQueued = true; requestAnimationFrame(() => { scanQueued = false; scan(); }); }

  /* =========================================================================
   *  DRAG & ZOOM (nur im Bearbeiten-Modus)
   * ========================================================================= */
  function hostFromEvent(e) {
    const host = e.target.closest('[data-mui-id]');
    if (!host || host.closest('#mui-panel') || host.closest('#mui-list')) return null;
    return host;
  }
  function onPointerDown(e) {
    if (!editMode || e.button !== 0) return;
    const host = hostFromEvent(e); if (!host) return;
    e.preventDefault(); e.stopPropagation();
    ensurePositioned(host);
    const cs = getComputedStyle(host);
    drag = { host, id: host.dataset.muiId, scale: ancestorScale(host), sx: e.clientX, sy: e.clientY,
             bl: parseFloat(cs.left) || 0, bt: parseFloat(cs.top) || 0 };
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
    host.classList.add('mui-dragging');
  }
  function onPointerMove(e) {
    if (!drag) return;
    const l = Math.round(drag.bl + (e.clientX - drag.sx) / drag.scale);
    const t = Math.round(drag.bt + (e.clientY - drag.sy) / drag.scale);
    drag.host.style.left = l + 'px'; drag.host.style.top = t + 'px';
    const c = cfgOf(drag.id); c.l = l; c.t = t; saveSoon();
  }
  function onPointerUp() { if (!drag) { return; } drag.host.classList.remove('mui-dragging'); drag = null; }
  function onWheel(e) {
    if (!editMode) return;
    const host = hostFromEvent(e); if (!host) return;
    e.preventDefault(); e.stopPropagation();
    const c = cfgOf(host.dataset.muiId);
    let z = c.z || parseFloat(getComputedStyle(host).zoom) || 1;
    z += e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
    host.style.zoom = z; c.z = z; saveSoon();
  }

  /* =========================================================================
   *  AKTIONEN: ein-/ausblenden, einzeln/alles zurücksetzen, finden
   * ========================================================================= */
  function setHidden(id, hidden) {
    const c = cfgOf(id); if (hidden) c.h = 1; else delete c.h;
    const el = elOf(id); if (el) el.classList.toggle('mui-hidden', !!hidden);
    saveSoon(); if (listOpen) renderList();
  }
  function resetOne(id) {
    const el = elOf(id);
    if (el) { el.style.left = ''; el.style.top = ''; el.style.zoom = ''; el.classList.remove('mui-hidden'); }
    delete state.items[id]; saveSoon(); if (listOpen) renderList();
  }
  function resetAll() {
    if (!confirm('Alle UI-Positionen, Größen und Sichtbarkeiten zurücksetzen?')) return;
    document.querySelectorAll('[data-mui-id]').forEach(el => {
      el.style.left = ''; el.style.top = ''; el.style.zoom = ''; el.classList.remove('mui-hidden');
    });
    state.items = {}; saveSoon(); if (listOpen) renderList();
  }
  let flashTimer = null;
  function flash(id) {
    const el = elOf(id); if (!el) return;
    if (cfgOf(id).h) setHidden(id, false);   // ausgeblendet -> erst einblenden
    el.classList.add('mui-flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('mui-flash'), 1100);
  }

  /* =========================================================================
   *  BEARBEITEN-MODUS, PANEL & ELEMENT-LISTE
   * ========================================================================= */
  function setEditMode(on) {
    editMode = on;
    document.body.classList.toggle('mui-editing', on);
    const p = document.getElementById('mui-panel'); if (p) p.classList.toggle('mui-open', on);
    const t = document.getElementById('mui-toggle'); if (t) t.textContent = on ? '✓ Fertig' : '⛶ Layout';
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
    const byCat = new Map();
    registry.forEach((entry, id) => {
      if (!document.body.contains(entry.el)) return;        // nur aktuell vorhandene
      const arr = byCat.get(entry.cat) || []; arr.push([id, entry]); byCat.set(entry.cat, arr);
    });
    let html = '<div class="mui-list-head">Elemente <span class="mui-list-hint">Name = finden · 👁 = ein/aus · ⟲ = reset</span></div>';
    const cats = CAT_ORDER.filter(c => byCat.has(c)).concat([...byCat.keys()].filter(c => !CAT_ORDER.includes(c)));
    cats.forEach(cat => {
      html += '<div class="mui-cat">' + cat + '</div>';
      byCat.get(cat).forEach(([id, entry]) => {
        const hidden = !!cfgOf(id).h;
        html += '<div class="mui-row' + (hidden ? ' mui-row-hidden' : '') + '" data-id="' + id.replace(/"/g, '&quot;') + '">'
          + '<span class="mui-row-name">' + entry.name + '</span>'
          + '<button class="mui-eye" title="Ein-/Ausblenden">' + (hidden ? '🚫' : '👁') + '</button>'
          + '<button class="mui-reset-one" title="Zurücksetzen">⟲</button>'
          + '</div>';
      });
    });
    l.innerHTML = html;
  }

  function buildPanel() {
    if (document.getElementById('mui-panel')) return;

    const list = document.createElement('div');
    list.id = 'mui-list';
    list.addEventListener('click', e => {
      const row = e.target.closest('.mui-row'); if (!row) return;
      const id = row.dataset.id;
      if (e.target.closest('.mui-eye')) setHidden(id, !cfgOf(id).h);
      else if (e.target.closest('.mui-reset-one')) resetOne(id);
      else flash(id);
    });
    document.body.appendChild(list);

    const panel = document.createElement('div');
    panel.id = 'mui-panel';
    panel.innerHTML = `
      <button id="mui-toggle" type="button">⛶ Layout</button>
      <div id="mui-actions">
        <button id="mui-listbtn" type="button">☰ Elemente</button>
        <span class="mui-hint">Ziehen = verschieben · Mausrad = Größe</span>
        <button id="mui-reset" type="button">Zurücksetzen</button>
      </div>`;
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
      .mui-hidden{ display:none !important; }

      /* Bearbeiten-Modus: alle Boxen markieren, Label nur bei Hover */
      .mui-editing [data-mui-id]{ outline:1px dashed rgba(120,200,255,.55); outline-offset:1px; cursor:move; }
      .mui-editing [data-mui-id]:hover{ outline:2px solid rgba(120,200,255,.95); }
      .mui-editing [data-mui-id].mui-dragging{ outline:2px solid rgba(140,255,170,.95); }
      .mui-editing [data-mui-id]:hover::after{
        content:attr(data-mui-name); position:absolute; top:0; left:0; transform:translateY(-100%);
        background:rgba(18,22,30,.96); color:#cfe8ff; font:600 11px/1.5 -apple-system,"Segoe UI",system-ui,sans-serif;
        padding:2px 7px; border-radius:5px 5px 0 0; white-space:nowrap; pointer-events:none; z-index:2147483646;
      }
      #mui-panel [data-mui-id], #mui-list [data-mui-id]{ outline:none !important; }
      #mui-panel [data-mui-id]::after, #mui-list [data-mui-id]::after{ content:none !important; }

      /* Finden-Blinken */
      @keyframes muiFlash{ 0%,100%{ outline-color:rgba(255,220,120,0);} 50%{ outline-color:rgba(255,220,120,1);} }
      .mui-flash{ outline:3px solid rgba(255,220,120,1) !important; outline-offset:2px; animation:muiFlash .55s ease-in-out 2; }

      /* Steuer-Panel */
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

      /* Element-Liste */
      #mui-list{ position:fixed; right:14px; bottom:64px; z-index:2147483647; width:300px; max-height:64vh; overflow-y:auto;
        display:none; background:rgba(16,20,28,.94); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        border:1px solid rgba(120,160,200,.3); border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,.5);
        color:#e7f1ff; font:500 13px/1.4 -apple-system,"Segoe UI",system-ui,sans-serif; padding:10px; }
      #mui-list.mui-show{ display:block; }
      .mui-list-head{ font-weight:700; font-size:14px; padding:2px 4px 8px; border-bottom:1px solid rgba(120,160,200,.2); margin-bottom:6px; }
      .mui-list-hint{ display:block; font-weight:500; font-size:10px; color:#8aa4be; margin-top:2px; }
      .mui-cat{ font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#7fa7d6; font-weight:700; margin:10px 4px 3px; }
      .mui-row{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:4px; padding:3px 4px; border-radius:7px; }
      .mui-row:hover{ background:rgba(120,160,200,.14); }
      .mui-row-name{ cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .mui-row-name:hover{ color:#ffe07a; }
      .mui-row-hidden .mui-row-name{ opacity:.45; text-decoration:line-through; }
      .mui-row button{ appearance:none; border:1px solid rgba(120,160,200,.3); background:rgba(30,38,52,.7); color:#e7f1ff;
        width:26px; height:24px; border-radius:6px; cursor:pointer; font-size:12px; line-height:1; padding:0; }
      .mui-row button:hover{ background:rgba(50,64,86,.95); }
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
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('keydown', e => { if (e.key === 'F8') { e.preventDefault(); setEditMode(!editMode); } });
  }

  /* =========================================================================
   *  BOOT (idempotent – verkraftet Game-Reloads)
   * ========================================================================= */
  function boot() {
    if (!document.querySelector('.layout')) return;
    injectCSS(); buildPanel(); wireGlobalListeners(); scan();
    if (!layoutObserver) {
      layoutObserver = new MutationObserver(queueScan);
      layoutObserver.observe(document.querySelector('.layout'), { childList: true, subtree: true });
    }
  }
  new MutationObserver(() => { if (document.querySelector('.layout')) boot(); }).observe(document.body, { childList: true, subtree: true });
  boot();
})();
