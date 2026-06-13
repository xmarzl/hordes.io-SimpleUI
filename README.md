# Hordes.io – Movable UI (Layout Editor)

<img width="3314" height="2224" alt="Bildschirmfoto 2026-06-13 um 12 30 30" src="https://github.com/user-attachments/assets/1e2d0c5a-f2ef-42bd-819c-0bbe42cf4691" />

A lightweight userscript that makes **every single UI element** on
[hordes.io](https://hordes.io/play) movable, resizable and hideable — modern,
minimal, no dependencies.

**Languages:** [English](#english) · [Deutsch](#deutsch)

---

## English

### Installation

1. Install the **Tampermonkey** browser extension (Chrome/Edge/Firefox).
2. Drag the file `hordes-movable-ui.user.js` into the Tampermonkey dashboard
   (or create a new script and paste its contents).
3. Save, open / reload `https://hordes.io/play`.

A **⛶ Layout** button appears in the bottom-right corner.

### Usage

| Action | How |
|---|---|
| Toggle edit mode | **⛶ Layout** button or the **`F8`** key |
| Move an element | In edit mode, drag the **center** (innermost element wins) |
| Resize | In edit mode, drag an **edge/corner** (resize cursor appears) |
| Element list & options | **☰ Elements** button |
| Export / import layout | In the list header: **⤓ Export** / **⤒ Import** |
| Show / hide | In the list: **👁 / 🚫** |
| Locate an element | Click its **name** in the list (it flashes) |
| Reset one | **⟲** in the list |
| Reset everything | Edit mode → **Reset** |

While edit mode is on, the script blocks the game's normal input (skill
tooltips, window-opening clicks, camera) so you can arrange things precisely.

**Hiding never shifts neighbours:** hidden parts keep their box
(`visibility`), so hiding e.g. skill slot 5 won't push slots 6/7 — shared
layouts stay intact. In edit mode hidden parts show as dimmed ghosts.

The **Options** section (top of the list) removes distracting backgrounds
(skill-bar background, skill-slot frames, HP/Mana frame) and can **split
buffs and debuffs** into two separate, freely placeable containers — so the
individual parts float freely without container boxes.

### Save / transfer your layout (export / import)

So you never have to redo your setup after an update:

- **⤓ Export** shows a layout code (also copied to your clipboard).
- **⤒ Import** asks for a code and restores the layout instantly.
- A link like `…/play#mui=<code>` auto-imports the layout on load.

Script updates do **not** reset your saved positions, but exporting now and
then is a good backup.

### Move vs. Resize

In edit mode each element reacts based on where you grab it:
- **Drag center** → move.
- **Drag edge/corner** → resize (the matching cursor appears).
- The **innermost** element always wins — an HP bar, mana bar or buff
  container is grabbed directly, not the whole frame.
- **Buffs/debuffs:** **side edges** = width (controls wrapping: wide = many in
  a row, narrow = stacked), **top/bottom edges** = **icon size**.
- **Minimap:** resizing scales the actual map (the canvas), not just a frame.

### What is individually controllable?

- **Skills:** every slot individually
- **Player:** health bar, mana/rage/energy, buffs/debuffs, class icon, faction icon
- **Target:** health bar, mana/rage/energy, buffs/debuffs, class icon, faction icon
- **Party:** per member health, mana, buffs
- **Menu buttons:** each top-right button (shop, character, inventory …)
- **Status bar:** Party button, party status, **EXP/h**, **Gold/h** separately
- **Misc:** chat, minimap, EXP bar, every open window

> Party entries appear in the list once a party is active; the target appears
> as soon as you target something.

### Customize

Edit the `REG` list at the top of `hordes-movable-ui.user.js`. Only stable
Hordes IDs/structure classes are used (`#skillbar`, `#ufplayer`, `#uftarget`,
`#minimapcontainer`, `.partyframes`, `.l-corner-*`); the volatile
`svelte-xxxx` classes are deliberately avoided.

### Technical notes

- **Move:** `position:relative` + `left/top`; the mouse delta is divided by the
  effective UI scale of the ancestors so dragging follows the cursor 1:1.
- **Resize:** edge/corner zones start a resize instead of a move and set
  `width`/`height` (buff containers use `flex-wrap` for reflow).
- **Hide backgrounds:** body classes (`mui-opt-*`) hide the skill bar,
  slot frames and HP/Mana frame without removing the content.
- **Hide:** class `mui-hidden` via `visibility` (keeps the box, no reflow).
- **Robust:** a throttled, self-detaching `MutationObserver` on `.layout`
  re-initialises after reloads; everything is idempotent (`data-mui-*` markers).

---

## Deutsch

Ein schlankes UserScript, das **jedes einzelne UI-Element** auf
[hordes.io](https://hordes.io/play) verschieb-, skalier- und ein-/ausblendbar
macht. Modern, minimal, ohne Abhängigkeiten.

### Installation

1. Browser-Erweiterung **Tampermonkey** installieren (Chrome/Edge/Firefox).
2. Datei `hordes-movable-ui.user.js` per Drag&Drop ins Tampermonkey-Dashboard
   ziehen (oder neues Script anlegen und Inhalt einfügen).
3. Speichern, `https://hordes.io/play` öffnen / neu laden.

Unten rechts erscheint der **⛶ Layout**-Button.

### Bedienung

| Aktion | Wie |
|---|---|
| Bearbeiten-Modus an/aus | Button **⛶ Layout** oder Taste **`F8`** |
| Element verschieben | Im Bearbeiten-Modus die **Mitte** ziehen (innerstes Element gewinnt) |
| Größe ändern | Im Bearbeiten-Modus an **Rand/Ecke** ziehen (Resize-Cursor) |
| Element-Liste & Optionen | Button **☰ Elemente** |
| Layout export/import | In der Liste oben **⤓ Export** / **⤒ Import** |
| Ein-/Ausblenden | In der Liste auf **👁 / 🚫** |
| Element finden | In der Liste auf den **Namen** (Element blinkt kurz) |
| Einzeln zurücksetzen | In der Liste auf **⟲** |
| Alles zurücksetzen | Bearbeiten-Modus → **Zurücksetzen** |

Im Bearbeiten-Modus blockiert das Script die normalen Spiel-Eingaben
(Skill-Tooltips, Fenster-Klicks, Kamera), damit man präzise arbeiten kann.

**Ausblenden verrutscht nichts:** ausgeblendete Teile behalten ihre Box
(`visibility`), d. h. Slot 5 auszublenden schiebt Slot 6/7 nicht weg —
geteilte Layouts bleiben heil. Im Bearbeiten-Modus erscheinen sie als Geister.

In der Liste gibt es oben eine Sektion **Optionen**, um störende Hintergründe
abzuschalten (Skill-Leisten-Hintergrund, Skill-Slot-Rahmen, HP/Mana-Rahmen)
und **Buffs & Debuffs zu trennen** (zwei getrennt platzierbare Container).
So lassen sich die Einzelteile frei und ohne Container-Kästen anordnen.

### Layout sichern / übertragen (Export/Import)

Damit du nach einem Update nicht alles neu einstellen musst:

- **⤓ Export** zeigt einen Layout-Code (liegt direkt in der Zwischenablage).
- **⤒ Import** fragt nach einem Code und stellt das Layout sofort wieder her.
- Ein Link mit `…/play#mui=<code>` importiert das Layout beim Laden automatisch.

Updates des Scripts setzen deine gespeicherten Positionen **nicht** zurück –
exportiere trotzdem ab und zu zur Sicherheit.

### Verschieben vs. Größe

Im Bearbeiten-Modus reagiert jedes Element abhängig davon, wo du es packst:
- **Mitte ziehen** → verschieben.
- **Rand/Ecke ziehen** → Größe ändern (es erscheint der passende Resize-Cursor).
- Es gewinnt immer das **innerste** Element – HP-Leiste, Mana-Leiste oder ein
  Buff-Container werden direkt angefasst, nicht der ganze Frame.
- **Buffs/Debuffs:** **Seiten ziehen** = Breite (steuert Umbruch: breit = viele
  nebeneinander, schmal = untereinander), **oben/unten ziehen** = **Icon-Größe**.
- **Minimap:** Resize wirkt direkt auf die Karte selbst (das Canvas), nicht nur
  auf einen Rahmen.

### Was ist einzeln steuerbar?

- **Skills:** jeder Slot einzeln
- **Spieler:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, Klassen-Icon, Fraktions-Icon
- **Ziel:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, Klassen-Icon, Fraktions-Icon
- **Gruppe:** pro Mitglied Leben, Mana, Buffs
- **Menü-Buttons:** jeder Button oben rechts einzeln (Shop, Charakter, Inventar …)
- **Statusleiste:** Party-Button, Party-Status, **EXP/h**, **Gold/h** getrennt
- **Diverses:** Chat, Minimap, EXP-Leiste, jedes offene Fenster

> Gruppen-Einträge erscheinen in der Liste, sobald eine Party aktiv ist; das
> Ziel erscheint, sobald du etwas anvisierst.

### Anpassen

Oben in `hordes-movable-ui.user.js` die Liste `REG` bearbeiten. Nur stabile
Hordes-IDs/Strukturklassen werden genutzt (`#skillbar`, `#ufplayer`, `#uftarget`,
`#minimapcontainer`, `.partyframes`, `.l-corner-*`); die wechselnden
`svelte-xxxx`-Klassen bewusst nicht.

### Technik-Notizen

- **Verschieben:** `position:relative` + `left/top`; Maus-Delta wird durch die
  effektive UI-Skala der Vorfahren geteilt → folgt 1:1 der Maus.
- **Größe:** Rand-/Eck-Zonen am Element starten ein Resize statt eines Moves
  und setzen `width`/`height` (bei Buff-Containern via `flex-wrap` → Umbruch).
- **Hintergründe aus:** Body-Klassen (`mui-opt-*`) blenden Skill-Leiste,
  Slot-Rahmen und HP/Mana-Rahmen aus, ohne die Inhalte zu entfernen.
- **Ein-/Ausblenden:** Klasse `mui-hidden` via `visibility` (Box bleibt, kein Umbruch).
- **Robust:** `MutationObserver` auf `.layout` (gedrosselt, selbst-abgekoppelt)
  re-initialisiert nach Reloads; alles idempotent (`data-mui-*`-Marker).
