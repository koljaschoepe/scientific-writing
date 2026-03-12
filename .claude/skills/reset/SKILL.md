---
name: reset
description: Setzt das Projekt auf eine bestimmte Phase zurück. Nutze diesen Skill wenn der User /reset eingibt, z.B. /reset 2.
---

# Phase zurücksetzen

Setzt das Projekt auf eine frühere Phase zurück. Alle Ergebnisse späterer Phasen werden archiviert.

## Ablauf

### 1. Zielphase bestimmen

**Mit Parameter (z.B. /reset 2):**
- Verwende die angegebene Phase

**Ohne Parameter:**
- Frage: "Auf welche Phase möchtest du zurücksetzen? (1-6)"
- Zeige die Phasen zur Orientierung:
  1. Brainstorming
  2. Gliederung
  3. Zitat-Zuordnung
  4. Kapitel-Planung
  5. Schreiben
  6. Qualitätsprüfung

### 2. Status prüfen

Lies `output/progress.json` für die aktuelle Phase.

Falls Zielphase >= aktuelle Phase:
"Du bist bereits in Phase [X]. Ein Reset auf Phase [Y] ist nicht nötig."

Falls Zielphase < 1 oder > 6:
"Ungültige Phase. Wähle eine Phase zwischen 1 und 6."

### 3. Auswirkungen zeigen

Zeige dem User was verloren geht:

```
Reset auf Phase [X] -- Folgende Daten werden archiviert:

[Für jede Phase > Zielphase die Dateien enthält:]
  Phase [Y]: [Anzahl] Dateien in draft/ und final/
  Phase [Z]: [Anzahl] Dateien in draft/ und final/
  ...

Die archivierten Dateien werden nach output/_archived/reset-[DATUM]/ verschoben.
Du kannst sie jederzeit manuell wiederherstellen.

Bist du sicher?
```

### 4. Sicherheitsabfrage

Warte auf explizite Bestätigung. Bei "nein" oder Abbruch: Nichts tun.

**Besondere Warnung bei Reset auf Phase 2:**
"ACHTUNG: Die Gliederung wird entsperrt. Alle Kapitel-Pläne, geschriebenen
Texte und Reviews gehen verloren (werden archiviert). Das ist ein großer
Schritt -- bist du wirklich sicher?"

### 5. Reset durchführen

Bei Bestätigung:

1. **Archiv-Ordner erstellen:**
   `output/_archived/reset-[YYYY-MM-DD-HHmmss]/`

2. **Dateien archivieren** (für jede Phase > Zielphase):
   - Verschiebe `output/phase-XX-*/draft/*` nach `output/_archived/reset-[DATUM]/phase-XX-*/draft/`
   - Verschiebe `output/phase-XX-*/final/*` nach `output/_archived/reset-[DATUM]/phase-XX-*/final/`

3. **progress.json aktualisieren:**
   ```json
   {
     "aktuelle_phase": [Zielphase],
     "abgeschlossene_phasen": [nur Phasen < Zielphase],
     "letztes_update": "[heute]"
   }
   ```

4. **Spezialfall: Reset auf Phase 3 oder früher bei `quellen.workflow: "keine"`:**
   - Phase 3 muss bei erneutem /next wieder automatisch übersprungen werden
   - Keine besondere Behandlung nötig -- /next erkennt das automatisch

### 6. Bestätigung

```
Reset auf Phase [X] abgeschlossen.

Archiviert: [Y] Dateien in output/_archived/reset-[DATUM]/
Aktuelle Phase: [X] -- [Phasenname]

Nächster Schritt: /next um Phase [X] zu starten.
```
