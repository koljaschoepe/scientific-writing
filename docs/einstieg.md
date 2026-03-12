# Einstieg

Schritt-für-Schritt-Anleitung für das Scientific Writing Framework.

## Voraussetzungen

1. **Claude Code** installieren: https://claude.com/claude-code
2. **LaTeX** (für PDF-Export) -- wird bei `/setup` automatisch geprüft!
   Falls nicht installiert, bietet das Framework die Installation an.
   Manuell:
   - macOS: `brew install --cask mactex-no-gui`
   - Linux: `sudo apt install texlive-xetex texlive-fonts-extra texlive-lang-german latexmk`
   - Windows: MiKTeX von https://miktex.org

## Setup

1. Repository klonen:
   ```bash
   git clone https://github.com/koljaschoepe/scientific-writing.git meine-arbeit
   cd meine-arbeit
   ```

2. Claude Code starten:
   ```bash
   claude
   ```

3. Setup ausführen:
   ```
   /setup
   ```
   Das Interview dauert ca. 5 Minuten und fragt nach:
   - Persönliche Daten (Name, Hochschule, Studiengang)
   - Arbeitstyp (Seminararbeit, Hausarbeit, Bachelor, Master, Dissertation)
   - Seitenumfang
   - Betreuung und Abgabetermin
   - Formatierungsvorgaben (Zitationsstil, Seitenränder, etc.)
   - Quellen-Workflow (BibTeX, PDF-Extraktion, manuell oder keine)
   - LaTeX-Installation (automatische Prüfung)
   - Optional: Merkblatt-PDF deiner Hochschule für automatische Erkennung

## Phasen

### Phase 1: Brainstorming
```
/next
```
Claude stellt Fragen zu deinen Interessen und entwickelt Themenvorschläge.
Am Ende: Forschungsfrage und Arbeitstitel.

### Phase 2: Gliederung
```
/approve    # Phase 1 freigeben
/next       # Phase 2 starten
```
Claude erstellt eine Kapitelstruktur mit Seitenschätzungen.
**Wichtig:** Ab Phase 3 ist die Gliederung gesperrt!

### Phase 3: Zitat-Zuordnung
(Wird bei `quellen.workflow: "keine"` automatisch übersprungen)

Stelle sicher, dass du genügend Quellen hast:
```
/cite       # Quellen hinzufügen (BibTeX, Zotero, PDF oder manuell)
/next       # Zuordnung starten
```

### Phase 4: Kapitel-Planung
```
/next       # Plant das nächste Kapitel
/approve    # Plan freigeben
```
Wiederhole bis alle Kapitel geplant sind.

### Phase 5: Schreiben
```
/write 2.1  # Bestimmtes Kapitel schreiben
/next       # Oder: nächstes Kapitel automatisch
/wordcount  # Fortschritt prüfen
```

### Phase 6: Qualitätsprüfung
```
/review 2.1 # Bestimmtes Kapitel prüfen
/next       # Oder: nächstes Kapitel automatisch
```
Drei spezialisierte Agenten prüfen Sprache, Zitationen und Argumentation.

### Phase 7: PDF erstellen
```
/compile
```
LaTeX-Export und PDF-Kompilierung. Fertig!

## Wichtige Dateien

| Datei | Was du damit machst |
|-------|-------------------|
| `config.yaml` | Wird von /setup generiert, selten manuell ändern |
| `preferences.md` | Verbotene Wörter und Stil-Präferenzen eintragen |
| `sources/literature.md` | Quellen und Zitate verwalten |
| `sources/notes.md` | Eigene Notizen und Ideen |
| `sources/pdfs/` | Quell-PDFs hier ablegen |
| `assets/img/` | Hochschul-Logo hier ablegen |

## Tipps

- Nutze `/status` um jederzeit den Fortschritt zu sehen
- Nutze `/help` für kontextsensitive Hilfe
- Prüfe jeden Draft bevor du ihn mit `/approve` freigibst
- Nutze `/rewrite X.X` wenn ein Kapitel komplett neu geschrieben werden soll
- Empfohlene Quellenanzahl: Seminar 5-10, Haus 8-15, Bachelor 20-40, Master 40-80
- BibTeX- oder Zotero-Import ist am schnellsten für viele Quellen auf einmal
