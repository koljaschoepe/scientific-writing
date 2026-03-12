---
name: approve
description: Gibt die aktuelle Phase frei und verschiebt Dateien von draft nach final. Nutze diesen Skill wenn der User /approve eingibt, optional mit Kapitelnummer wie /approve 2.3.
---

# Phase freigeben

Verschiebt Ergebnisse von draft/ nach final/ und aktualisiert den Fortschritt.

## Ablauf

### 1. Aktuelle Phase ermitteln

Lies `output/progress.json` für die aktuelle Phase.

### 2. Draft-Dateien identifizieren

**Mit Parameter (z.B. /approve 2.3):**
- Suche nur die Datei(en) für Kapitel 2.3 im aktuellen draft/-Ordner
- Ermöglicht selektive Freigabe einzelner Kapitel

**Ohne Parameter (/approve):**
- Suche ALLE Dateien im aktuellen draft/-Ordner

Prüfe den entsprechenden draft/-Ordner:

| Phase | Draft-Ordner |
|-------|-------------|
| 1 | `output/phase-01-brainstorming/draft/` |
| 2 | `output/phase-02-outline/draft/` |
| 3 | `output/phase-03-citations/draft/` |
| 4 | `output/phase-04-plans/draft/` |
| 5 | `output/phase-05-writing/draft/` |
| 6 | `output/phase-06-review/draft/` |

Falls draft/ leer: "Es gibt nichts zum Freigeben. Nutze /next um den nächsten Schritt zu starten."

### 3. Dateien anzeigen

Zeige die Dateien die freigegeben werden:

```
Folgende Dateien werden freigegeben (draft -> final):

  [Dateiname 1]
  [Dateiname 2]
  ...

Möchtest du alle freigeben?
```

Bei Einzelkapitel (/approve 2.3):
```
Folgende Datei wird freigegeben (draft -> final):

  [Dateiname]

Freigeben?
```

### 4. Freigabe durchführen

Bei Bestätigung:
- Verschiebe (kopiere) die Dateien von draft/ nach final/
- Lösche die Dateien aus draft/

### 5. Fortschritt aktualisieren

Prüfe `config.yaml -> quellen.workflow` für übersprungene Phasen.

Aktualisiere `output/progress.json`:
- Für Phase 1-3 und 7: Phase als abgeschlossen markieren, nächste Phase setzen
  - **Sonderfall Phase 2 bei `quellen.workflow: "keine"`:** Nächste Phase ist 4 (nicht 3).
    Phase 3 wird automatisch als abgeschlossen markiert und übersprungen.
- Für Phase 4-6 (iterativ): Prüfe ob ALLE Kapitel abgeschlossen sind
  - Falls ja: Phase als abgeschlossen markieren, nächste Phase setzen
  - Falls nein: Phase beibehalten, nächstes Kapitel empfehlen

**Interleaved-Modus (Phase 4/5):**
- Nach Freigabe eines Plans (Phase 4): Empfehle /next um das Kapitel zu schreiben
- Nach Freigabe eines Kapiteltexts (Phase 5): Empfehle /next um das nächste Kapitel zu planen
- Falls alle Kapitel geplant UND geschrieben: Phase 4 und 5 als abgeschlossen markieren

```json
{
  "aktuelle_phase": [X+1 oder X falls iterativ],
  "abgeschlossene_phasen": [..., X],
  "letztes_update": "[heute]"
}
```

### 6. Nächsten Schritt empfehlen

```
Phase [X] freigegeben!

[Falls Phase komplett abgeschlossen:]
Nächster Schritt: /next um Phase [X+1] zu starten.

[Falls iterativ und weitere Kapitel offen:]
Kapitel [X.X] freigegeben. Noch [Y] Kapitel offen.
Nächster Schritt: /next um fortzufahren.

[Falls Interleaved - Plan gerade freigegeben:]
Plan für Kapitel [X.X] freigegeben.
Nächster Schritt: /next um den Text für Kapitel [X.X] zu schreiben.

[Falls Interleaved - Text gerade freigegeben:]
Kapitel [X.X] geschrieben und freigegeben.
Nächster Schritt: /next um Kapitel [X+1.X] zu planen.
```
