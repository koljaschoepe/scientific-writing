---
paths:
  - "kapitel/**"
  - ".arbeit/expose/**"
---

# Kapiteltexte und LaTeX

Kapitel werden in Pandoc-Markdown geschrieben, nie direkt in LaTeX. `/pdf`
(`.claude/kit/werkzeuge/pdf.mjs`) wandelt sie um. `.lokal/kapitel/` und `.lokal/build/` sind
generiert: nie bearbeiten, Änderungen gehen beim nächsten Bau verloren.

## Dateien

- Eine Datei je Schreibeinheit, auf beliebiger Ebene: `kapitel/<nr>-<slug>.md`, z. B.
  `01-einleitung.md` (ganzes Kapitel 1), `03-02-messungen.md` (Unterkapitel 3.2). Gemischt ist
  erlaubt: Kapitel 1 als eine Datei, Kapitel 3 in 3.1 und 3.2 aufgeteilt. Die Nummer im
  Dateinamen bestimmt die Reihenfolge, falls der Zustand nichts sagt.
- Ist ein Kapitel aufgeteilt, darf es zusätzlich eine Datei für die Einheit selbst geben
  (`03-experimenteller-teil.md`, nur Kopfüberschrift und kurzer Einleitungstext vor 3.1).
  Ohne sie setzt `/pdf` die Kapitelüberschrift aus dem Titel im Zustand.
- Aufteilen und zusammenführen nie von Hand, sondern
  `node .claude/kit/werkzeuge/zustand.mjs aufteilen <nr>` bzw. `zusammenfuehren <nr>`
  (verschiebt nur, vorher Kopie in `kapitel/.versionen/`).
- Sonderdateien, nie als Kapitel gesetzt: `00-zusammenfassung.md`, `00-abstract.md`
  (alternativ `.arbeit/zusammenfassung.md` mit `## Zusammenfassung` und `## Abstract`),
  `99-hilfsmittel.md` (alternativ `.arbeit/hilfsmittel.md`).
- Anhang: `kapitel/anhang/*.md`, je Datei ein Anhang (`# Titel`).
- Danksagung: `kapitel/00-danksagung.md` (nur gesetzt, wenn `danksagung` in `layout.verzeichnisse` steht).
- Eigene LaTeX-Ergänzungen der Person: `.arbeit/latex/eigene-praeambel.tex`, `eigene-erklaerung.tex`,
  `eigene.csl`. Nie in `.claude/kit/latex/` (Kit).
- Titel für Ebenen ohne eigene Datei setzt `node .claude/kit/werkzeuge/zustand.mjs hauptkapitel`.
  Sonst gilt immer die Kopfüberschrift der Datei (weicht der Zustand ab, meldet es `check.mjs`).

## Aufbau einer Kapiteldatei

- Genau eine Kopfüberschrift am Anfang, ohne Nummer, mit so vielen `#` wie die Nummer der
  Einheit Ebenen hat: Einheit `1` → `# Einleitung`, Einheit `3.2` → `## Messungen`.
  Unterabschnitte jeweils eine Ebene tiefer (`##`, `###` …), so tief wie nötig.
- Die LaTeX-Ebene folgt aus der Nummer der Einheit (`3` → Kapitel, `3.2` → Abschnitt,
  `3.2.1` → Unterabschnitt), innere Überschriften rutschen mit. Stimmt die Zahl der `#` nicht,
  geht trotzdem nichts kaputt. Alte Nummern im Titel (`## 2.1 Titel`) entfernt pdf.mjs.
- Unnummerierte Überschrift: `## Danksagung {-}`. Verweisziel: `## Messungen {#sec:messungen}`.
- Geplante Gliederung vor dem Schreiben: die Überschriften stehen schon da, darunter je ein
  Kommentar `<!-- Geplant: Kernaussage, Quellen, Daten -->`. Kommentare zählen nicht als Text.
- Absätze durch Leerzeile trennen. Keine harten Zeilenumbrüche nötig.

## Formeln, Einheiten, Chemie

- Inline `$E = mc^2$`, abgesetzt `$$ ... $$`. Nummeriert und verweisbar:
  `$$\Delta G = \Delta H - T\Delta S$$ {#eq:gibbs}`, Verweis `\cref{eq:gibbs}`.
- Chemische Formeln und Reaktionen immer mit mhchem: `\ce{H2SO4}`, `\ce{A + B -> C}`,
  `\ce{Fe^3+}`, `\ce{^{13}C}`. Nie `H$_2$O` von Hand.
- Zahlen mit Einheit immer mit siunitx: `\qty{5.0}{\milli\litre}`, `\qty{80}{\celsius}`,
  nur Einheit `\unit{\kilo\joule\per\mole}`, Zahl `\num{1.5e-3}`. In der Zahl immer Punkt
  als Dezimaltrenner, siunitx setzt das deutsche Komma selbst.
- Strukturformeln bei Bedarf mit `\chemfig{...}`, besser als Abbildung aus ChemDraw o. ä.
- Details: `.claude/kit/leitfaeden/naturwissenschaft/formeln-einheiten-chemie.md`.

## Abbildungen und Tabellen

- Abbildung: `![Beschriftung.](abbildungen/datei.png){#fig:name width=80%}`, Datei liegt in
  `abbildungen/`. Jede Abbildung, Tabelle und abgesetzte Formel zählt in die Seitenschätzung. Vektorgrafik (PDF) oder PNG mit mindestens 300 dpi.
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
`.arbeit/einstellungen.md`, `.arbeit/begriffe.md` und `.arbeit/hilfsmittel.md`.
