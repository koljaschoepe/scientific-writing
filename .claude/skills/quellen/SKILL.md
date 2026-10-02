---
name: quellen
description: Nimmt gewählte Quellen in die Arbeit auf (Literaturverzeichnis, PDF, Zitate mit Seite).
when_to_use: Dashboard meldet genommene Quellen oder Zitate, Dateien in quellen/eingang, genannte DOI, PDF oder .bib. Nicht für neue Literatursuche (recherche).
argument-hint: "[bibkey, doi oder pfad]"
gruppe: quellen
---

# /quellen: Quellen verarbeiten

**Wichtig:** Nichts erfinden (Metadaten, Seiten, Zitate). `literatur.bib` und
`.arbeit/kandidaten.json` nie ganz lesen, sondern `bib.mjs keys|list` und
`kandidaten.mjs list --kurz|neu`. Board nur über `kandidaten.mjs set|add`. Nur legale PDF-Wege.
Bei `technik.abo: pro` höchstens 2 Auswertungen parallel. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS` (DOI, PDF-Pfad oder bibkey zum Neuauswerten)

## 1. Arbeitsliste

- A: `node .claude/kit/werkzeuge/kandidaten.mjs neu` (Entscheidungen seit der letzten
  Verarbeitung, genommene ohne bib-Eintrag, Eingang).
- B: Dateien in `quellen/eingang/`.
- C: Zotero: exportiert Better BibTeX direkt nach `quellen/literatur.bib`, genügt ein Abgleich
  (`bib.mjs keys` gegen das Board). Liegt ein Export anderswo:
  `node .claude/kit/werkzeuge/bib.mjs import <datei.bib>`.
- D: Zitate aus dem Dashboard: Einträge in `quellen/notizen/<bibkey>.md` ohne `paraphrase`
  oder `kapitel` (das Journal nennt sie). Paraphrase in Arbeitssprache, Typ und Kapitel
  ergänzen, gegen das PDF gegenlesen. `seite` muss die gedruckte Seite sein. Steht nur
  `seite_pdf` da, die gedruckte Seite im PDF nachsehen und ergänzen.

Mehr als 8 Quellen: Interview „Alle jetzt (Empfohlen, etwa <n> Minuten)“, „Nur Kernquellen
(Stern oder Markierung kernquelle)“, „Die ersten 5“.

## 2. Eingang sortieren (B)

- PDF: Titel, Autoren, DOI von der ersten Seite, DOI über Crossref prüfen, nach
  `quellen/pdfs/<bibkey>.pdf` verschieben, Board-Eintrag mit `herkunft: upload`, `status: genommen`.
- `.bib` oder `.ris`: `bib.mjs import`, jeden Eintrag als `genommen` ins Board.
- Merkblatt, Prüfungsordnung, Bewertungsbogen: keine Quelle. Per Interview klären, dann nach
  `.arbeit/betreuung/` (Bewertungskriterien zusätzlich nach `.arbeit/betreuung/bewertung.md`).
  LaTeX-Vorlage der Arbeitsgruppe: siehe pdf-Skill, Abschnitt Format und Vorlage.
- Unklar: fragen.

## 3. Je Quelle

1. **bibkey:** `nachnameJahrErstesWort`, klein, ohne Umlaute (`schwaller2019molecular`),
   Kollision mit Suffix a, b.
2. **bib-Eintrag:** `node .claude/kit/werkzeuge/bib.mjs add <doi>`. Ohne DOI:
   `bib.mjs add-json <datei.json>` mit korrektem Typ (`@article`, `@book`, `@incollection`,
   `@online`, `@misc` für Preprints). Chemie-Stile: Zeitschriftenkürzel in `shortjournal`.
3. **PDF:** Open-Access-Link aus dem Board oder Unpaywall, sonst Verlagsseite mit Uni-Login
   per Playwright. Geht nicht: `pdf: null`, Interview („Selbst besorgen und in den Eingang
   legen“, „Fernleihe“, „Nur Abstract nutzen“, „Quelle verwerfen“).
4. **Auswerten:** Subagent `quellen-auswerter` mit bibkey, PDF-Pfad, Kapitel, Notiz der Person,
   Kernquelle ja oder nein.
5. **Board:** `kandidaten.mjs set <id> bibkey=<k> pdf=<pfad> ausgewertet=true zitate=<n>`.

Am Ende `node .claude/kit/werkzeuge/bib.mjs check` und `kandidaten.mjs neu --quittieren`.
`node .claude/kit/werkzeuge/zustand.mjs verlauf "<n> Quellen ausgewertet"`, Zeile in
`.arbeit/hilfsmittel.md` („Quellenauswertung mit Claude Code“).

## 4. Abschluss

Endausgabe laut `AGENTS.md`: Satz mit Anzahl verarbeitet und fehlenden PDFs, Stichpunkte nur
für Auffälliges (Widerspruch zwischen Quellen, Preprint, eine Quelle schwächt eine Annahme:
dann challengen). `Geändert:` mit den neuen Notizen.

Interview „Wie weiter?“ header „Weiter“: nächster Schritt laut Phase (Empfohlen),
„Mehr recherchieren zu <Lücke>“, „Fehlende PDFs klären“, „Pause“.
