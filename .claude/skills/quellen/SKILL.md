---
name: quellen
description: Verarbeitet genommene Quellen, Uploads, Zotero-Exporte und Dashboard-Zitate zu bib-Eintrag, PDF und Zitaten mit Seite.
when_to_use: Nach Entscheidungen im Quellen-Board, Dateien in quellen/eingang, genannte DOI, PDF oder .bib.
argument-hint: "[bibkey, doi oder pfad]"
gruppe: quellen
---

# /quellen: Quellen verarbeiten

**Wichtig:** Nichts erfinden (Metadaten, Seiten, Zitate). `literatur.bib` und
`kandidaten.json` nie ganz lesen, sondern `node kit/werkzeuge/bib.mjs keys|list` und
`node kit/werkzeuge/kandidaten.mjs list --kurz|neu`. Board nur über `kandidaten.mjs set|add`.
Nur legale PDF-Wege. Bei Claude Pro höchstens 2 Auswertungen parallel. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS` (DOI, PDF-Pfad oder bibkey zum Neuauswerten)

## 1. Arbeitsliste

- A: `node kit/werkzeuge/kandidaten.mjs neu` (Entscheidungen seit der letzten Verarbeitung,
  genommen und noch nicht ausgewertet).
- B: Dateien in `quellen/eingang/`.
- C: Zotero: exportiert Better BibTeX direkt nach `quellen/literatur.bib`, genügt ein Abgleich
  (`bib.mjs keys` gegen das Board). Liegt ein Export anderswo:
  `node kit/werkzeuge/bib.mjs import <datei.bib>`.
- D: Zitate aus dem Dashboard: neue Einträge in `quellen/zitate/<bibkey>.md` ohne
  `paraphrase` oder `kapitel` (das Journal nennt sie). Paraphrase in Arbeitssprache,
  Typ und Kapitel ergänzen, gegen das PDF gegenlesen, Seite prüfen.

Mehr als 8 Quellen: Interview „Alle jetzt (Empfohlen, etwa <n> Minuten)“, „Nur Kernquellen
(Stern oder Markierung kernquelle)“, „Die ersten 5“.

## 2. Eingang sortieren (B)

- PDF: Titel, Autoren, DOI von der ersten Seite, DOI über Crossref prüfen, nach
  `quellen/pdfs/<bibkey>.pdf` verschieben, Board-Eintrag `herkunft: upload`, `status: genommen`.
- `.bib` oder `.ris`: `bib.mjs import`, jeden Eintrag als `genommen` ins Board.
- Merkblatt, Prüfungsordnung, Bewertungsbogen: keine Quelle. Per Interview klären, dann nach
  `arbeit/betreuung/` (Bewertungskriterien zusätzlich nach `arbeit/betreuung/bewertung.md`
  übertragen). Eine LaTeX-Vorlage der Arbeitsgruppe: siehe `/pdf`, Abschnitt Vorlage.
- Unklar: fragen.

## 3. Je Quelle

1. **bibkey:** `nachnameJahrErstesWort`, klein, ohne Umlaute (`schwaller2019molecular`),
   Kollision mit Suffix a, b.
2. **bib-Eintrag:** `node kit/werkzeuge/bib.mjs add <doi>`. Ohne DOI:
   `bib.mjs add-json <datei.json>` mit korrektem Typ (`@article`, `@book`, `@incollection`,
   `@online`, `@misc` für Preprints). Chemie-Stile: Zeitschriftenkürzel in `shortjournal`.
3. **PDF:** Open-Access-Link aus dem Board oder Unpaywall, sonst Verlagsseite mit Uni-Login
   per Playwright. Geht nicht: `pdf: null`, Interview („Selbst besorgen und in den Eingang
   legen“, „Fernleihe“, „Nur Abstract nutzen“, „Quelle verwerfen“).
4. **Auswerten:** Subagent `quellen-auswerter` mit bibkey, PDF-Pfad, Kapitel, Notiz der Person,
   Kernquelle ja/nein, Sprache der Arbeit, Pfad der Gliederung.
5. **Board:** `kandidaten.mjs set <id> bibkey=<k> pdf=<pfad> ausgewertet=true zitate=<n>`.

Am Ende `node kit/werkzeuge/bib.mjs check` und `node kit/werkzeuge/kandidaten.mjs neu --quittieren`
(merkt die Entscheidungen als verarbeitet).
`node kit/werkzeuge/zustand.mjs verlauf "<n> Quellen ausgewertet"`, Zeile in
`arbeit/hilfsmittel.md` („Quellenauswertung mit Claude Code“).

## 4. Abschluss

Endausgabe laut `AGENTS.md`: Satz mit Anzahl verarbeitet und fehlenden PDFs, Stichpunkte nur
für Auffälliges (Widerspruch zwischen Quellen, Preprint, eine Quelle schwächt eine Annahme:
dann challengen). `Geändert:` mit den neuen Zitatedateien.

Interview „Wie weiter?“ header „Weiter“: nächster Schritt laut Phase (Empfohlen),
„Mehr recherchieren zu <Lücke>“, „Fehlende PDFs klären“, „Pause“.
