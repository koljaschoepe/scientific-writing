---
name: pdf
description: Baut aus den eigenen Kapiteln PDF, Entwurf, Exposé oder Word-Datei und erklärt Fehler beim Bauen.
when_to_use: „Mach mir das PDF“, Word für die Betreuung, PDF-Fehler, Ränder oder Deckblatt. Nicht für Quell-PDFs (quellen).
argument-hint: "[entwurf | expose | docx | check]"
gruppe: arbeit
---

# /pdf: Aus Markdown wird das PDF

**Wichtig:** Nie „kompilieren“ sagen, sondern „PDF bauen“. Nie rohe LaTeX-Logs zeigen. Format
nur über `.arbeit/einstellungen.md` (Abschnitte Layout, Zitieren) ändern, nie in
`.claude/kit/latex/` (Kit) oder `.lokal/` (generiert). Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

| Modus | Befehl | Ergebnis |
| --- | --- | --- |
| leer | `node .claude/kit/werkzeuge/pdf.mjs --json` | `Arbeit.pdf`, fehlende Kapitel gemeldet |
| `entwurf` | `pdf.mjs entwurf --json` | Wasserzeichen, Platzhalter für fehlende Kapitel |
| `expose` | `pdf.mjs expose --json` | `Expose.pdf` |
| `docx` | `pdf.mjs docx --json` | `Arbeit.docx`, für Betreuung, die in Word kommentiert |
| `check` | `pdf.mjs check --json` | nur prüfen, ob Pandoc und LaTeX da sind |

Im Dashboard baut „PDF aktualisieren“ den Entwurf ohne Claude. Nach jedem Bau zeigt es echte
Seiten je Kapitel statt der Schätzung.

## 1. Werkzeuge prüfen (still)

`node .claude/kit/werkzeuge/pdf.mjs check --json`. `fehlend` leer: weiter. Für `docx` genügt
Pandoc. Fehlt `pandoc` oder `latex`: `pdf/installieren.md` lesen und befolgen.

## 2. Bauen

Befehl laut Tabelle. Erstes Mal kann Minuten dauern: ankündigen.
Ergebnis-JSON: `ok`, `pdf` (Pfad), `seiten`, `fehler[]` (`erklaerung`, `quelle`,
`quelleZeile`, `meldung`), `warnungen[]`, `fehlende_kapitel[]`, `fehlende_werkzeuge[]`.

## 3. Fehler selbst reparieren

Eindeutige Fehler im Text der Person (Tippfehler in `\ce{}`, `\qty{}`, `\cref{}`, fehlendes
`$`, falscher Bildpfad) ohne Frage beheben, neu bauen, höchstens drei Runden.
Nicht eindeutig (Quelle fehlt in der bib, Abbildung fehlt): Interview mit konkreten Wegen
(„Quelle über quellen-Skill aufnehmen“, „Zitat vorerst entfernen“, „Später klären“).
Umgebung (Paket, Schrift, Biber): ein Satz, Reparatur anbieten (MiKTeX-Update,
`layout.schrift` leeren). Details in `.lokal/build/main.log`, nur gezielt lesen.

## 4. Abschluss

Endausgabe laut `AGENTS.md`: „PDF fertig: Arbeit.pdf, 48 Seiten.“ Höchstens drei Warnungen
als Stichpunkte. Seiten außerhalb von `arbeit.seiten` (mehr als 10 %): ausdrücklich sagen.
`node .claude/kit/werkzeuge/zustand.mjs verlauf "PDF gebaut (<modus>, <seiten> Seiten)"`

Interview: „Öffnen (Empfohlen)“ (Dashboard-Panel, oder Windows `Start-Process "Arbeit.pdf"`,
macOS `open Arbeit.pdf`), „Weiter mit der Arbeit“, „Etwas sieht falsch aus“ (was genau?).

## Format, Vorlage, Formeln

Fragen zu Rändern, Schrift, Deckblatt, Logo, eigener Vorlage: `pdf/vorlage.md`. Formeln,
Einheiten, Chemie: `.claude/kit/leitfaeden/naturwissenschaft/formeln-einheiten-chemie.md`.
