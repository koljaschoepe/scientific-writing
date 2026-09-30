@AGENTS.md

<!-- Maintainer: nur Claude-Code-Spezifika. Alles Werkzeugneutrale steht in AGENTS.md. -->

## Claude Code

- Rückfrage-Tool = `AskUserQuestion`: `header` höchstens 12 Zeichen, `description` nennt die
  Folge, keine eigene Option „Sonstiges“ (Freitext kommt automatisch), `preview` für Varianten.
  Ohne Interview nur die erste Antwort auf eine eindeutige Aufgabe. Bricht die Person ab: in
  zwei Sätzen sagen, wo sie steht.
- Subagents können nicht nachfragen. Interviews laufen im Hauptgespräch.
- Skills recherche, quellen, schreiben, pruefen, pdf, hilfe startest du selbst per Skill-Tool,
  wenn die Aufgabe passt. start, weiter, sync, update, dashboard nur per Slash der Person. Soll
  es direkt mit einem davon weitergehen: `.claude/skills/<name>/SKILL.md` lesen und befolgen.
- Rewind (Esc Esc) stellt keine Dateien wieder her, die Subagents (autor) oder Bash geschrieben
  haben. Dafür sichert `/sync`.

# Compact instructions

Bewahre: Phase und aktuelles Kapitel, laufenden Skill und Schritt, offene Entscheidungen und
Fragen an die Person, alle in dieser Session geänderten Dateien mit Pfad.
