# Scientific Writing Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet)](https://claude.com/claude-code)

Deine wissenschaftliche Arbeit, von der ersten Idee bis zum fertigen PDF. Komplett im Terminal mit [Claude Code](https://claude.com/claude-code).

Du triffst die Entscheidungen und lieferst die Quellen. Claude übernimmt Strukturierung, Kapitelplanung, wissenschaftliches Schreiben, Qualitätsprüfung und LaTeX-Export. Ein durchgehender Workflow für Seminararbeiten, Hausarbeiten, Bachelorarbeiten, Masterarbeiten und Dissertationen.

> **English:** AI-powered academic writing framework for [Claude Code](https://claude.com/claude-code). Supports seminar papers through dissertations. Currently German-language only.

## Schnellstart

### 1. Repository klonen

```bash
# Dieses Repository als Template verwenden (GitHub: "Use this template")
# oder direkt klonen:
git clone https://github.com/koljaschoepe/scientific-writing.git meine-arbeit
cd meine-arbeit
```

### 2. Claude Code starten

```bash
claude
```

### 3. Projekt einrichten

```
/setup
```

Das interaktive Interview führt dich in etwa 5 Minuten durch alle Einstellungen: Arbeitstyp, Seitenumfang, Methodik, Zitationsstil, Quellen-Workflow, Formatierung und mehr. Jede Frage bietet dir Auswahlmöglichkeiten, die du mit einem Klick bestätigen oder frei beantworten kannst.

### 4. Los geht's

```
/next
```

Ab hier wiederholst du `/next` und `/approve`, bis die Arbeit fertig ist.

## Workflow

`/setup` · `/next` · `/approve` · `/next` · ... · `/compile` · PDF

| Phase | Was passiert |
|-------|-------------|
| Setup | Interaktives Interview (ca. 5 Minuten) |
| 1 · Brainstorming | Thema und Forschungsfragen entwickeln |
| 2 · Gliederung | Kapitelstruktur erstellen |
| 3 · Zitat-Zuordnung | Quellen den Kapiteln zuweisen* |
| 4+5 · Planung + Schreiben | Kapitel einzeln planen und direkt schreiben |
| 6 · Qualitätsprüfung | 3 Agenten prüfen parallel |
| 7 · Finalisierung | LaTeX-Export und PDF |

*Phase 3 wird automatisch übersprungen wenn du im Setup "keine Quellen" gewählt hast.

## Features

- **7-Phasen-Workflow** von Brainstorming bis PDF
- **13 Slash Commands** für jeden Schritt
- **Interaktives Setup** mit geführtem Interview und Multiple-Choice-Fragen
- **Verschränktes Arbeiten** (Kapitel einzeln planen und direkt schreiben)
- **Flexible Quellenarbeit** (BibTeX, Zotero, PDF-Extraktion, manuell oder ohne Quellen)
- **4 Zitationsstile** (Harvard Inline, APA 7, IEEE, Chicago)
- **Konfigurierbar** für jede Hochschule (Ränder, Schriftart, Deckblatt, Logo)
- **3 parallele Reviewer** für Sprache, Zitationen und Argumentation
- **LaTeX-Export** mit automatischer PDF-Erstellung
- **Draft-Kompilierung** für PDF-Vorschau auch mit unvollständigen Kapiteln
- **Self-Healing** erkennt und repariert inkonsistente Projektzustände

## Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `/setup` | Projekt einrichten (interaktives Interview) |
| `/next` | Nächste Phase starten |
| `/status` | Fortschritt anzeigen (mit Self-Healing) |
| `/write [X.X]` | Kapitel schreiben |
| `/review [X.X]` | Qualitätsprüfung (3 Agenten parallel) |
| `/cite` | Quelle hinzufügen (PDF, manuell, BibTeX, Zotero) |
| `/compile` | LaTeX zu PDF (mit Auto-Install) |
| `/compile draft` | Entwurfs-PDF mit Platzhaltern |
| `/approve [X.X]` | Phase oder Kapitel freigeben |
| `/wordcount` | Wortanzahl und Seitenschätzung |
| `/rewrite [X.X]` | Kapitel komplett neu schreiben |
| `/reset [phase]` | Auf frühere Phase zurücksetzen |
| `/validate` | Projektkonfiguration prüfen |
| `/help` | Kontextsensitive Hilfe |

## Quellen importieren

```
/cite
```

Vier Wege:
1. **BibTeX-Import** (.bib-Datei direkt importieren)
2. **Zotero-Import** (CSV, RIS oder BibTeX aus Zotero)
3. **PDF-Analyse** (Claude extrahiert Metadaten und Zitate)
4. **Manuell** (schrittweise Eingabe)

## Voraussetzungen

- [Claude Code CLI](https://claude.com/claude-code) installiert
- **LaTeX** für PDF-Export (wird bei `/setup` oder `/compile` automatisch geprüft, Installation wird angeboten)
  - macOS: `brew install --cask mactex-no-gui`
  - Linux: `sudo apt install texlive-xetex texlive-fonts-extra texlive-lang-german latexmk`

## Dokumentation

- [Einstieg](docs/einstieg.md) (Schritt-für-Schritt-Anleitung)
- [Konfiguration](docs/konfiguration.md) (alle config.yaml-Optionen)
- [Literaturdatenbank](docs/literaturdatenbank.md) (Format, BibTeX, Zotero)
- [Eigene Hochschule](docs/eigene-hochschule.md) (Framework anpassen)
- [FAQ](docs/faq.md) (häufige Fragen)

## Contributing

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

[MIT](LICENSE)
