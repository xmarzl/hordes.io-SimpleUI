# Hordes.io – Movable UI (Layout Editor)

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
| Element verschieben | Im Bearbeiten-Modus ziehen (innerstes Element gewinnt) |
| Größe ändern | Im Bearbeiten-Modus **Mausrad** über dem Element |
| Element-Liste | Button **☰ Elemente** (ein-/ausblenden, finden, einzeln reset) |
| Ein-/Ausblenden | In der Liste auf **👁 / 🚫** |
| Element finden | In der Liste auf den **Namen** (Element blinkt kurz) |
| Einzeln zurücksetzen | In der Liste auf **⟲** |
| Alles zurücksetzen | Bearbeiten-Modus → **Zurücksetzen** |

Speichern passiert automatisch (localStorage) und übersteht die automatischen
Game-Reloads. Außerhalb des Bearbeiten-Modus verhält sich das Spiel komplett
normal – Skill-Klicks, Inventar-Drag usw. werden nicht gestört.

### Ganzer Frame vs. Einzelteil

Beim Ziehen gewinnt immer das **innerste** registrierte Element:
- **HP-Leiste** / **Mana-Wut-Energie-Leiste** / **Buffs** packst du direkt an.
- Den **ganzen Spieler-/Ziel-Frame** greifst du am **Klassen-Icon** (dort liegt
  kein Einzelteil drüber).

## Was ist einzeln steuerbar?

- **Skills:** jeder Slot einzeln (+ ganze Leiste)
- **Spieler:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, ganzer Frame
- **Ziel:** Lebensleiste, Mana/Wut/Energie, Buffs/Debuffs, ganzer Frame
- **Gruppe:** pro Mitglied Leben, Mana, Buffs (+ ganze Gruppen-Frames)
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
- **Größe:** CSS `zoom` (kollidiert nicht mit Hordes’ `transform`-UI-Skala).
- **Ein-/Ausblenden:** Klasse `mui-hidden` (`display:none`), Verwaltung über die
  Element-Liste, da ausgeblendete Teile im Spiel verschwinden.
- **Robust:** `MutationObserver` auf `.layout` re-initialisiert nach Reloads;
  alles idempotent (`data-mui-*`-Marker).

## Verwandt

Volles Mod-Framework mit 30+ Mods: <https://github.com/hordesmod/kek-ui>
(dieses Script ist bewusst nur der schlanke „alles verschiebbar/ausblendbar"-Kern).
