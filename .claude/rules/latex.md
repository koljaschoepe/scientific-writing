---
paths:
  - "latex/**"
  - "arbeit/kapitel/**"
  - "arbeit/expose/**"
  - "arbeit/anhang/**"
---

# Kapiteltexte und LaTeX

Kapitel werden in Pandoc-Markdown geschrieben, nie direkt in LaTeX. `/pdf`
(`kit/werkzeuge/pdf.mjs`) wandelt sie um. `latex/kapitel/` und `latex/build/` sind
generiert: nie bearbeiten, Änderungen gehen beim nächsten Bau verloren.

## Dateien

- Ein Unterkapitel je Datei: `arbeit/kapitel/<nr>-<slug>.md`, z. B. `2-1-grundlagen-ml.md`.
  Die Nummer im Dateinamen bestimmt die Reihenfolge, falls `arbeit/zustand.json` nichts sagt.
- Einleitungstext eines Hauptkapitels vor dem ersten Unterkapitel (selten): `2-einleitung.md`.
- Sonderdateien, nie als Kapitel gesetzt: `00-zusammenfassung.md`, `00-abstract.md`
  (alternativ `arbeit/zusammenfassung.md` mit `## Zusammenfassung` und `## Abstract`),
  `99-hilfsmittel.md` (alternativ `arbeit/hilfsmittel.md`).
- Anhang: `arbeit/anhang/*.md`, je Datei ein Anhang (`# Titel`).
- Danksagung: `arbeit/danksagung.md` (nur gesetzt, wenn `latex.verzeichnisse.danksagung`).
- Hauptkapitel-Titel kommen aus `zustand.json → hauptkapitel` (setzen mit
  `node kit/werkzeuge/zustand.mjs hauptkapitel`), sonst aus `arbeit/gliederung/gliederung.md`.

## Aufbau einer Kapiteldatei

- Erste Zeile `## 2.1 Titel`, Unterabschnitte `### 2.1.1 Titel`. Nummern dürfen stehen,
  LaTeX nummeriert selbst, pdf.mjs entfernt sie. Nie `#` (das wäre ein Hauptkapitel).
- Absätze durch Leerzeile trennen. Keine harten Zeilenumbrüche nötig.

## Zitate

- `[@bibkey]`, mit Seite `[@bibkey, S. 4]`, mehrere `[@a; @b]`, mit „vgl.“
  `[vgl. @bibkey, S. 4]`, Autor im Satz `@bibkey zeigt ...`.
- Nur Schlüssel, die in `quellen/literatur.bib` stehen. Nie einen Schlüssel erfinden.
- Das Literaturverzeichnis erzeugt biblatex automatisch im gewählten Stil. Nie von Hand.

## Formeln, Einheiten, Chemie

- Inline `$E = mc^2$`, abgesetzt `$$ ... $$`. Nummeriert und verweisbar:
  `$$\Delta G = \Delta H - T\Delta S$$ {#eq:gibbs}`, Verweis `\cref{eq:gibbs}`.
- Chemische Formeln und Reaktionen immer mit mhchem: `\ce{H2SO4}`, `\ce{A + B -> C}`,
  `\ce{Fe^3+}`, `\ce{^{13}C}`. Nie `H$_2$O` von Hand.
- Zahlen mit Einheit immer mit siunitx: `\qty{5.0}{\milli\litre}`, `\qty{80}{\celsius}`,
  nur Einheit `\unit{\kilo\joule\per\mole}`, Zahl `\num{1.5e-3}`. In der Zahl immer Punkt
  als Dezimaltrenner, siunitx setzt das deutsche Komma selbst.
- Strukturformeln bei Bedarf mit `\chemfig{...}`, besser als Abbildung aus ChemDraw o. ä.
- Details: `kit/leitfaeden/naturwissenschaft/formeln-einheiten-chemie.md`.

## Abbildungen und Tabellen

- Abbildung: `![Beschriftung.](abbildungen/datei.png){#fig:name width=80%}`, Datei liegt in
  `abbildungen/`. Vektorgrafik (PDF) oder PNG mit mindestens 300 dpi.
- Tabelle als Pipe-Tabelle, Beschriftung darunter: `: Beschriftung {#tbl:name}`.
- Verweise immer `\cref{fig:name}`, `\cref{tbl:name}` (setzt „Abbildung 3“ bzw. „Tabelle 2“),
  nie „die folgende Abbildung“ oder eine feste Nummer.
- Jede Abbildung und Tabelle wird im Text erwähnt, bevor sie erscheint.

## Sonderzeichen im Fließtext

- `&`, `%`, `#`, `_` im normalen Fließtext einfach tippen, Pandoc maskiert sie. Nur
  innerhalb von LaTeX-Befehlen (`\ce{}`, `\qty{}`, `\chemfig{}`) gelten LaTeX-Regeln.
- Abkürzungen wie „z. B.“, „d. h.“ normal tippen, pdf.mjs setzt das schmale Leerzeichen.
- Anführungszeichen: normale `"..."` tippen, Pandoc macht typografische daraus.

## Was nie in Kapitel gehört

Deckblatt, Verzeichnisse, Erklärung, Literaturliste: die erzeugt die Vorlage aus
`arbeit/projekt.json`, `arbeit/begriffe.md` und `arbeit/hilfsmittel.md`.
