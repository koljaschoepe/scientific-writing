---
name: wordcount
description: Zeigt Wortanzahl und Seitenschätzung pro Kapitel an. Nutze diesen Skill wenn der User /wordcount eingibt oder nach der Länge fragt.
---

# Wortanzahl und Seitenschätzung

Zählt Wörter in allen geschriebenen Kapiteln und vergleicht mit dem Plan.

## Ablauf

### 1. Daten sammeln

Lies:
- `config.yaml` -- Seitenumfang (min/max)
- `output/phase-02-outline/final/thesis-structure.yaml` -- Geplante Seitenverteilung
- Alle Kapitel in `output/phase-05-writing/final/` UND `output/phase-05-writing/draft/`

### 2. Wörter zählen

Für jede Kapiteldatei:
- Zähle Wörter (ohne YAML-Frontmatter, ohne Markdown-Syntax)
- Zähle Absätze
- Status: draft oder final

### 3. Seitenschätzung

Umrechnungsformel: ca. 250-300 Wörter pro Seite (bei 12pt, 1.5 Zeilenabstand).
Verwende den Mittelwert (275) als Standard.

Erwartungen an den Arbeitstyp (aus config.yaml):
- seminararbeit: 10-20 Seiten (2.750-5.500 Wörter)
- hausarbeit: 15-25 Seiten (4.125-6.875 Wörter)
- bachelor: 40-60 Seiten (11.000-16.500 Wörter)
- master: 50-100 Seiten (13.750-27.500 Wörter)
- dissertation: 150+ Seiten (41.250+ Wörter)

Nutze die konkreten Werte aus `config.formatierung.seitenumfang.min/max` falls vorhanden.

### 4. Ausgabe formatieren

```
=== Wortanzahl und Seitenschätzung ===

| Kapitel | Titel | Wörter | Seiten (ca.) | Geplant | Status |
|---------|-------|---------|-------------|---------|--------|
| 1.1 | [Titel] | 450 | ~1.6 | 1-2 | final |
| 1.2 | [Titel] | 380 | ~1.4 | 1-2 | final |
| 2.1 | [Titel] | 850 | ~3.1 | 3-4 | draft |
| 2.2 | [Titel] | -- | -- | 3-4 | offen |
| ... | ... | ... | ... | ... | ... |

Gesamt: [X] Wörter, ~[Y] Seiten
Zielbereich: [Min]-[Max] Seiten

[Falls unter Minimum:]
HINWEIS: Du liegst [Z] Seiten unter dem Minimum. Kapitel [X.X] und [Y.Y]
haben Potential für mehr Tiefe.

[Falls über Maximum:]
HINWEIS: Du liegst [Z] Seiten über dem Maximum. Kapitel [X.X] könnte
gekürzt werden.

[Falls im Bereich:]
Deine Arbeit liegt im Zielbereich. Weiter so!
```

### 5. Abweichungswarnung

Für Kapitel mit > 15% Abweichung vom Plan:
```
Abweichungen vom Plan (> 15%):
- Kapitel [X.X]: [Y] Wörter geschrieben, [Z] geplant ([+/-] XX%)
```
