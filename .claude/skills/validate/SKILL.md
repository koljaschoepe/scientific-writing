---
name: validate
description: Prüft die Projektkonfiguration und Datenintegrität. Nutze diesen Skill wenn der User /validate eingibt oder Probleme mit der Konfiguration hat.
---

# Projekt validieren

Prüft config.yaml, literature.md, progress.json und die Verzeichnisstruktur auf Konsistenz und Fehler.

## Ablauf

### 1. config.yaml prüfen

Lies `config.yaml` und prüfe:

**Pflichtfelder (nach /setup):**
- `projekt.typ` muss eines von: seminararbeit, hausarbeit, bachelor, master, dissertation
- `projekt.methodik` muss eines von: literatur, empirisch-qualitativ, empirisch-quantitativ
- `projekt.sprache` muss "de" sein (einzige aktuell unterstützte Sprache)
- `formatierung.zitationsstil` muss eines von: harvard-inline, apa7, ieee, chicago
- `formatierung.seitenumfang.min` < `formatierung.seitenumfang.max`
- `formatierung.schriftgroesse` zwischen 10 und 14
- `formatierung.zeilenabstand` zwischen 1.0 und 2.0

**Zitationsstil-Datei prüfen:**
- Prüfe ob `base/guides/citation-systems/{zitationsstil}.md` existiert
- Falls nicht: Fehler melden mit Liste der verfügbaren Stile

**Quellen-Workflow prüfen:**
- `quellen.workflow` muss eines von: bibtex, pdf-extraktion, manuell, keine
- Falls "keine" und typ ist master oder dissertation: Warnung ("Ohne Quellen bei einer [Typ] ist ungewöhnlich")
- Falls "bibtex" und `quellen.import_pfad` leer: Warnung ("Import-Pfad fehlt")

### 2. progress.json prüfen

Lies `output/progress.json` und prüfe gegen das Dateisystem:

**Dateisystem-Abgleich:**
Für jede abgeschlossene Phase: Prüfe ob tatsächlich Dateien in `output/phase-XX-*/final/` liegen.

| Phase | Erwartete Dateien in final/ |
|-------|-----------------------------|
| 1 | `phase-01-brainstorming/final/brainstorming-result.md` |
| 2 | `phase-02-outline/final/outline.md` UND `thesis-structure.yaml` |
| 3 | `phase-03-citations/final/citation-mapping.md` |
| 4 | Mindestens eine Datei in `phase-04-plans/final/` |
| 5 | Mindestens eine Datei in `phase-05-writing/final/` |
| 6 | Mindestens eine Datei in `phase-06-review/final/` |

**Diskrepanzen melden:**
- Phase als abgeschlossen markiert aber keine Dateien vorhanden: FEHLER
- Dateien vorhanden aber Phase nicht als abgeschlossen markiert: WARNUNG

**Auto-Repair anbieten:**
Falls Diskrepanzen gefunden:
"Ich habe Inkonsistenzen zwischen progress.json und dem Dateisystem gefunden.
Soll ich progress.json an den tatsächlichen Dateistand anpassen?"

### 3. literature.md prüfen

Falls `quellen.workflow` NICHT "keine":

**YAML-Syntax:**
- Prüfe ob alle YAML-Blöcke korrekt geparst werden können
- Melde fehlerhafte Einträge mit Zeilennummer

**Pflichtfelder (PART 1 -- Quellen):**
- Jede Quelle braucht: quelle_id, autor, jahr, titel, quelle_typ
- quelle_id muss Format `nachname_jahr` haben (lowercase, underscore)
- quelle_typ muss eines von: buch, journal, sammelband, konferenz, website, report

**Pflichtfelder (PART 2 -- Zitate):**
- Jedes Zitat braucht: id, quelle_id, typ, inhalt
- typ muss: indirekt oder direkt
- quelle_id muss in PART 1 existieren (keine verwaisten Zitate)

**Duplikate:**
- Prüfe ob quelle_id oder id doppelt vorkommen

### 4. Verzeichnisstruktur prüfen

Prüfe ob alle erwarteten Verzeichnisse existieren:
- `output/phase-01-brainstorming/draft/` und `final/`
- `output/phase-02-outline/draft/` und `final/`
- `output/phase-03-citations/draft/` und `final/`
- `output/phase-04-plans/draft/` und `final/`
- `output/phase-05-writing/draft/` und `final/`
- `output/phase-06-review/draft/` und `final/`
- `output/phase-07-latex/latex/`
- `sources/`
- `base/guides/`

Fehlende Verzeichnisse automatisch anlegen.

### 5. Kapitel-Konsistenz prüfen (ab Phase 4)

Falls thesis-structure.yaml existiert:

- Liste alle Kapitel aus der Gliederung
- Prüfe für jedes Kapitel:
  - Plan vorhanden? (`phase-04-plans/final/plan-X-X.md`)
  - Text vorhanden? (`phase-05-writing/final/X-X.md`)
  - Review vorhanden? (`phase-06-review/final/X-X-reviewed.md`)
- Melde fehlende Dateien als Lücken

### 6. Ergebnis anzeigen

```
=== Validierungsergebnis ===

config.yaml:      [OK / X Fehler, Y Warnungen]
progress.json:    [OK / Inkonsistent -- Auto-Repair verfügbar]
literature.md:    [OK / X Fehler] ([Y] Quellen, [Z] Zitate)
Verzeichnisse:    [OK / X fehlende angelegt]
Kapitel-Status:   [OK / X Lücken]

[Falls Fehler:]
FEHLER:
1. [Beschreibung + Lösung]
2. [Beschreibung + Lösung]

[Falls Warnungen:]
WARNUNGEN:
1. [Beschreibung]
2. [Beschreibung]

[Falls alles OK:]
Keine Probleme gefunden. Dein Projekt ist konsistent.
```
