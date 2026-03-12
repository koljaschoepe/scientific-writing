---
name: status
description: Zeigt den aktuellen Fortschritt der Abschlussarbeit an. Nutze diesen Skill wenn der User /status eingibt oder nach dem Projektstand fragt.
---

# Fortschritts-Anzeige

Zeige dem User den aktuellen Stand seines Thesis-Projekts.

## Ablauf

### 1. Daten sammeln

Lies folgende Dateien:
- `output/progress.json` -- Aktuelle Phase und abgeschlossene Phasen
- `config.yaml` -- Projekttitel, Seitenumfang, Abgabedatum

Prüfe zusätzlich das Dateisystem:
- Welche Dateien liegen in `output/phase-*/draft/` und `output/phase-*/final/`?
- Wie viele Quellen und Zitate sind in `sources/literature.md`?
- Gibt es Dateien in `output/phase-05-writing/final/`? Falls ja: Zähle Wörter.

### 1b. Self-Healing (progress.json vs. Dateisystem)

Prüfe ob progress.json mit dem tatsächlichen Dateistand übereinstimmt:

| Phase | Abgeschlossen wenn Datei in final/ |
|-------|------------------------------------|
| 1 | `phase-01-brainstorming/final/brainstorming-result.md` |
| 2 | `phase-02-outline/final/outline.md` |
| 3 | `phase-03-citations/final/citation-mapping.md` |
| 4 | Mindestens 1 Datei in `phase-04-plans/final/` |
| 5 | Mindestens 1 Datei in `phase-05-writing/final/` |
| 6 | Mindestens 1 Datei in `phase-06-review/final/` |

**Falls Diskrepanz gefunden:**
- Phase als abgeschlossen markiert aber Dateien fehlen: Warnung zeigen
- Dateien vorhanden aber Phase nicht markiert: "Hinweis: progress.json scheint
  veraltet. Soll ich den Status an den Dateistand anpassen?"
- Bei Bestätigung: progress.json korrigieren

### 2. Phase bestimmen

| Phase | Name | Erklärung (Babysitter-Modus) |
|-------|------|-------------------------------|
| 0 | Nicht eingerichtet | "Starte mit /setup um dein Projekt einzurichten." |
| 1 | Brainstorming | "Hier entwickeln wir dein Thema und deine Forschungsfragen." |
| 2 | Gliederung | "Jetzt entsteht die Struktur deiner Arbeit -- welche Kapitel, in welcher Reihenfolge." |
| 3 | Zitat-Zuordnung | "Deine gesammelten Quellen werden den passenden Kapiteln zugeordnet." (Bei quellen.workflow "keine": "Phase 3: Übersprungen -- ohne Quellen konfiguriert") |
| 4 | Kapitel-Planung | "Für jedes Kapitel wird ein detaillierter Bauplan erstellt." |
| 5 | Schreiben | "Jetzt wird der wissenschaftliche Text geschrieben -- Kapitel für Kapitel." |
| 6 | Qualitätsprüfung | "Sprache, Zitate und Argumentation werden systematisch geprüft." |
| 7 | Finalisierung | "Die Arbeit wird in LaTeX gesetzt und als PDF kompiliert." |

### 3. Fortschrittsbalken berechnen

Formel: `(abgeschlossene_phasen.length / 7) * 100`

Darstellung:
- 0%:   `[              ] 0%`
- 14%:  `[=>            ] 14%`
- 28%:  `[===>          ] 28%`
- 42%:  `[=====>        ] 42%`
- 57%:  `[=======>      ] 57%`
- 71%:  `[=========>    ] 71%`
- 85%:  `[===========>  ] 85%`
- 100%: `[==============>] 100%`

### 4. Kapitel-Status ermitteln (ab Phase 4)

Falls Phase >= 4, prüfe für jedes Kapitel aus der Gliederung:
- Plan vorhanden? -> Prüfe `output/phase-04-plans/final/plan-X-X.md`
- Text vorhanden? -> Prüfe `output/phase-05-writing/final/X-X.md`
- Review vorhanden? -> Prüfe `output/phase-06-review/final/X-X-reviewed.md`

Markiere: `[x]` für vorhanden, `[ ]` für fehlend

### 5. Übersprungene Phasen

Prüfe `config.yaml -> quellen.workflow`:
- Falls "keine": Markiere Phase 3 in der Ausgabe als "Übersprungen"

### 6. Quellen-Statistik

Falls `quellen.workflow` NICHT "keine":
Zähle in `sources/literature.md`:
- Anzahl YAML-Bloecke in Part 1 (Quellen)
- Anzahl YAML-Bloecke in Part 2 (Zitate)

Falls `quellen.workflow: "keine"`:
- Zeige: "Quellen: Ohne Quellen konfiguriert"

### 7. Ausgabe formatieren

```
=== Scientific Writing Framework ===

Projekt:     [Titel oder "Noch kein Titel"]
Phase:       [X]/7 - [Phasenname]
Fortschritt: [========>     ] [XX]%

[Babysitter-Erklärung der aktuellen Phase]

[Falls ab Phase 4: Kapitel-Status-Tabelle]

Quellen: [X] Quellen, [Y] Zitate
[Falls ab Phase 5: Geschätzter Seitenumfang: ~[Z] von [Min]-[Max] Seiten]
[Falls Abgabedatum gesetzt: Abgabe: [Datum] (noch [N] Tage)]

Nächster Schritt: [Empfehlung basierend auf Phase]
```

### 8. Nächsten Schritt empfehlen

| Phase | Empfehlung |
|-------|------------|
| 0 | `/setup` -- Projekt einrichten |
| 1 | `/next` -- Brainstorming starten oder fortsetzen |
| 2 | `/next` -- Gliederung erstellen |
| 3 | `/cite` -- Weitere Quellen hinzufügen, dann `/next` |
| 4 | `/next` -- Nächstes Kapitel planen |
| 5 | `/write [X.X]` -- Nächstes Kapitel schreiben |
| 6 | `/review [X.X]` -- Nächstes Kapitel prüfen |
| 7 | `/compile` -- PDF kompilieren |
