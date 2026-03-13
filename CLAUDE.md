# Scientific Writing Framework

Deine wissenschaftliche Arbeit, von der ersten Idee bis zum fertigen PDF.

Du triffst die Entscheidungen und lieferst die Quellen. Claude übernimmt Strukturierung, Kapitelplanung, wissenschaftliches Schreiben, Qualitätsprüfung und LaTeX-Export. Ein durchgehender Workflow für Seminararbeiten, Hausarbeiten, Bachelorarbeiten, Masterarbeiten und Dissertationen. Alles im Terminal, alles in einem Projekt.

## Schnellstart

1. `/setup` ausführen (einmaliges Interview, ca. 5 Minuten)
2. `/next` ausführen (startet die nächste Phase automatisch)
3. Output prüfen und mit `/approve` freigeben
4. Wiederholen bis die Arbeit fertig ist

## Workflow

`/setup` · `/next` · `/approve` · `/next` · ... · `/compile` · PDF

| Phase | Was passiert |
|-------|-------------|
| 1 · Brainstorming | Thema und Forschungsfragen entwickeln |
| 2 · Gliederung | Kapitelstruktur erstellen (danach gesperrt) |
| 3 · Zitat-Zuordnung | Quellen den Kapiteln zuweisen |
| 4+5 · Planung + Schreiben | Kapitel einzeln planen und direkt schreiben |
| 6 · Qualitätsprüfung | Sprache, Zitate, Argumentation (3 Agenten parallel) |
| 7 · Finalisierung | LaTeX-Export, Abstract, PDF |

Phase 3 wird automatisch übersprungen wenn `quellen.workflow: "keine"` gesetzt ist.

In Phase 4 und 5 wird verschränkt gearbeitet: Ein Kapitel planen, direkt schreiben, nächstes Kapitel planen, schreiben. Kein stundenlanges Vorausplanen ohne Ergebnis.

## Befehle

| Befehl | Funktion |
|--------|----------|
| `/setup` | Projekt einrichten (interaktives Interview) |
| `/next` | Nächste Phase starten |
| `/status` | Fortschritt anzeigen (mit Self-Healing) |
| `/write [X.X]` | Kapitel schreiben |
| `/review [X.X]` | Qualitätsprüfung (3 Agenten parallel) |
| `/cite` | Quelle hinzufügen (PDF, manuell, BibTeX, Zotero) |
| `/compile` | LaTeX kompilieren zu PDF (mit Auto-Install) |
| `/compile draft` | Entwurfs-PDF mit Platzhaltern für fehlende Kapitel |
| `/approve [X.X]` | Phase oder Kapitel freigeben (draft → final) |
| `/wordcount` | Wortanzahl und Seitenschätzung |
| `/rewrite [X.X]` | Kapitel komplett neu schreiben |
| `/reset [phase]` | Auf frühere Phase zurücksetzen (archiviert Ergebnisse) |
| `/validate` | Projektkonfiguration und Datenintegrität prüfen |
| `/help` | Kontextsensitive Hilfe |

## Regeln für generierte Texte

Diese Regeln gelten immer:

- Jede Behauptung muss mit einer Quelle belegt sein (Dichte nach Arbeitstyp, siehe writing-style Rule). Ausnahme: Bei `quellen.workflow: "keine"` entfällt die Zitationspflicht.
- Keine Ich-Form, sachlich-neutral schreiben
- Zitate ausschließlich aus `sources/literature.md` verwenden (entfällt bei quellen.workflow "keine")
- Wörter nicht in benachbarten Sätzen wiederholen
- Roter Faden: Jedes Kapitel baut implizit auf dem vorherigen auf
- Keine Gedankenstriche, kein Semicolon, selten Doppelpunkte

Übergänge zwischen Kapiteln:
- Kein letzter Satz der das nächste Kapitel ankündigt
- Kein erster Satz der das vorherige Kapitel zusammenfasst
- Keine expliziten Kapitelverweise ("Wie in Kapitel X dargelegt...")
- Verbindung durch Konzeptnamen, nicht durch Verweise

Zitationsformat wird aus `config.yaml` geladen (Agents laden ausschließlich den aktiven Stil).
Schreibpräferenzen: @preferences.md

## Projektstruktur

| Ordner/Datei | Zweck |
|-------------|-------|
| `config.yaml` | Zentrale Konfiguration (von `/setup` generiert) |
| `preferences.md` | Schreibpräferenzen (verbotene Wörter etc.) |
| `sources/` | Quellen, Zitate und Notizen |
| `sources/pdfs/` | Quell-PDFs ablegen |
| `assets/img/` | Hochschul-Logo und Bilder |
| `base/` | Leitfäden, Zitationsstile, Vorlagen |
| `output/` | Generierte Inhalte (pro Phase, draft/final) |
| `docs/` | Ausführliche Dokumentation |

## Kontext-Regeln für Agents

- Lies immer zuerst `config.yaml` für die aktuelle Konfiguration
- Prüfe `config.yaml → quellen.workflow` (bei "keine" entfallen alle Zitationsschritte)
- Lade den Zitationsstil aus `base/guides/citation-systems/{config.formatierung.zitationsstil}.md`
- Lade nicht alle Zitationsstile, nur den aktiven
- Lade `preferences.md` für benutzerdefinierte Schreibpräferenzen
- Lade Base-Guides modular: nur die für die aktuelle Aufgabe relevanten Dateien
- Aktualisiere `output/progress.json` nach jeder abgeschlossenen Aktion
- Writer: Lade nur das vorherige Kapitel komplett, von älteren nur die letzten 2 Absätze

## Erste Schritte

Noch kein Projekt eingerichtet? Starte mit `/setup`.

Bereits eingerichtet? Setze fort mit `/next`.

Probleme? Starte mit `/validate`.
