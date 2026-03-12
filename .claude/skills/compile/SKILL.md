---
name: compile
description: Kompiliert die Arbeit als LaTeX-Dokument zu PDF. Nutze diesen Skill wenn der User /compile eingibt.
---

# LaTeX kompilieren

Startet den LaTeX-Export und die PDF-Kompilierung.

## Ablauf

### 1. Modus bestimmen

**Normaler Modus (/compile):**
- Alle Kapitel müssen geschrieben sein

**Draft-Modus (/compile draft oder /compile --draft):**
- Kompiliert auch mit unvollständigen Kapiteln
- Fehlende Kapitel werden als Platzhalter eingefügt:
  ```latex
  \section{[Kapiteltitel]}
  \textit{[Kapitel noch nicht geschrieben -- Platzhalter]}
  \newpage
  ```
- Deckblatt zeigt "ENTWURF" als Wasserzeichen oder Hinweis
- Nützlich um Layout und Umfang während des Schreibens zu prüfen

### 1b. Vorbedingungen prüfen

- [ ] `output/phase-02-outline/final/thesis-structure.yaml` vorhanden
- [ ] `config.yaml` vollständig konfiguriert
- [ ] LaTeX installiert (siehe Auto-Installation unten)
- [ ] Alle Kapitel in `output/phase-05-writing/final/` vorhanden (nur im normalen Modus)

### 1b. LaTeX Auto-Installation

Prüfe mit `which xelatex && which latexmk`:

**Falls installiert:**
- Setze `config.yaml -> latex.installation_geprüft: true`
- Weiter mit Schritt 2

**Falls NICHT installiert:**
- OS erkennen (uname -s)
- **macOS:** "LaTeX ist nicht installiert. Soll ich es installieren?
  `brew install --cask mactex-no-gui` (ca. 4 GB Download)"
  - Falls User zustimmt: Befehl ausführen (kann mehrere Minuten dauern)
  - Falls brew nicht installiert: "Bitte installiere zuerst Homebrew: https://brew.sh"
- **Linux (Debian/Ubuntu):** "LaTeX ist nicht installiert. Soll ich es installieren?
  `sudo apt install texlive-xetex texlive-fonts-extra texlive-lang-german latexmk`"
  - Falls User zustimmt: Befehl ausführen
- **Anderes OS:** "LaTeX ist nicht installiert. Bitte installiere manuell:
  https://tug.org/texlive/ oder https://miktex.org"
- Nach erfolgreicher Installation: `latex.installation_geprüft: true` setzen
- Falls User ablehnt: "Ohne LaTeX kann kein PDF erstellt werden. Du kannst später erneut /compile ausführen."

Falls nicht alle Kapitel geschrieben (normaler Modus):
"Es fehlen noch Kapitel: [Liste]. Optionen:
- /write [X.X] um fehlende Kapitel zu schreiben
- /compile draft um eine Entwurfs-PDF mit Platzhaltern zu erstellen"

### 2. Finalizer starten

Starte den Agent `.claude/agents/finalizer.md`.

Der Agent:
1. Konvertiert alle Kapitel nach LaTeX
2. Generiert Präambel aus config.yaml
3. Generiert Deckblatt, Verzeichnisse, Erklärung
4. Erstellt die Hauptdatei thesis.tex
5. Kompiliert mit latexmk/xelatex

### 3. Ergebnis melden

**Bei Erfolg:**
```
PDF erfolgreich erstellt!

Datei: output/phase-07-latex/latex/thesis.pdf
Seiten: [X] (Zielbereich: [Min]-[Max])
[Falls außerhalb: WARNUNG: Seitenanzahl außerhalb des Zielbereichs]

Nächste Schritte:
1. PDF öffnen und prüfen
2. Hilfsmittelverzeichnis manuell ergänzen (falls KI-Tools verwendet)
3. Deckblatt-Daten prüfen
```

**Bei Fehler:**
- Zeige den LaTeX-Fehler
- Versuche automatisch zu beheben und erneut zu kompilieren
- Falls nicht behebbar: Erkläre das Problem und mögliche Lösungen

### 4. Auto-Compile Watcher (optional)

Falls `config.yaml -> latex.auto_compile: true` UND die erste Kompilierung erfolgreich war:

- Frage den User: "Soll ich einen Watcher starten, der bei jeder .tex-Änderung
  automatisch neu kompiliert? (latexmk -pvc)"
- Falls ja: Starte im Hintergrund:
  ```bash
  cd output/phase-07-latex/latex && latexmk -pvc -xelatex -interaction=nonstopmode thesis.tex
  ```
- Melde: "Auto-Compile Watcher läuft. Das PDF wird bei jeder .tex-Änderung
  automatisch aktualisiert. Stoppe mit Ctrl+C in diesem Terminal."
