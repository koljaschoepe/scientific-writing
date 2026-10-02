# Stilregeln

> Kit-Standard für jeden Schritt, der Arbeitstext schreibt oder prüft. Einzige Stelle für
> Schwellen und Stilschalter, andere Dateien verweisen hierher.
> Stand: 2026-10-01

## Woher die Regeln kommen

1. **Schalter** in `.arbeit/einstellungen.md`, Abschnitt `## Stil`. Fehlt ein Wert, gilt der
   Standard aus der Tabelle unten.
2. **Freie Vorlieben und Vorgaben der Betreuung** in `.arbeit/stil.md` (Wörter, die sie nicht
   will, bevorzugte Formulierungen, Stilhinweise, „So arbeite ich“). Ergänzen die Schalter.
3. **Dieser Leitfaden** für alles Übrige.

Widerspricht `stil.md` einem Schalter (etwa „Semikolons sind erlaubt“ bei `semikolons: nein`),
gilt der Schalter. Im Hauptgespräch einmal darauf hinweisen und anbieten, den Schalter zu ändern.

## Schalter

| Schalter | Standard | Bedeutung |
| --- | --- | --- |
| `ich_form` | `nein` | `nein`: unpersönlich formulieren. `ja`: Ich-Form (oder „we“ im Englischen) erlaubt, sparsam und nur für eigene Entscheidungen |
| `gedankenstriche` | `nein` | `nein`: keine. `sparsam`: höchstens einer je Absatz, nie als Einschubpaar. `ja`: frei |
| `semikolons` | `nein` | `nein`: keine, stattdessen Punkt. `ja`: erlaubt |
| `satz_max_woerter` | `30` | längere Sätze teilen oder bewusst begründen |
| `kommas_max` | `3` | mehr Kommas in einem Satz: teilen |
| `schreibmodus` | `claude-schreibt` | `claude-schreibt`: Claude entwirft, die Person überarbeitet. `gemeinsam`: die Person schreibt, Claude überarbeitet. `ich-schreibe`: kein Fließtext von Claude, nur Plan, Leitfragen, Feedback |

## Feste Regeln

- Höchstens zwei Nominalisierungen („-ung“, „-heit“, „-keit“, englisch -tion, -ment, -ness)
  pro Satz.
- Dasselbe Inhaltswort höchstens dreimal pro Absatz und nicht in zwei benachbarten Sätzen.
  Begriffe mit „fest“ in `.arbeit/begriffe.md` sind ausgenommen.
- Nie zwei Sätze hintereinander mit demselben Anfang.
- Doppelpunkte selten.
- Begriffe genau wie in `.arbeit/begriffe.md`. Neue Begriffe dort eintragen, bevor sie im
  Text stehen.
- Zeitform: gesichertes Wissen und was die Arbeit tut im Präsens, eigene Methoden und
  Ergebnisse im Präteritum.
- Keine Floskeln, Füllwörter, Übertreibungen, Absolutismen: `verbotene-muster.md`.
- Übergänge über Konzeptnamen, keine Ankündigungen: `uebergaenge.md`.
- Wörter aus `.arbeit/stil.md` („Wörter, die ich nicht will“) kommen nicht vor.

## Wer was prüft

`node .claude/kit/werkzeuge/stil.mjs <kapiteldatei>` zählt deterministisch und liest die
Schalter selbst: Satzlänge, Kommas, Nominalstil, Wortwiederholungen, gleiche Satzanfänge,
Floskeln, Gedankenstriche, Semikolons, Ich-Form, `[BELEG FEHLT]`, TODO. Diese Punkte zählt
kein Modell nach.

Das Modell prüft, was ein Skript nicht kann: Grammatik, Rechtschreibung, Zeitform,
Lesbarkeit, ob ein Satz nach dem Teilen noch stimmt, Begriffstreue im Sinn.

## Bessere Formulierungen (de)

| Statt | Besser |
| --- | --- |
| „es gibt“ | konkretes Subjekt und Verb |
| „eine Analyse durchführen“ | „analysieren“ |
| „im Rahmen von“ | „bei“, „in“ |
| „von zentraler Bedeutung“ | „wichtig“ oder den Grund nennen |
| „in Bezug auf“ | „zu“, „für“ |
| „darüber hinaus“ (gehäuft) | „zudem“, „außerdem“ oder weglassen |
| „grundsätzlich“, „im Prinzip“, „an sich“ | streichen |

Allgemein: das konkrete Verb statt Funktionsverbgefüge („untersuchen“ statt „eine
Untersuchung vornehmen“).
