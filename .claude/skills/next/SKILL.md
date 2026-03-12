---
name: next
description: Startet die nächste Phase oder den nächsten Arbeitsschritt. Nutze diesen Skill wenn der User /next eingibt oder wissen will was als nächstes kommt.
---

# Nächste Phase

Bestimme automatisch den nächsten sinnvollen Arbeitsschritt und führe ihn aus.

## Ablauf

### 1. Status ermitteln

Lies:
- `output/progress.json` -- Aktuelle Phase
- `config.yaml` -- Projektkonfiguration
- `output/phase-02-outline/final/thesis-structure.yaml` (falls vorhanden) -- Kapitel-Liste

### 2. Kurzvalidierung

Bevor der nächste Schritt gestartet wird, prüfe:
- `config.yaml` existiert und `projekt.typ` hat einen gültigen Wert
- Falls `formatierung.zitationsstil` gesetzt: Prüfe ob die Datei `base/guides/citation-systems/{zitationsstil}.md` existiert
- Falls Fehler: Melde sie und empfehle `/validate` für die vollständige Prüfung

### 3. Phasen-Logik

Bestimme den nächsten Schritt anhand der aktuellen Phase:

#### Phase 0 -> 1 (Setup -> Brainstorming)
**Vorbedingung:** config.yaml existiert und ist konfiguriert
**Aktion:** Starte den Agent `.claude/agents/brainstorming.md`
**Erklärung:** "Jetzt starten wir mit dem Brainstorming. Ich stelle dir Fragen
zu deinen Interessen und wir entwickeln gemeinsam ein Thema."

#### Phase 1 -> 2 (Brainstorming -> Gliederung)
**Vorbedingung:** Datei in `output/phase-01-brainstorming/final/` vorhanden
**Aktion:** Starte den Agent `.claude/agents/outliner.md`
**Erklärung:** "Dein Thema steht. Jetzt erstellen wir die Kapitelstruktur --
den Bauplan für deine gesamte Arbeit."

#### Phase 2 -> 3 (Gliederung -> Zitat-Zuordnung)

**Prüfe zuerst `config.yaml -> quellen.workflow`:**

**Falls `quellen.workflow: "keine"`:**
- Phase 3 ÜBERSPRINGEN
- Erstelle automatisch eine minimale Zuordnungsdatei (der citation-mapper Agent macht das)
- Verschiebe sie direkt nach `output/phase-03-citations/final/`
- Aktualisiere progress.json: Phase 3 als abgeschlossen markieren
- Melde: "Phase 3 (Zitat-Zuordnung) wird übersprungen -- du arbeitest ohne Quellen.
  Weiter mit Phase 4 (Kapitel-Planung)."
- Springe direkt zu Phase 3 -> 4

**Falls `quellen.workflow` einen anderen Wert hat:**
**Vorbedingung:** Datei in `output/phase-02-outline/final/` vorhanden UND
mindestens Mindestquellen in `sources/literature.md`

**Mindestquellen nach Arbeitstyp:**
- seminararbeit: 3 Quellen
- hausarbeit: 5 Quellen
- bachelor: 10 Quellen
- master: 15 Quellen
- dissertation: 30 Quellen

**Aktion:** Starte den Agent `.claude/agents/citation-mapper.md`
**Erklärung:** "Die Gliederung steht. Jetzt ordne ich deine Quellen den
passenden Kapiteln zu. So sehen wir, wo die Belege hinkommen."

Falls zu wenige Quellen: "Du hast erst [X] Quellen. Für eine fundierte
Zuordnung empfehle ich mindestens [Richtwert] Quellen. Nutze /cite um weitere
hinzuzufügen, oder sage 'weiter' wenn du trotzdem starten möchtest."

#### Phase 3 -> 4/5 (Zitat-Zuordnung -> Kapitel-Planung/Schreiben)

**NEUER INTERLEAVED-MODUS:** Ab Phase 3 arbeiten Planung und Schreiben verschränkt.
Kapitel werden einzeln geplant und direkt geschrieben, bevor das nächste geplant wird.

**Vorbedingung:** Datei in `output/phase-03-citations/final/` vorhanden

**GLIEDERUNGS-SPERRE:** Ab diesem Punkt ist die Gliederung gesperrt.
Falls der User die Gliederung ändern will: "Die Gliederung ist ab Phase 3
gesperrt, damit der rote Faden konsistent bleibt. Nutze /reset 2 falls du
die Gliederung grundlegend ändern musst."

**Bestimme das nächste Kapitel aus thesis-structure.yaml und prüfe seinen Status:**

1. **Falls es ein Kapitel gibt, das geplant (Plan in final/) aber noch nicht geschrieben ist:**
   - Starte `.claude/agents/writer.md` für dieses Kapitel
   - Erklärung: "Der Plan für Kapitel [X.X] steht. Jetzt schreibe ich den Text."
   - Setze progress.json auf Phase 5 (falls noch auf 4)

2. **Falls alle geplanten Kapitel auch geschrieben sind UND es noch ungeplante Kapitel gibt:**
   - Starte `.claude/agents/chapter-planner.md` für das nächste ungeplante Kapitel
   - Erklärung: "Jetzt erstelle ich den Bauplan für Kapitel [X.X]."
   - Setze progress.json auf Phase 4 (falls noch auf 3)

3. **Falls alle Kapitel geplant UND geschrieben sind:**
   - Wechsle zu Phase 6 (Review)
   - Starte Review für das nächste ungeprüfte Kapitel (siehe Phase 5 -> 6)
   - Erklärung: "Alle Kapitel sind geschrieben. Jetzt starte ich die Qualitätsprüfung."

**Zusammengefasst: Der Zyklus pro Kapitel ist:**
```
Plan [X.X] -> Approve -> Write [X.X] -> Approve -> Plan [X+1] -> ...
```

#### Phase 5 -> 6 (Schreiben -> Review)
**Vorbedingung:** Alle Kapitel geschrieben ODER noch ungeschriebene/ungeplante Kapitel
**Aktion:**
- Falls noch ungeplante Kapitel: Weiter mit chapter-planner.md (zurück in den Interleaved-Modus)
- Falls geplante aber ungeschriebene Kapitel: Weiter schreiben mit writer.md
- Falls alle geschrieben: Starte Review für nächstes ungeprüftes Kapitel
**Erklärung:** "Kapitel [X.X] ist geschrieben. Jetzt prüfe ich Sprache,
Zitate und Argumentation."

#### Phase 6 -> 7 (Review -> Finalisierung)
**Vorbedingung:** Alle Kapitel reviewed (alle Reviews in `output/phase-06-review/final/`)
**Aktion:** Starte `.claude/agents/finalizer.md`
**Erklärung:** "Alle Kapitel sind geprüft und freigegeben. Jetzt erstelle
ich das LaTeX-Dokument und kompiliere dein PDF."

### 4. Nach der Aktion

- Aktualisiere `output/progress.json` (Phase-Nummer, letztes_update)
- Empfehle nächsten Schritt: "Prüfe das Ergebnis und nutze /approve um es freizugeben."

### 5. Fehlende Vorbedingung

Falls eine Vorbedingung nicht erfüllt ist:
- Erkläre WAS fehlt
- Erkläre WIE der User es lösen kann
- Schlage den passenden Befehl vor
