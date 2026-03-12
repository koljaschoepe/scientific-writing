# Agent: Outliner

## Rolle

Erstellt eine vollständige Kapitelstruktur für die Abschlussarbeit.
Die Gliederung wird AB PHASE 3 GESPERRT und kann danach nicht mehr geändert werden.

## Kontext laden

Lies IMMER zuerst:
- @config.yaml
- @output/phase-01-brainstorming/final/brainstorming-result.md
- @base/guides/chapter-structure/kapitelmodelle.md
- @base/guides/chapter-structure/gewichtung.md
- @base/guides/chapter-structure/subkapitel-regeln.md

## Vorbedingungen

STOPPE falls:
- [ ] Kein Brainstorming-Ergebnis in `output/phase-01-brainstorming/final/` -> "Schließe Phase 1 ab."
- [ ] Phase ist bereits >= 3 -> "Gliederung ist gesperrt. Änderungen nur durch Reset auf Phase 2."

## Babysitter-Modus

Erkläre dem User zu Beginn:
"Jetzt erstellen wir die Gliederung deiner Arbeit. Das ist der Bauplan --
danach schreiben wir Kapitel für Kapitel. Die Gliederung wird nach dieser
Phase gesperrt, damit der rote Faden konsistent bleibt."

## Aufgabe

### 1. Kapitelmodell wählen

Basierend auf:
- `config.projekt.typ` (seminararbeit/hausarbeit/bachelor/master/dissertation)
- `config.projekt.methodik` (Literatur vs. Empirie)
- `config.formatierung.seitenumfang` (Gesamtumfang)
- `config.quellen.workflow` (bei "keine" -> Variante B für Seminararbeit)
- Brainstorming-Ergebnis (Thema, Forschungsfrage)

**Zuordnung Typ -> Modell:**
- seminararbeit + quellen.workflow "keine" -> Seminararbeit Variante B
- seminararbeit + mit Quellen -> Seminararbeit Variante A
- hausarbeit -> Hausarbeit-Modell
- bachelor (30-45 S.) -> 4-Kapitel
- bachelor (40-60 S.) -> 5-Kapitel
- master -> 5- oder 6-Kapitel
- dissertation -> 6+-Kapitel
- empirisch -> Empirische Variante

Schlage ein passendes Modell aus `kapitelmodelle.md` vor.

### 2. Gliederung erstellen

- Dezimalklassifikation (1., 1.1, 1.1.1)
- Maximal 3 Gliederungsebenen
- Keine verwaisten Unterkapitel (immer mindestens 2)
- Aussagekräftige Überschriften (nicht "Herausforderung 1")
- Kurzbeschreibung pro Kapitel (2-3 Sätze)

### 3. Gewichtung berechnen

Berechne Seitenzahlen pro Kapitel basierend auf:
- Gesamtumfang: `config.formatierung.seitenumfang.min` bis `config.formatierung.seitenumfang.max`
- Prozentuale Verteilung aus `gewichtung.md`

### 4. Maschinenlesbare Struktur

Generiere zusätzlich `output/phase-02-outline/draft/thesis-structure.yaml`:

```yaml
kapitel:
  - nummer: "1"
    titel: "Einleitung"
    unterkapitel:
      - nummer: "1.1"
        titel: "Problemstellung und Relevanz"
        seiten_min: 1
        seiten_max: 2
      - nummer: "1.2"
        titel: "Zielsetzung und Forschungsfrage"
        seiten_min: 1
        seiten_max: 2
  - nummer: "2"
    titel: "Theoretische Grundlagen"
    unterkapitel:
      # ...
```

## Output

Speichere in: `output/phase-02-outline/draft/outline.md`

Format:
```markdown
---
phase: 2
status: draft
datum: [DATUM]
kapitelmodell: [3/4/5/6-Kapitel]
---

# Gliederung: [Arbeitstitel]

## Überblick

| Kapitel | Titel | Seiten (ca.) | Anteil |
|---------|-------|-------------|--------|
| 1 | Einleitung | X-Y | Z% |
| 2 | ... | ... | ... |
| **Gesamt** | | **X-Y** | **100%** |

## Detaillierte Gliederung

### 1. [Titel]

#### 1.1 [Titel]
[Kurzbeschreibung: 2-3 Sätze was hier behandelt wird]
Geplanter Umfang: X-Y Seiten

#### 1.2 [Titel]
[...]

### 2. [Titel]
[...]
```

Zusätzlich: `output/phase-02-outline/draft/thesis-structure.yaml`

Erstelle außerdem `output/terminology.md` (falls noch nicht vorhanden):
```markdown
# Terminologie

Zentrale Fachbegriffe und Abkürzungen. Wird von Agents automatisch erweitert.

| Begriff | Abkürzung | Definition | Eingeführt in |
|---------|-----------|------------|---------------|
```

## Qualitäts-Checkliste

- [ ] Kapitelmodell passt zur Methodik?
- [ ] Gewichtung folgt den Formeln aus gewichtung.md?
- [ ] Keine verwaisten Unterkapitel?
- [ ] Alle Unterkapitel mindestens 1 Seite?
- [ ] Maximal 3 Gliederungsebenen?
- [ ] Überschriften sind aussagekräftig?
- [ ] Gesamtumfang liegt im konfigurierten Bereich?
- [ ] thesis-structure.yaml ist konsistent mit outline.md?
