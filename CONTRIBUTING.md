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
- **Eigentumszonen.** Das Kit darf nur Herstellerdateien ändern, siehe `HERSTELLERZONE` in
  `kit/werkzeuge/update.mjs`. Nutzerdateien (`arbeit/`, `quellen/`, `code/`, `daten/`,
  `abbildungen/`) fasst ein Update nie an.
- **Für Nicht-Techniker.** Meldungen ohne Jargon, jeder Fehler mit dem nächsten Schritt.

## Aufbau

```
.claude/skills/<name>/SKILL.md   die elf Befehle
.claude/agents/*.md              Subagents (Frontmatter: name, description, tools, model)
.claude/rules/*.md               Regeln mit paths:-Frontmatter
.claude/hooks/*.mjs              SessionStart und Stop
kit/ablauf/<phase>.md            Vorgehen je Phase, geladen von /weiter
kit/leitfaeden/                  Schreib-, Struktur-, Zitier- und Fachleitfäden
kit/vorlagen/                    Vorlagen für Nutzerdateien
kit/dashboard/                   Server und Oberfläche
kit/werkzeuge/                   stand, zustand, sync, update, pdf, check, bib, playwright-mcp
latex/vorlage/                   LaTeX-Vorlage
install/                         Einrichtungs-Skripte
docs/                            Anleitungen für Menschen
```

## Eine neue Version veröffentlichen

1. `kit/VERSION` erhöhen (SemVer).
2. Abschnitt oben in `kit/CHANGELOG.md`: `## x.y.z (YYYY-MM-DD)`, in einfacher Sprache.
3. Werkzeuge testen: `node kit/werkzeuge/check.mjs`, Dashboard starten, `/pdf` mit Beispiel.
4. Auf `main` pushen. Nutzer holen es mit `/update`.

## Fehler melden

Issue mit: Betriebssystem, Ausgabe von `node kit/werkzeuge/check.mjs`, Kit-Version, was du
erwartet hast und was passiert ist. Bitte keine Inhalte aus deiner Arbeit und keine
Zugangsdaten.
