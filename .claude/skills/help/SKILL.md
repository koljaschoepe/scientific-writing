---
name: help
description: Zeigt kontextsensitive Hilfe an. Nutze diesen Skill wenn der User /help eingibt oder nicht weiter weiß.
---

# Kontextsensitive Hilfe

Zeige dem User Hilfe basierend auf seinem aktuellen Projektstand.

## Ablauf

### 1. Kontext ermitteln

Lies `output/progress.json` um die aktuelle Phase zu bestimmen.
Falls die Datei nicht existiert oder Phase 0: Zeige Ersteinrichtungs-Hilfe.

### 2. Allgemeine Hilfe (immer anzeigen)

```
=== Scientific Writing Framework - Hilfe ===

Verfügbare Befehle:

  /setup            Projekt einrichten (einmaliges Interview)
  /next             Nächste Phase starten oder fortsetzen
  /status           Aktuellen Fortschritt anzeigen (mit Self-Healing)
  /write [X.X]      Bestimmtes Kapitel schreiben (Phase 5)
  /review [X.X]     Kapitel zur Qualitätsprüfung (Phase 6, 3 Agenten parallel)
  /cite             Neue Quelle oder Zitat hinzufügen
  /compile          LaTeX kompilieren und PDF erstellen (Phase 7)
  /compile draft    Entwurfs-PDF mit Platzhaltern für fehlende Kapitel
  /approve [X.X]    Phase oder einzelnes Kapitel freigeben (draft -> final)
  /wordcount        Wortanzahl und Seitenschätzung anzeigen
  /rewrite [X.X]    Kapitel komplett neu schreiben
  /reset [phase]    Auf frühere Phase zurücksetzen (archiviert spätere Ergebnisse)
  /validate         Projektkonfiguration und Datenintegrität prüfen
  /help             Diese Hilfe anzeigen
```

### 3. Phasenspezifische Hilfe

Zeige zusätzlich je nach Phase:

**Phase 0 (Nicht eingerichtet):**
```
Du hast dein Projekt noch nicht eingerichtet.
Starte mit /setup -- das dauert nur etwa 5 Minuten.
```

**Phase 1 (Brainstorming):**
```
In dieser Phase entwickeln wir dein Thema.
- /next startet das Brainstorming
- Beantworte die Fragen des Assistenten
- Am Ende erhältst du Themenvorschläge
- Mit /approve gibst du das Ergebnis frei
```

**Phase 2 (Gliederung):**
```
Jetzt erstellen wir die Struktur deiner Arbeit.
- /next startet die Gliederungserstellung
- Du erhältst eine Kapitelstruktur mit Seitenschätzungen
- Prüfe die Struktur sorgfältig -- ab Phase 3 ist sie gesperrt!
- Mit /approve gibst du die Gliederung frei
```

**Phase 3 (Zitat-Zuordnung):**
```
Deine Quellen werden den Kapiteln zugeordnet.
- Stelle sicher dass du genügend Quellen hast (/cite zum Hinzufügen)
- /next startet die Zuordnung
- Der Assistent zeigt dir wo noch Quellen fehlen
- Mit /approve gibst du die Zuordnung frei
```

**Phase 4 (Kapitel-Planung):**
```
Für jedes Kapitel wird ein detaillierter Bauplan erstellt.
- /next plant das nächste Kapitel
- Jeder Plan enthält die Absatzstruktur und Zitat-Zuweisungen
- Prüfe jeden Plan bevor du ihn freigibst
- Mit /approve gibst du den aktuellen Plan frei
```

**Phase 5 (Schreiben):**
```
Jetzt wird geschrieben!
- /write [X.X] schreibt ein bestimmtes Kapitel
- /next schreibt das nächste geplante Kapitel
- /wordcount zeigt die aktuelle Wortanzahl
- /rewrite [X.X] schreibt ein Kapitel komplett neu
- Mit /approve gibst du das geschriebene Kapitel frei
```

**Phase 6 (Qualitätsprüfung):**
```
Drei spezialisierte Prüfagenten analysieren deine Texte:
1. Sprachprüfung (Stil, verbotene Wörter, Wiederholungen)
2. Zitationsprüfung (Format, Dichte, Vollständigkeit)
3. Argumentationsprüfung (Logik, Roter Faden, Übergänge)

- /review [X.X] prüft ein bestimmtes Kapitel
- /next prüft das nächste ungeprüfte Kapitel
- Mit /approve gibst du das Ergebnis frei
```

**Phase 7 (Finalisierung):**
```
Die Arbeit wird als PDF erstellt.
- /compile startet den LaTeX-Export und die Kompilierung
- Stelle sicher dass LaTeX installiert ist (latexmk + xelatex)
- Das PDF findest du unter output/phase-07-latex/latex/thesis.pdf
```

### 4. Kontexthilfe für besondere Modi

Prüfe `config.yaml` und zeige zusätzlich:

**Falls `quellen.workflow: "keine"`:**
```
Dein Projekt ist ohne Quellen konfiguriert.
- Phase 3 (Zitat-Zuordnung) wird automatisch übersprungen
- Deine Argumentation stützt sich auf Logik, Beispiele und Plausibilität
- Du kannst jederzeit auf Quellen umstellen: Aendere quellen.workflow in config.yaml
```

**Falls `projekt.typ` seminararbeit oder hausarbeit:**
```
Du schreibst eine kurze Arbeit ([Typ], [Min]-[Max] Seiten).
- Weniger Kapitel, kompaktere Struktur
- Weniger Quellen nötig (Seminar: 5-10, Haus: 8-15)
- /wordcount zeigt deinen Fortschritt passend zum Umfang
```

### 5. Häufige Fragen

```
Häufige Fragen:

  Wie füge ich Quellen hinzu?
  -> /cite (PDF-Analyse, manuell, BibTeX oder Zotero-Import)

  Kann ich auch ohne Quellen arbeiten?
  -> Ja, bei Seminar- und Hausarbeiten. Stelle quellen.workflow
     auf "keine" in config.yaml oder wähle es bei /setup.

  Wie importiere ich eine BibTeX-Datei?
  -> /cite -> "BibTeX-Import" wählen -> Pfad angeben

  Kann ich die Gliederung noch ändern?
  -> Nur bis Phase 3. Danach gesperrt. Nutze /reset 2 für Änderungen.

  Kann ich auf eine frühere Phase zurück?
  -> Ja, /reset [phase] archiviert spätere Ergebnisse und setzt zurück.

  Kann ich ein PDF sehen bevor alle Kapitel fertig sind?
  -> Ja, /compile draft erstellt eine Vorschau mit Platzhaltern.

  Mein Projekt scheint kaputt -- was tun?
  -> /validate prüft alle Daten auf Konsistenz und bietet Reparatur an.

  Wo finde ich meine Arbeit?
  -> Markdown: output/phase-05-writing/final/
  -> PDF: output/phase-07-latex/latex/thesis.pdf

  Wie lege ich mein Hochschul-Logo ab?
  -> Als JPG oder PNG in assets/img/

  Wo kann ich Schreibpräferenzen einstellen?
  -> In der Datei preferences.md

  LaTeX ist nicht installiert -- was tun?
  -> /compile prüft und bietet Installation an
  -> macOS: brew install --cask mactex-no-gui
  -> Linux: sudo apt install texlive-xetex texlive-fonts-extra latexmk

  Ausführliche Dokumentation:
  -> docs/einstieg.md
  -> docs/konfiguration.md
  -> docs/literaturdatenbank.md
```
