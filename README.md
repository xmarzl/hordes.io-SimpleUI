# Hordes.io – Movable UI (Layout Editor)

<img width="3314" height="2224" alt="Bildschirmfoto 2026-06-13 um 12 30 30" src="https://github.com/user-attachments/assets/1e2d0c5a-f2ef-42bd-819c-0bbe42cf4691" />

Ein schlankes UserScript, das **jedes einzelne UI-Element** auf
[hordes.io](https://hordes.io/play) verschieb-, skalier- und ein-/ausblendbar
macht. Modern, minimal, ohne Abhängigkeiten.

## Installation

1. Browser-Erweiterung **Tampermonkey** installieren (Chrome/Edge/Firefox).
2. Datei `hordes-movable-ui.user.js` per Drag&Drop ins Tampermonkey-Dashboard
   ziehen (oder neues Script anlegen und Inhalt einfügen).
3. Speichern, `https://hordes.io/play` öffnen / neu laden.

Unten rechts erscheint der **⛶ Layout**-Button.

## Bedienung

| Aktion | Wie |
|---|---|
| Bearbeiten-Modus an/aus | Button **⛶ Layout** oder Taste **`F8`** |
| Element verschieben | Im Bearbeiten-Modus die **Mitte** ziehen (innerstes Element gewinnt) |
| Größe ändern | Im Bearbeiten-Modus an **Rand/Ecke** ziehen (Resize-Cursor) |
| Element-Liste & Optionen | Button **☰ Elemente** |
| Ein-/Ausblenden | In der Liste auf **👁 / 🚫** |
| Element finden | In der Liste auf den **Namen** (Element blinkt kurz) |
| Einzeln zurücksetzen | In der Liste auf **⟲** |
| Alles zurücksetzen | Bearbeiten-Modus → **Zurücksetzen** |

In der Liste gibt es oben eine Sektion **Optionen**, um störende Hintergründe
abzuschalten: Skill-Leisten-Hintergrund, Skill-Slot-Rahmen, HP/Mana-Rahmen.
So lassen sich die Einzelteile frei und ohne Container-Kästen anordnen.

Speichern passiert automatisch (localStorage) und übersteht die automatischen
Game-Reloads. Außerhalb des Bearbeiten-Modus verhält sich das Spiel komplett
normal – Skill-Klicks, Inventar-Drag usw. werden nicht gestört.

### Verschieben vs. Größe

Im Bearbeiten-Modus reagiert jedes Element abhängig davon, wo du es packst:
- **Mitte ziehen** → verschieben.
- **Rand/Ecke ziehen** → Größe ändern (es erscheint der passende Resize-Cursor).
- Es gewinnt immer das **innerste** Element – HP-Leiste, Mana-Leiste oder ein
  Buff-Container werden direkt angefasst, nicht der ganze Frame.
- **Buffs/Debuffs:** Breite/Höhe des Containers steuert, wie sie umbrechen
  (breit = viele nebeneinander, schmal = untereinander).

## Was ist einzeln steuerbar?

- **Skills:** jeder Slot einzeln
- **Spieler:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, Klassen-Icon, Fraktions-Icon
- **Ziel:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, Klassen-Icon, Fraktions-Icon
- **Gruppe:** pro Mitglied Leben, Mana, Buffs
- **Menü-Buttons:** jeder Button oben rechts einzeln (Shop, Charakter, Inventar …)
- **Statusleiste:** Party-Button, Party-Status, **EXP/h**, **Gold/h** getrennt
- **Diverses:** Chat, Minimap, EXP-Leiste, jedes offene Fenster

> Gruppen-Einträge erscheinen in der Liste, sobald eine Party aktiv ist; das
> Ziel erscheint, sobald du etwas anvisierst.

## Anpassen

Oben in `hordes-movable-ui.user.js` die Liste `REG` bearbeiten. Nur stabile
Hordes-IDs/Strukturklassen werden genutzt (`#skillbar`, `#ufplayer`, `#uftarget`,
`#minimapcontainer`, `.partyframes`, `.l-corner-*`); die wechselnden
`svelte-xxxx`-Klassen bewusst nicht.

## Technik-Notizen

- **Verschieben:** `position:relative` + `left/top`; Maus-Delta wird durch die
  effektive UI-Skala der Vorfahren geteilt → folgt 1:1 der Maus.
- **Größe:** Rand-/Eck-Zonen am Element starten ein Resize statt eines Moves
  und setzen `width`/`height` (bei Buff-Containern via `flex-wrap` → Umbruch).
- **Hintergründe aus:** Body-Klassen (`mui-opt-*`) blenden Skill-Leiste,
  Slot-Rahmen und HP/Mana-Rahmen aus, ohne die Inhalte zu entfernen.
- **Ein-/Ausblenden:** Klasse `mui-hidden` (`display:none`), Verwaltung über die
  Element-Liste, da ausgeblendete Teile im Spiel verschwinden.
- **Robust:** `MutationObserver` auf `.layout` (gedrosselt, selbst-abgekoppelt)
  re-initialisiert nach Reloads; alles idempotent (`data-mui-*`-Marker).
