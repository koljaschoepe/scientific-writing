---
name: cite
description: Fügt eine neue Quelle zur Literaturdatenbank hinzu. Nutze diesen Skill wenn der User /cite eingibt oder eine neue Quelle erfassen will.
---

# Quelle hinzufügen

Fügt eine neue Quelle und optionale Zitate zur Literaturdatenbank hinzu.

## Ablauf

### 1. Modus bestimmen

Frage den User:
"Wie möchtest du Quellen erfassen?"
- **PDF-Analyse:** "Ich habe ein PDF" -> Pfad angeben lassen
- **Manuell:** "Ich gebe die Daten ein"
- **BibTeX-Import:** "Ich habe eine .bib-Datei oder einen BibTeX-Eintrag"
- **Zotero-Import:** "Ich habe einen Zotero-Export (CSV, RIS oder BibTeX)"

### 2a. PDF-Analyse

Falls PDF:
- Starte den Agent `.claude/agents/cite-extractor.md` mit dem PDF-Pfad
- Der Agent extrahiert Metadaten und relevante Passagen
- Zeige die extrahierten Daten und frage nach Bestätigung
- Frage welche Zitate übernommen werden sollen

### 2b. Manuelle Eingabe

Frage Schritt für Schritt:
1. "Wer sind die Autoren? (Format: Nachname, V. -- bei mehreren mit / trennen)"
2. "Erscheinungsjahr?"
3. "Titel des Werks?"
4. "Welcher Typ?" -> Buch / Journal-Artikel / Sammelband / Konferenzbeitrag / Website / Report
5. Je nach Typ:
   - Buch: Verlag, Ort, Auflage
   - Journal: Zeitschrift, Jahrgang, Ausgabe, Seitenbereich
   - Website: URL, Abrufdatum
   - etc.

Danach:
"Möchtest du gleich Zitate aus dieser Quelle erfassen?"
Falls ja, für jedes Zitat:
1. "Seitenzahl?"
2. "Direktes Zitat (wörtlich) oder indirektes (sinngemäß)?"
3. "Inhalt des Zitats / Kernaussage?"

### 2c. BibTeX-Import

Falls BibTeX (.bib-Datei oder einzelner Eintrag):
- Lies die .bib-Datei mit dem Read-Tool (oder den eingefügten Text)
- Parse jeden @-Eintrag und mappe den Typ:
  - `@article` -> `journal`
  - `@book` -> `buch`
  - `@incollection` -> `sammelband`
  - `@inproceedings` / `@conference` -> `konferenz`
  - `@online` / `@misc` (mit URL) -> `website`
  - `@techreport` / `@report` -> `report`
  - `@phdthesis` / `@mastersthesis` -> `buch`

- Feld-Mapping BibTeX -> literature.md:
  | BibTeX-Feld | literature.md-Feld | Konvertierung |
  |-------------|-------------------|---------------|
  | author | autor | "Lastname, Firstname" -> "Lastname, F." / Mehrere mit "and" -> Slash-getrennt |
  | year | jahr | Direkt |
  | title | titel | Geschweifte Klammern entfernen |
  | publisher | verlag | Direkt |
  | address / location | ort | Direkt |
  | journal / journaltitle | journal | Direkt |
  | volume | jahrgang | Direkt |
  | number / issue | ausgabe | Direkt |
  | pages | seiten | Direkt (-- zu - normalisieren) |
  | doi | doi | Direkt |
  | url | url | Direkt |
  | urldate / note (Abrufdatum) | abruf | Direkt |
  | editor | herausgeber | Wie autor konvertieren |
  | booktitle | sammelbandtitel | Direkt |
  | edition | auflage | Direkt |

- quelle_id generieren: nachname_jahr (Erstautor-Nachname, lowercase, underscore)
- Duplikat-Prüfung gegen existierende literature.md (gleicher Autor + Jahr oder Titel)
- **Batch-Import:** "X Quellen erkannt. Alle importieren oder einzeln auswählen?"
  - Bei "alle": Alle Einträge in literature.md PART 1 einfügen
  - Bei "einzeln": Jeden Eintrag anzeigen und bestätigen lassen
- Zeige Vorschau der konvertierten YAML-Einträge vor dem Import

### 2d. Zotero-Import

Falls Zotero-Export:
- Frage nach Dateipfad und erkenne das Format automatisch:

**CSV-Export:**
- Lies die CSV-Datei mit dem Read-Tool
- Spalten-Mapping:
  | Zotero-Spalte | literature.md-Feld |
  |---------------|-------------------|
  | Title | titel |
  | Author | autor (Format konvertieren) |
  | Date / Year | jahr |
  | Item Type | quelle_typ (mappen: "Journal Article" -> journal, "Book" -> buch, etc.) |
  | Publication | journal |
  | Publisher | verlag |
  | Place | ort |
  | DOI | doi |
  | URL | url |
  | Pages | seiten |
  | Volume | jahrgang |
  | Issue | ausgabe |

- Item-Type-Mapping:
  - "Journal Article" / "journalArticle" -> `journal`
  - "Book" / "book" -> `buch`
  - "Book Section" / "bookSection" -> `sammelband`
  - "Conference Paper" / "conferencePaper" -> `konferenz`
  - "Web Page" / "webpage" / "Website" -> `website`
  - "Report" / "report" -> `report`
  - "Thesis" / "thesis" -> `buch`

**RIS-Export:**
- Lies die .ris-Datei mit dem Read-Tool
- Tag-Mapping:
  | RIS-Tag | literature.md-Feld |
  |---------|-------------------|
  | TY | quelle_typ (JOUR -> journal, BOOK -> buch, CHAP -> sammelband, CONF -> konferenz, ELEC -> website, RPRT -> report) |
  | AU / A1 | autor |
  | PY / Y1 | jahr |
  | TI / T1 | titel |
  | JO / JF / T2 | journal |
  | PB | verlag |
  | CY | ort |
  | VL | jahrgang |
  | IS | ausgabe |
  | SP-EP | seiten |
  | DO | doi |
  | UR | url |
  | ED / A2 | herausgeber |
  | BT / T2 | sammelbandtitel (bei CHAP) |
- Jeder Eintrag endet mit `ER  -`

**BibTeX-Export aus Zotero:**
- An den BibTeX-Import-Modus (2c) weiterleiten

- Gleiche Duplikat-Prüfung und Batch-Import-Logik wie bei BibTeX (2c)

### 3. Duplikat-Prüfung

Prüfe ob die Quelle bereits in `sources/literature.md` existiert:
- Gleicher Autor + Jahr?
- Sehr ähnlicher Titel?

Falls Duplikat: "Diese Quelle scheint bereits vorhanden zu sein: [quelle_id].
Soll ich sie aktualisieren oder als neue Quelle (mit Suffix) anlegen?"

### 4. In literature.md einfügen

Generiere die quelle_id: `nachname_jahr` (lowercase, bei mehreren Autoren Erstautor)
Bei Namenskollision: `nachname_jahra`, `nachname_jahrb`

Füge ein:
- PART 1: Quellen-Stammdaten
- PART 2: Zitate (falls erfasst)

### 5. Bestätigung

```
Quelle hinzugefügt: [Autor] ([Jahr])
ID: [quelle_id]
[X] Zitate erfasst

Nutze /cite um weitere Quellen hinzuzufügen.
```
