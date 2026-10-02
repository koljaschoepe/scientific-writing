# Mitmachen

Danke für dein Interesse am Scientific Writing Kit. Diese Datei richtet sich an alle, die am
Kit selbst bauen. Sie liegt nur im Template, der Installer entfernt sie im neuen Projekt.

## Grundsätze

Verbindlich ist [.claude/kit/SPEC.md](.claude/kit/SPEC.md). Die wichtigsten Punkte:

- **Windows und macOS gleichwertig.** Werkzeuge und Hooks sind Node-Skripte (`.mjs`, nur
  Built-ins, Node 20 oder neuer). Kein bash, python3 oder jq in Hooks. Pfade über `path.join`.
  Hooks in Exec-Form (`"command": "node", "args": [...]`).
- **Drei Bereiche.** Kit (`.claude/` plus wenige Root-Dateien), Arbeit der Person (`kapitel/`,
  `quellen/`, `daten/`, `abbildungen/`), Stand und Einstellungen (`.arbeit/`). `/update`
  ersetzt nur das Kit.
- **Dateien sind die Wahrheit.** Das Dashboard rendert aus den Dateien. Zustand ändert sich nur
  über `.claude/kit/werkzeuge/zustand.mjs`, Einstellungen stehen nur in
  `.arbeit/einstellungen.md`.
- **Eine Quelle je Regel.** Stilschwellen nur in `.claude/kit/leitfaeden/schreiben/stilregeln.md`
  und den Schaltern, Befehlsbeschreibungen nur in der Skill-Frontmatter, Schemata nur in den
  Vorlagen und in `API.md`.
- **Kontext sparen.** `AGENTS.md` + `.claude/CLAUDE.md` ohne HTML-Kommentare unter 4.500
  Zeichen. Erklärungen für Menschen als HTML-Kommentar. Wichtiges oben in jede SKILL.md,
  Seltenes in Zusatzdateien im Skill-Ordner. Prüfer schreiben ihre Ergebnisse selbst in Dateien.
- **Für Nicht-Techniker.** Meldungen ohne Jargon, jeder Fehler mit dem nächsten Schritt.

## Architektur

```
AGENTS.md                         Hauptregeln für alle Agenten (Codex liest sie direkt)
.claude/CLAUDE.md                 @../AGENTS.md plus Claude-Code-Spezifika
.claude/skills/<name>/SKILL.md    die elf Befehle, Zusatzdateien daneben (z. B. start/runden/)
.claude/agents/*.md               Subagents (name, description, tools, model, effort, omitClaudeMd)
.claude/rules/*.md                Regeln mit paths:-Frontmatter
.claude/hooks/*.mjs               SessionStart (start.mjs) und UserPromptSubmit (prompt.mjs)
.claude/kit/ablauf/<phase>.md     Vorgehen je Phase, geladen von /weiter
.claude/kit/leitfaeden/           Stil-, Struktur-, Zitier-, Fach-, Interview-, Challenge-Leitfäden
.claude/kit/vorlagen/             Vorlagen, u. a. arbeit/einstellungen.md und arbeit/plan.md
.claude/kit/werkzeuge/            zustand, seiten, stil, stand, kandidaten, bib, pdf, check, sync, update, lib …
.claude/kit/dashboard/            Server und Oberfläche, Vertrag in API.md
.claude/kit/latex/                LaTeX-Vorlage und CSL-Dateien
.claude/kit/install/              Einrichtungs-Skripte
.claude/kit/docs/                 Anleitungen für Menschen
```

## Manifest

`.claude/kit/manifest.json` listet jede Kit-Datei mit Prüfsumme. `/update` ersetzt oder
entfernt nur Dateien, die im alten oder neuen Manifest stehen. Eigene Skills der Person stehen
nicht darin und bleiben deshalb erhalten. Nach jeder Änderung an Kit-Dateien:

```
node .claude/kit/werkzeuge/update.mjs manifest
```

Neue Dateien unter `.claude/` müssen von Git erfasst sein, sonst fehlen sie im Manifest.

## Ausgeblendete Dateien sichtbar machen

`.vscode/settings.json` blendet für die Nutzerin alles Technische aus (`files.exclude`).
Ordner-Einstellungen haben Vorrang vor deinen Benutzereinstellungen, im Template-Repo siehst
du deshalb selbst fast nichts. Wege für Maintainer:

- **Lokal ändern, nicht committen:** `files.exclude` in `.vscode/settings.json` auskommentieren
  und mit `git update-index --skip-worktree .vscode/settings.json` vor Commits schützen.
  Rückgängig: `git update-index --no-skip-worktree .vscode/settings.json`.
- **Ohne VS Code:** im Terminal (`ls -a`, `git status`) oder mit einem anderen Editor arbeiten.
  Claude Code, die Hooks und die Werkzeuge sehen alle Dateien, `files.exclude` gilt nur für
  den Explorer, die Suche und Quick Open von VS Code.
- Einmalig schnell: Datei per Pfad öffnen (`code .claude/kit/SPEC.md`).

## Eine neue Version veröffentlichen

1. `.claude/kit/VERSION` erhöhen (SemVer).
2. Abschnitt oben in `.claude/kit/CHANGELOG.md`: `## x.y.z (YYYY-MM-DD)`, in einfacher Sprache.
3. `node .claude/kit/werkzeuge/update.mjs manifest`, dann testen: `node .claude/kit/werkzeuge/check.mjs`,
   Dashboard starten, `/pdf` mit Beispiel, `/update` aus einem Projekt der Vorversion.
4. Auf `main` pushen. Nutzerinnen holen es mit `/update`.

## Fehler melden

Issue mit: Betriebssystem, Ausgabe von `node .claude/kit/werkzeuge/check.mjs`, Kit-Version, was
du erwartet hast und was passiert ist. Bitte keine Inhalte aus deiner Arbeit und keine
Zugangsdaten.
