# Literaturdatenbank

Ausführliche Anleitung zum Format und zur Nutzung der Datei `sources/literature.md`.

## Überblick

Die Literaturdatenbank nutzt YAML-Format in einer Markdown-Datei mit zwei Teilen:

- **PART 1:** Quellen-Stammdaten (bibliografische Informationen)
- **PART 2:** Zitate (einzelne Passagen mit Seitenangaben)

## Quellen erfassen

### Variante 1: Mit /cite (empfohlen)

```
/cite
```
Claude führt dich durch die Erfassung oder analysiert ein PDF automatisch.

### Variante 2: Manuell

Öffne `sources/literature.md` und füge YAML-Blöcke hinzu.

## Quellentypen und Felder

### Buch
```yaml
---
quelle_id: mueller_2024
autor: "Mueller, M."
jahr: 2024
titel: "Digitale Transformation im Mittelstand"
quelle_typ: buch
verlag: "Springer"
ort: "Berlin"
auflage: 2
---
```

### Journal-Artikel
```yaml
---
quelle_id: schmidt_2023
autor: "Schmidt, K./Weber, L."
jahr: 2023
titel: "KI-Adoption in KMU: Eine empirische Analyse"
quelle_typ: journal
journal: "Wirtschaftsinformatik"
jahrgang: 65
ausgabe: 3
seiten: "234-251"
doi: "10.1007/s11576-023-00123-4"
---
```

### Sammelband-Beitrag
```yaml
---
quelle_id: fischer_2023
autor: "Fischer, T."
jahr: 2023
titel: "Change Management in der Digitalisierung"
quelle_typ: sammelband
herausgeber: "Maier, H./Braun, S."
sammelbandtitel: "Handbuch Digitale Transformation"
verlag: "Gabler"
ort: "Wiesbaden"
seiten: "145-172"
---
```

### Internetquelle / Report
```yaml
---
quelle_id: kpmg_2024
autor: "KPMG"
jahr: 2024
titel: "Generative KI in deutschen Unternehmen"
quelle_typ: website
url: "https://kpmg.com/de/studie-ki-2024"
abruf: "15.01.2026"
---
```

### Konferenzbeitrag
```yaml
---
quelle_id: lee_2024
autor: "Lee, J./Park, S."
jahr: 2024
titel: "LLM-based Code Generation: Challenges and Solutions"
quelle_typ: konferenz
journal: "Proceedings of ICSE 2024"
ort: "Lisbon"
seiten: "89-97"
doi: "10.1145/xxxxx"
---
```

## Zitate erfassen

Für jede relevante Passage aus einer Quelle:

```yaml
---
id: mueller_2024_z1
quelle_id: mueller_2024
seite: "42"
typ: indirekt
inhalt: "Kleine und mittlere Unternehmen stehen vor besonderen Herausforderungen bei der Digitalisierung"
kontext: "Einleitung zum Thema Digitalisierungsbarrieren in KMU"
zugeordnet_zu: "2.1"
---
```

### Direktes Zitat (wörtlich)

```yaml
---
id: mueller_2024_z2
quelle_id: mueller_2024
seite: "45"
typ: direkt
inhalt: "Die fehlenden Strukturen stellen eine zentrale Herausforderung dar"
kontext: "Konkrete Benennung des Kernproblems"
zugeordnet_zu: "3.2"
---
```

## Felder-Referenz

### Quellen-Stammdaten (PART 1)

| Feld | Pflicht | Beschreibung |
|------|---------|-------------|
| quelle_id | Ja | Eindeutige ID: nachname_jahr |
| autor | Ja | Autorenname(n), Slash-getrennt |
| jahr | Ja | Erscheinungsjahr |
| titel | Ja | Vollständiger Titel |
| quelle_typ | Ja | buch, journal, sammelband, konferenz, website, report |
| verlag | Bei Buch | Verlagsname |
| ort | Bei Buch | Erscheinungsort |
| auflage | Optional | Auflagennummer |
| journal | Bei Journal | Zeitschriftname |
| jahrgang | Bei Journal | Jahrgang/Volume |
| ausgabe | Bei Journal | Ausgabe/Issue |
| seiten | Bei Journal | Seitenbereich |
| doi | Optional | Digital Object Identifier |
| url | Bei Website | Vollständige URL |
| abruf | Bei Website | Abrufdatum (TT.MM.JJJJ) |
| herausgeber | Bei Sammelband | Herausgeber des Sammelbands |
| sammelbandtitel | Bei Sammelband | Titel des Sammelbands |
| notizen | Optional | Freitext-Notizen zur Quelle |

### Zitate (PART 2)

| Feld | Pflicht | Beschreibung |
|------|---------|-------------|
| id | Ja | Eindeutige Zitat-ID: quelle_id_zN |
| quelle_id | Ja | Verweis auf Quelle in PART 1 |
| seite | Empfohlen | Seitenzahl oder -bereich |
| typ | Ja | indirekt oder direkt |
| inhalt | Ja | Kernaussage oder wörtliches Zitat |
| kontext | Optional | Kontext/Relevanz für die Arbeit |
| zugeordnet_zu | Später | Kapitelnummer (wird in Phase 3 gesetzt) |

## Häufige Fehler

| Fehler | Lösung |
|--------|--------|
| Doppelte quelle_id | Suffix anhängen: mueller_2024a, mueller_2024b |
| Fehlende Seitenzahl | Bei Websites OK, bei Büchern/Journals nachtragen |
| Autor falsch formatiert | "Nachname, V." oder "Nachname1/Nachname2" |
| Leerzeichen in quelle_id | Unterstriche verwenden: van_der_berg_2024 |
| YAML-Syntaxfehler | Keine Tabs, korrekte Einrückung mit Leerzeichen |

## BibTeX-Import

Du kannst Quellen direkt aus einer .bib-Datei importieren:

```
/cite
-> "BibTeX-Import" wählen
-> Pfad zur .bib-Datei angeben
```

Claude liest die Datei, konvertiert alle Einträge automatisch und zeigt eine Vorschau.
Du kannst alle auf einmal oder einzeln importieren.

### Unterstützte BibTeX-Typen

| BibTeX-Typ | literature.md-Typ |
|------------|------------------|
| @article | journal |
| @book | buch |
| @incollection | sammelband |
| @inproceedings | konferenz |
| @online / @misc (mit URL) | website |
| @techreport | report |
| @phdthesis / @mastersthesis | buch |

### Feld-Mapping-Referenz

| BibTeX | literature.md | Hinweis |
|--------|--------------|---------|
| author | autor | "Lastname, Firstname and ..." -> "Lastname, F./..." |
| year | jahr | |
| title | titel | Geschweifte Klammern werden entfernt |
| publisher | verlag | |
| address | ort | |
| journal | journal | |
| volume | jahrgang | |
| number | ausgabe | |
| pages | seiten | |
| doi | doi | |
| url | url | |
| editor | herausgeber | |
| booktitle | sammelbandtitel | Bei @incollection |

## Zotero-Export

Exportiere deine Zotero-Bibliothek und importiere sie:

### Export aus Zotero

1. In Zotero: Rechtsklick auf Sammlung -> "Exportiere Sammlung..."
2. Format wählen:
   - **BibTeX** (empfohlen) -- `.bib`-Datei
   - **CSV** -- Tabellen-Format
   - **RIS** -- `.ris`-Datei
3. Datei speichern

### Import ins Framework

```
/cite
-> "Zotero-Import" wählen
-> Pfad zur exportierten Datei angeben
```

Claude erkennt das Format automatisch (BibTeX, CSV oder RIS) und konvertiert alle Einträge.

## Tipps

- Erfasse Quellen fruehzeitig und fortlaufend
- Nutze `/cite` für PDF-Analyse (spart Zeit)
- BibTeX- oder Zotero-Import ist am schnellsten für große Mengen
- Empfohlene Quellenanzahl nach Arbeitstyp:
  | Typ | Empfohlene Quellen |
  |-----|-------------------|
  | Seminararbeit | 5-10 |
  | Hausarbeit | 8-15 |
  | Bachelorarbeit | 20-40 |
  | Masterarbeit | 40-80 |
  | Dissertation | 100+ |
- Notiere Relevanz in `notizen` für spätere Zuordnung
- Seitenzahlen sofort notieren (später schwer zu finden)
