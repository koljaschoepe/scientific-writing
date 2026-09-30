# Mitmachen

Danke für dein Interesse am Scientific Writing Kit.

## Grundsätze

Verbindlich ist [kit/SPEC.md](kit/SPEC.md). Die wichtigsten Punkte:

- **Windows und macOS gleichwertig.** Werkzeuge und Hooks sind Node-Skripte (`.mjs`, nur
  Built-ins, Node 20 oder neuer). Kein bash, python3 oder jq in Hooks. Pfade über `path.join`.
  Hooks in Exec-Form (`"command": "node", "args": [...]`).
- **Interview-Tool.** Jede Rückfrage in einem Skill über AskUserQuestion. Interviews laufen
  im Hauptgespräch, nicht in Subagents.
- **Dateien sind die Wahrheit.** Das Dashboard rendert aus den Dateien, es speichert nichts
  selbst. Zustand ändert sich nur über `kit/werkzeuge/zustand.mjs`.
- **Eigentumszonen.** Kit-Dateien stehen in `kit/manifest.json`
  (`node kit/werkzeuge/update.mjs manifest` nach jeder Änderung an Kit-Dateien). Alles andere,
  auch eigene Skills, fasst ein Update nie an.
- **Kontext sparen.** Werkzeugneutrale Regeln in `AGENTS.md`, Claude-Spezifika in `CLAUDE.md`,
  beide zusammen unter 6.500 Zeichen. Wichtige Regeln oben in jede SKILL.md.
- **Für Nicht-Techniker.** Meldungen ohne Jargon, jeder Fehler mit dem nächsten Schritt.

## Aufbau

```
AGENTS.md                        Hauptregeln für alle Agenten
CLAUDE.md                        @AGENTS.md plus Claude-Code-Spezifika
.claude/skills/<name>/SKILL.md   die elf Befehle (Frontmatter mit gruppe)
.claude/agents/*.md              Subagents (name, description, tools, model, effort, omitClaudeMd)
.claude/rules/*.md               Regeln mit paths:-Frontmatter
.claude/hooks/*.mjs              SessionStart (start.mjs) und UserPromptSubmit (prompt.mjs)
kit/ablauf/<phase>.md            Vorgehen je Phase, geladen von /weiter
kit/leitfaeden/                  Schreib-, Struktur-, Zitier- und Fachleitfäden
kit/vorlagen/                    Vorlagen für Nutzerdateien
kit/dashboard/                   Server und Oberfläche, Vertrag in kit/dashboard/API.md
kit/werkzeuge/                   stand, zustand, kandidaten, bib, pdf, check, sync, git-lage, update, lib, playwright-mcp
latex/vorlage/                   LaTeX-Vorlage
install/                         Einrichtungs-Skripte
docs/                            Anleitungen für Menschen
```

## Eine neue Version veröffentlichen

1. `kit/VERSION` erhöhen (SemVer).
2. Abschnitt oben in `kit/CHANGELOG.md`: `## x.y.z (YYYY-MM-DD)`, in einfacher Sprache.
3. `node kit/werkzeuge/update.mjs manifest`, dann Werkzeuge testen: `node kit/werkzeuge/check.mjs`, Dashboard starten, `/pdf` mit Beispiel.
4. Auf `main` pushen. Nutzer holen es mit `/update`.

## Fehler melden

Issue mit: Betriebssystem, Ausgabe von `node kit/werkzeuge/check.mjs`, Kit-Version, was du
erwartet hast und was passiert ist. Bitte keine Inhalte aus deiner Arbeit und keine
Zugangsdaten.
