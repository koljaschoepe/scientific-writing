---
name: pdf
description: Baut aus den Kapiteln das PDF der Arbeit (oder einen Entwurf mit Platzhaltern, oder das Exposé) und übersetzt LaTeX-Fehler in einfache Sprache.
argument-hint: "[entwurf | expose]"
disable-model-invocation: true
---

# /pdf: Aus Markdown wird das PDF

Wann brauchst du das? Wenn die Person sehen will, wie ihre Arbeit gesetzt aussieht, vor
einem Betreuungstermin, und am Ende für die Abgabe. Die Person muss nichts über LaTeX
wissen. Sprich nie von „kompilieren“, sondern von „PDF bauen“.

Argument: `$ARGUMENTS`
- leer: fertiges PDF nach `Arbeit.pdf` (fehlende Kapitel werden gemeldet, nicht gesetzt)
- `entwurf`: Entwurf mit Wasserzeichen und Platzhaltern für noch fehlende Unterkapitel
- `expose`: das Exposé aus `arbeit/expose/expose.md` als eigenes PDF nach `arbeit/expose/expose.pdf`

## 1. Werkzeuge prüfen (still)

```
node kit/werkzeuge/pdf.mjs check --json
```

`fehlend` leer: weiter mit Schritt 2.

`fehlend` enthält `pandoc` oder `latex`: Erkläre in zwei Sätzen, was fehlt und wofür
(Pandoc wandelt die Kapitel um, LaTeX setzt das PDF). Dann AskUserQuestion:
- „Jetzt installieren (Empfohlen)“: du startest die Installation selbst, siehe unten
- „Anleitung zeigen“: Befehle aus `hinweise` zum selbst Ausführen, dazu `docs/` verlinken
- „Später“: zurück, Entwurf bleibt ohne PDF

Installation, je nach Betriebssystem (`process.platform` bzw. Ausgabe von `check`):
- Windows: `winget install --id JohnMacFarlane.Pandoc -e --accept-source-agreements --accept-package-agreements`
  und `winget install --id MiKTeX.MiKTeX -e --accept-source-agreements --accept-package-agreements`.
  Danach MiKTeX einmal auf automatische Paketinstallation stellen:
  `initexmf --set-config-value=[MPM]AutoInstall=1` (liegt nach der Installation unter
  `%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\`). Hinweis an die Person: Beim ersten
  PDF lädt MiKTeX fehlende Pakete aus dem Internet, das dauert einmalig einige Minuten.
- macOS: `brew install pandoc` und `brew install --cask mactex-no-gui` (rund 6 GB, braucht
  das Mac-Passwort, die Person tippt es selbst im Terminal ein). Schlanke Alternative ohne
  Passwort: `brew install tectonic` (dann zusätzlich passender Biber nötig, siehe docs).

Nach der Installation muss VS Code einmal neu gestartet werden, damit die neuen Programme
gefunden werden. Sag das klar und biete an, danach mit `/pdf` weiterzumachen.

## 2. Bauen

```
node kit/werkzeuge/pdf.mjs <entwurf|expose> --json
```

Das dauert beim ersten Mal bis zu mehrere Minuten (MiKTeX lädt Pakete). Kündige das an.

Ergebnis-JSON:
- `ok`, `pdf` (Pfad), `seiten`, `engine`
- `fehler[]`: `erklaerung` (einfache Sprache), `quelle` + `quelleZeile` (Markdown-Datei der
  Person), `kontext`, `meldung` (Original von LaTeX)
- `warnungen[]`: fehlende Quellen, tote Verweise, nicht geschriebene Kapitel
- `fehlende_kapitel[]`, `fehlende_werkzeuge[]`

## 3. Bei Fehlern: selbst reparieren

Fehler im Text der Arbeit (Stelle in `arbeit/kapitel/...`) behebst du selbst, ohne zu fragen,
wenn die Korrektur eindeutig ist: Tippfehler in `\ce{}`, `\qty{}`, `\cref{}`, fehlendes
`$`, `&` im Fließtext, falscher Bildpfad. Danach erneut bauen. Höchstens drei Runden.

Nicht eindeutig (Quelle fehlt in `literatur.bib`, Abbildung existiert nicht, Inhalt
müsste sich ändern): AskUserQuestion mit den konkreten Möglichkeiten, zum Beispiel
„Quelle über /quellen aufnehmen“, „Zitat vorerst entfernen“, „Später klären“.

Fehler der Umgebung (Paket fehlt, Schrift fehlt, Biber-Version): Erkläre sie in einem Satz
und biete die Reparatur an (MiKTeX-Update, `latex.schrift` in `arbeit/projekt.json` leeren).

Zeig der Person nie rohe LaTeX-Logs. Die Details stehen in `latex/build/main.log` bzw.
`latex/build-expose/expose.log`, falls sie jemand braucht.

## 4. Nach Erfolg

Eine Zeile: „PDF fertig: Arbeit.pdf, 48 Seiten.“ Dazu höchstens drei Hinweise aus
`warnungen` in einfacher Sprache. Seitenzahl gegen `arbeit/projekt.json → arbeit.seiten`
halten: mehr als 10 % drüber oder drunter ausdrücklich sagen.

Protokoll:
- `node kit/werkzeuge/zustand.mjs verlauf "PDF gebaut (<modus>, <seiten> Seiten)"`

Dann AskUserQuestion:
- „PDF öffnen (Empfohlen)“: Windows `Start-Process "Arbeit.pdf"` (PowerShell), macOS
  `open Arbeit.pdf`; beim Exposé `arbeit/expose/expose.pdf`. (Bauen und direkt öffnen in
  einem Schritt: `node kit/werkzeuge/pdf.mjs --oeffnen`.)
- „Weiter mit der Arbeit“: weiter wie `/weiter`
- „Etwas sieht falsch aus“: Rückfrage, was genau (Deckblatt, Abstände, Zitate, Abbildung),
  dann gezielt beheben

## Was du anpassen darfst und was nicht

- Angaben auf Deckblatt, Ränder, Schrift, Zeilenabstand, Zitierstil, Verzeichnisse:
  ausschließlich in `arbeit/projekt.json` (Abschnitt `latex`, `zitation`). Nie in
  `latex/vorlage/`, das ist Herstellerzone und wird von `/update` überschrieben.
- Eigene LaTeX-Ergänzungen (Pakete, Makros): `latex/eigene-praeambel.tex` anlegen.
- Vorgeschriebener Wortlaut der Selbstständigkeitserklärung: `latex/eigene-erklaerung.tex`.
- Logo: `abbildungen/logo.png` (oder .pdf/.jpg) ablegen, wird automatisch verwendet.
- TU-Dresden-Klasse: `latex.vorlage = "tudscr"`. Stand 2026-09-30 setzt tudscr das alte
  Corporate Design um, vor der Abgabe mit dem Lehrstuhl klären.
- Formatierungsregeln für Formeln, Einheiten, Chemie: `kit/leitfaeden/naturwissenschaft/formeln-einheiten-chemie.md`.
