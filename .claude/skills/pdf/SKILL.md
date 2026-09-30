---
name: pdf
description: Baut PDF, Entwurf, Exposé oder Word-Datei und übersetzt LaTeX-Fehler in einfache Sprache.
when_to_use: PDF sehen oder bauen, Word-Fassung für die Betreuung, PDF-Fehler.
argument-hint: "[entwurf | expose | docx | check]"
gruppe: arbeit
---

# /pdf: Aus Markdown wird das PDF

**Wichtig:** Nie „kompilieren“ sagen, sondern „PDF bauen“. Nie rohe LaTeX-Logs zeigen. Format
nur über `arbeit/projekt.json` ändern, nie in `latex/vorlage/` (Kit-Datei) oder
`latex/kapitel/` (generiert). Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

| Modus | Befehl | Ergebnis |
| --- | --- | --- |
| leer | `node kit/werkzeuge/pdf.mjs --json` | `Arbeit.pdf`, fehlende Kapitel gemeldet |
| `entwurf` | `pdf.mjs entwurf --json` | Wasserzeichen, Platzhalter für fehlende Kapitel |
| `expose` | `pdf.mjs expose --json` | `arbeit/expose/expose.pdf` |
| `docx` | `pdf.mjs docx --json` | `Arbeit.docx`, für Betreuung, die in Word kommentiert |
| `check` | `pdf.mjs check --json` | nur prüfen, ob Pandoc und LaTeX da sind |

Im Dashboard baut „PDF aktualisieren“ den Entwurf ohne Claude und zeigt ihn im Panel.

## 1. Werkzeuge prüfen (still)

`node kit/werkzeuge/pdf.mjs check --json`. `fehlend` leer: weiter. Für `docx` genügt Pandoc.

Fehlt `pandoc` oder `latex`: in zwei Sätzen erklären (Pandoc wandelt um, LaTeX setzt), dann
Interview „Jetzt installieren (Empfohlen)“, „Anleitung zeigen“ (Befehle aus `hinweise`),
„Später“. Installation:
- Windows: `winget install --id JohnMacFarlane.Pandoc -e --accept-source-agreements --accept-package-agreements`
  und `winget install --id MiKTeX.MiKTeX -e --accept-source-agreements --accept-package-agreements`,
  danach `initexmf --set-config-value=[MPM]AutoInstall=1` (unter
  `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\`). Erstes PDF lädt Pakete nach, einmalig Minuten.
- macOS: `brew install pandoc` und `brew install --cask mactex-no-gui` (rund 6 GB, Passwort
  tippt die Person selbst). Schlanke Alternative: `brew install tectonic`.
Danach VS Code einmal neu starten, dann `/pdf` erneut.

## 2. Bauen

Befehl laut Tabelle. Erstes Mal kann Minuten dauern: ankündigen.
Ergebnis-JSON: `ok`, `pdf` (Pfad), `seiten`, `fehler[]` (`erklaerung`, `quelle`,
`quelleZeile`, `meldung`), `warnungen[]`, `fehlende_kapitel[]`, `fehlende_werkzeuge[]`.

## 3. Fehler selbst reparieren

Eindeutige Fehler im Text der Person (Tippfehler in `\ce{}`, `\qty{}`, `\cref{}`, fehlendes
`$`, falscher Bildpfad) ohne Frage beheben, neu bauen, höchstens drei Runden.
Nicht eindeutig (Quelle fehlt in der bib, Abbildung fehlt): Interview mit konkreten Wegen
(„Quelle über /quellen aufnehmen“, „Zitat vorerst entfernen“, „Später klären“).
Umgebung (Paket, Schrift, Biber): ein Satz, Reparatur anbieten (MiKTeX-Update,
`latex.schrift` leeren). Details stehen in `latex/build/main.log`.

## 4. Abschluss

Endausgabe laut `AGENTS.md`: „PDF fertig: Arbeit.pdf, 48 Seiten.“ Höchstens drei Warnungen
als Stichpunkte. Seiten mehr als 10 % neben `arbeit.seiten`: ausdrücklich sagen.
`node kit/werkzeuge/zustand.mjs verlauf "PDF gebaut (<modus>, <seiten> Seiten)"`

Interview: „Öffnen (Empfohlen)“ (Dashboard-Panel, oder Windows `Start-Process "Arbeit.pdf"`,
macOS `open Arbeit.pdf`), „Weiter mit der Arbeit“, „Etwas sieht falsch aus“ (was genau?).

## Format und Vorlage

- Deckblatt, Ränder, Schrift, Zeilenabstand, Zitierstil, Verzeichnisse: nur `arbeit/projekt.json`
  (`latex`, `zitation`).
- Eigene Pakete oder Makros: `latex/eigene-praeambel.tex`. Wortlaut der Erklärung:
  `latex/eigene-erklaerung.tex`. Logo: `abbildungen/logo.png` (oder .pdf, .jpg).
- `latex.vorlage`: `koma` (Standard) oder `tudscr` (TU Dresden, Stand 2026-09-30 altes
  Corporate Design, mit dem Lehrstuhl klären). Eine eigene LaTeX-Vorlage der Arbeitsgruppe
  unterstützt `pdf.mjs` nicht direkt. Auf Wunsch überträgt Claude deren Vorgaben in
  `projekt.json` und `latex/eigene-praeambel.tex` oder baut eine eigene Vorlage unter
  `latex/vorlage-eigen/` (dann nur von Hand baubar, vorher per Interview klären).
- Formeln, Einheiten, Chemie: `kit/leitfaeden/naturwissenschaft/formeln-einheiten-chemie.md`.
