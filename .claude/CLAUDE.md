@../AGENTS.md

<!-- Für Menschen: Claude Code lädt diese Datei bei jedem Start. Sie bindet AGENTS.md ein und
ergänzt nur, was Claude Code betrifft. Gehört zum Kit, /update ersetzt sie. -->

## Claude Code

- Rückfrage-Tool = `AskUserQuestion`: `header` höchstens 12 Zeichen, `description` nennt die
  Folge, keine eigene Option „Sonstiges“, `preview` für Varianten. Bricht die Person ab: in
  zwei Sätzen sagen, wo sie steht.
- Subagents können nicht nachfragen, Interviews laufen im Hauptgespräch. Gib ihnen Pfade mit,
  keine Dateiinhalte.
- Skills ohne `disable-model-invocation` startest du selbst, wenn die Aufgabe passt, `weiter`
  auch bei „mach weiter“. start, sync, update, dashboard nur per Slash. Soll es direkt damit
  weitergehen: `.claude/skills/<name>/SKILL.md` lesen und befolgen.
- Rewind stellt keine Dateien wieder her, die Subagents oder Bash geschrieben haben. Dafür
  sichert `/sync`.

# Compact instructions

Bewahre: Phase und aktuelles Kapitel, laufenden Skill und Schritt, offene Entscheidungen und
Fragen an die Person, alle in dieser Session geänderten Dateien mit Pfad.
