# Scientific Writing Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet)](https://claude.com/claude-code)

KI-gestütztes Framework für wissenschaftliche Arbeiten mit [Claude Code](https://claude.com/claude-code).

Du lieferst Quellen und Entscheidungen -- Claude führt dich Schritt für Schritt zur fertigen Arbeit.

> **English:** AI-powered academic writing framework for [Claude Code](https://claude.com/claude-code). Supports seminar papers through dissertations. Currently German-language only -- English support planned.

## Unterstützte Arbeitstypen

| Typ | Seiten | Quellen |
|-----|--------|---------|
| Seminararbeit | 10-20 | Optional |
| Hausarbeit | 15-25 | Optional |
| Bachelorarbeit | 30-60 | Empfohlen |
| Masterarbeit | 50-100 | Empfohlen |
| Dissertation | 150+ | Erforderlich |

## Features

- **7-Phasen-Workflow:** Brainstorming -> Gliederung -> Zitate -> Planung -> Schreiben -> Review -> PDF
- **13 Slash Commands:** `/setup`, `/next`, `/write`, `/review`, `/cite`, `/compile`, `/reset`, `/validate` u.v.m.
- **Verschränktes Arbeiten:** Kapitel einzeln planen und direkt schreiben (statt alle planen, dann alle schreiben)
- **Flexible Quellenarbeit:** BibTeX-Import, Zotero-Import, PDF-Extraktion, manuell -- oder ohne Quellen
- **Konfigurierbar:** Jede Hochschule, jeder Zitationsstil (Harvard, APA7, IEEE, Chicago)
- **3 parallele Reviewer:** Sprache, Zitationen, Argumentation -- gleichzeitig
- **LaTeX-Export:** Automatische PDF-Erstellung mit Auto-Compile Watcher
- **Draft-Kompilierung:** PDF-Vorschau auch mit unvollständigen Kapiteln
- **Abstract-Generierung:** Optionale Zusammenfassung vor der Einleitung
- **Projekt-Validierung:** Automatische Konsistenzprüfung aller Projektdaten
- **Self-Healing:** `/status` erkennt und repariert inkonsistente Projektzustände
- **Phase-Reset:** Jederzeit auf eine frühere Phase zurücksetzen (mit Archivierung)

## Workflow

```
/setup ──> /next ──> /approve ──> /next ──> ... ──> /compile ──> PDF
  │          │          │
  │    Brainstorming    │
  │    Gliederung    Freigabe
  │    Zitate*       (draft->final)
  │    ┌──────────────┐
  │    │ Plan Kap 1.1 │
  │    │ Write Kap 1.1│  <- Verschränkt:
  │    │ Plan Kap 1.2 │     Planen + Schreiben
  │    │ Write Kap 1.2│     wechseln sich ab
  │    │ ...          │
  │    └──────────────┘
  │    Review (3x parallel)
  │    PDF
  │
  Einmaliges Interview
  (~5 Minuten)

  * wird bei "keine Quellen" übersprungen
```

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

Das Interview fragt nach:
- Persönliche Daten (Name, Hochschule, Studiengang)
- Arbeitstyp (Seminararbeit bis Dissertation)
- Seitenumfang
- Zitationsstil
- Quellen-Workflow (BibTeX, PDF, manuell oder keine)
- LaTeX-Installation (wird automatisch geprüft)

### 4. Los geht's

```
/next
```

## Voraussetzungen

- [Claude Code CLI](https://claude.com/claude-code) installiert
- **LaTeX** (für PDF-Export) -- wird bei `/setup` oder `/compile` automatisch geprüft und Installation angeboten:
  - macOS: `brew install --cask mactex-no-gui`
  - Linux: `sudo apt install texlive-xetex texlive-fonts-extra texlive-lang-german latexmk`

## Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `/setup` | Projekt einrichten (Interview) |
| `/next` | Nächste Phase starten |
| `/status` | Fortschritt anzeigen (mit Self-Healing) |
| `/write [X.X]` | Kapitel schreiben |
| `/review [X.X]` | Qualitätsprüfung (3 Agenten parallel) |
| `/cite` | Quelle hinzufügen (PDF, manuell, BibTeX, Zotero) |
| `/compile` | LaTeX -> PDF (mit Auto-Install und Auto-Compile) |
| `/compile draft` | Entwurfs-PDF mit Platzhaltern |
| `/approve [X.X]` | Phase oder einzelnes Kapitel freigeben |
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
1. **BibTeX-Import** -- .bib-Datei direkt importieren (Batch)
2. **Zotero-Import** -- CSV, RIS oder BibTeX aus Zotero
3. **PDF-Analyse** -- Claude extrahiert Metadaten und Zitate aus PDFs
4. **Manuell** -- Schrittweise Eingabe

## Dokumentation

- [Einstieg](docs/einstieg.md) -- Ausführliche Schritt-für-Schritt-Anleitung
- [Konfiguration](docs/konfiguration.md) -- Alle config.yaml-Optionen
- [Literaturdatenbank](docs/literaturdatenbank.md) -- Format, BibTeX-Import, Zotero
- [Eigene Hochschule](docs/eigene-hochschule.md) -- Framework an deine Uni anpassen
- [FAQ](docs/faq.md) -- Häufige Fragen

## Contributing

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Architektur-Details und Richtlinien.

## Lizenz

[MIT](LICENSE)
