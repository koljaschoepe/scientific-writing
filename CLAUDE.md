# Scientific Writing Framework

> KI-gestütztes Framework für wissenschaftliche Arbeiten.
> Unterstützt Seminararbeiten, Hausarbeiten, Bachelorarbeiten, Masterarbeiten und Dissertationen.
> Du lieferst Quellen und Entscheidungen -- Claude führt dich
> Schritt für Schritt zur fertigen Arbeit.

## Schnellstart

1. `/setup` ausführen (einmaliges Interview: Arbeitstyp, Hochschule, Quellen-Workflow, etc.)
2. `/next` ausführen (startet die nächste Phase automatisch)
3. Output prüfen und mit `/approve` freigeben
4. Schritt 2-3 wiederholen bis die Arbeit fertig ist

## Befehle

| Befehl | Funktion |
|--------|----------|
| `/setup` | Projekt einrichten (Interview) |
| `/next` | Nächste Phase starten |
| `/status` | Fortschritt anzeigen (mit Self-Healing) |
| `/write [X.X]` | Kapitel schreiben |
| `/review [X.X]` | Qualitätsprüfung (3 Agenten parallel) |
| `/cite` | Quelle hinzufügen (PDF, manuell, BibTeX, Zotero) |
| `/compile` | LaTeX kompilieren -> PDF (mit Auto-Install) |
| `/compile draft` | Entwurfs-PDF mit Platzhaltern für fehlende Kapitel |
| `/approve [X.X]` | Phase/Kapitel freigeben (draft -> final) |
| `/wordcount` | Wortanzahl + Seitenschätzung |
| `/rewrite [X.X]` | Kapitel komplett neu schreiben |
| `/reset [phase]` | Auf frühere Phase zurücksetzen (archiviert spätere Ergebnisse) |
| `/validate` | Projektkonfiguration und Datenintegrität prüfen |
| `/help` | Kontextsensitive Hilfe |

## Phasen

```
Phase 1: Brainstorming      -> Thema und Forschungsfragen entwickeln
Phase 2: Gliederung         -> Kapitelstruktur erstellen (danach gesperrt)
Phase 3: Zitat-Zuordnung    -> Quellen den Kapiteln zuweisen (bei "keine Quellen" übersprungen)
Phase 4+5: Planung+Schreiben -> Verschränkt: Plan Kapitel -> Schreiben -> Plan nächstes -> ...
Phase 6: Qualitätsprüfung   -> Sprache, Zitate und Argumentation prüfen (parallel)
Phase 7: Finalisierung      -> LaTeX-Export, Abstract und PDF-Kompilierung
```

## Regeln für generierte Texte

WICHTIG -- Diese Regeln gelten IMMER:

- Jede Behauptung muss mit einer Quelle belegt sein (Dichte nach Arbeitstyp, siehe writing-style Rule)
  - Ausnahme: Bei `quellen.workflow: "keine"` entfällt die Zitationspflicht
- Keine Ich-Form, sachlich-neutral schreiben
- Zitate NUR aus `sources/literature.md` verwenden (nicht bei quellen.workflow "keine")
- Wörter NICHT in benachbarten Sätzen wiederholen
- Roter Faden: Jedes Kapitel baut implizit auf dem vorherigen auf
- Keine Gedankenstriche, kein Semicolon, selten Doppelpunkte

Übergänge zwischen Kapiteln:
- KEIN letzter Satz der das nächste Kapitel ankündigt
- KEIN erster Satz der das vorherige Kapitel zusammenfasst
- KEINE expliziten Kapitelverweise ("Wie in Kapitel X dargelegt...")
- Verbindung durch Konzeptnamen, nicht durch Verweise

Zitationsformat wird aus `config.yaml` geladen (Agents laden NUR den aktiven Stil).
Schreibpräferenzen: @preferences.md

## Projektstruktur

| Ordner/Datei | Zweck |
|-------------|-------|
| `config.yaml` | Zentrale Konfiguration (von `/setup` generiert) |
| `preferences.md` | Deine Schreibpräferenzen (verbotene Wörter etc.) |
| `sources/` | Quellen, Zitate und Notizen |
| `sources/pdfs/` | Quell-PDFs ablegen |
| `assets/img/` | Hochschul-Logo und Bilder ablegen |
| `base/` | Leitfäden, Zitationsstile, Vorlagen |
| `output/` | Generierte Inhalte (pro Phase, draft/final) |
| `docs/` | Ausführliche Dokumentation |

## Kontext-Regeln für Agents

- Lies IMMER zuerst `config.yaml` für die aktuelle Konfiguration
- Prüfe `config.yaml -> quellen.workflow` -- bei "keine" entfallen alle Zitationsschritte
- Lade den Zitationsstil aus `base/guides/citation-systems/{config.formatierung.zitationsstil}.md`
- Lade NICHT alle Zitationsstile -- nur den aktiven
- Lade `preferences.md` für benutzerdefinierte Schreibpräferenzen
- Lade Base-Guides modular: nur die für die aktuelle Aufgabe relevanten Dateien
- Aktualisiere `output/progress.json` nach jeder abgeschlossenen Aktion
- Writer: Lade nur das vorherige Kapitel komplett, von älteren nur die letzten 2 Absätze

## Erste Schritte

Noch kein Projekt eingerichtet? Starte mit:
```
/setup
```

Bereits eingerichtet? Setze fort mit:
```
/next
```

Probleme? Starte mit:
```
/validate
```
