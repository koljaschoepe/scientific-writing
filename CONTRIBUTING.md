# Contributing

Danke für dein Interesse am Scientific Writing Framework!

## Architektur-Überblick

```
.claude/
  agents/          10 spezialisierte Agenten (Brainstorming, Writer, Reviewer, ...)
  skills/          13 Slash Commands (/setup, /next, /cite, /compile, /reset, /validate, ...)
  rules/           3 Rule-Sets (writing-style, citation-format, latex-conventions)
  settings.json    Session-Hooks (Willkommensnachricht, Phase-Erkennung)

base/
  guides/          Leitfäden (akademisches Schreiben, Kapitelstruktur, Zitationsstile)
  templates/       Vorlagen (Kapitelplan, Kapitel, Bibliografie-Eintrag)

config.yaml        Zentrale Projektkonfiguration
preferences.md     Benutzerdefinierte Schreibpräferenzen
docs/              Ausführliche Dokumentation
```

### Wie Agents und Skills zusammenspielen

1. **Skills** (`.claude/skills/*/SKILL.md`) sind die Einstiegspunkte für User-Befehle
2. Skills starten **Agents** (`.claude/agents/*.md`) für die eigentliche Arbeit
3. Agents laden **Rules** (`.claude/rules/*.md`) und **Guides** (`base/guides/`) als Kontext
4. Alle Agents lesen `config.yaml` für projektspezifische Einstellungen
5. Ergebnisse werden in `output/phase-XX/draft/` gespeichert

### Datenfluesse

```
config.yaml ──> Alle Agents/Skills
preferences.md ──> Writer, Reviewer-Language
sources/literature.md ──> Writer, Citation-Mapper, Reviewer-Citations
output/progress.json ──> /next, /status, /approve
```

## Neuen Skill hinzufügen

1. Erstelle `.claude/skills/DEIN-SKILL/SKILL.md`
2. Nutze das Frontmatter-Format:
   ```yaml
   ---
   name: dein-skill
   description: Kurzbeschreibung wann der Skill genutzt wird
   ---
   ```
3. Dokumentiere den Ablauf mit nummerierten Schritten
4. Registriere den Skill in `CLAUDE.md` (Befehle-Tabelle)
5. Füge einen Eintrag in `/help` hinzu

## Neuen Agent hinzufügen

1. Erstelle `.claude/agents/DEIN-AGENT.md`
2. Struktur:
   - **Rolle:** Was macht der Agent?
   - **Kontext laden:** Welche Dateien werden gelesen?
   - **Vorbedingungen:** Wann soll der Agent stoppen?
   - **Aufgabe:** Schritt-für-Schritt-Anleitung
   - **Output:** Wo und in welchem Format wird gespeichert?
   - **Qualitäts-Checkliste:** Selbstprüfung
3. Wichtig: Immer `config.yaml` als erstes laden
4. Bei Quellen-Abhängigkeit: `quellen.workflow` prüfen

## Neuen Zitationsstil hinzufügen

1. Kopiere `base/guides/citation-systems/_vorlage.md`
2. Benenne die Kopie (z.B. `mla.md`)
3. Fülle alle Sektionen aus (Inline-Format, Literaturverzeichnis-Format, Beispiele)
4. Trage den Stil in `docs/konfiguration.md` ein

## Richtlinien

### Sprache
- Inhalte: Deutsch
- Ordner- und Dateinamen: Englisch
- Slash Commands: Englisch
- Code-Kommentare: Deutsch oder Englisch

### Dateien
- Guides: `base/guides/` -- Maximal 80 Zeilen pro Datei
- Agents: `.claude/agents/` -- Folgen dem Agent-Schema
- Skills: `.claude/skills/*/SKILL.md` -- YAML-Frontmatter + Anweisungen
- Rules: `.claude/rules/` -- Path-scoped mit globs-Frontmatter
- Keine hartkodierten Werte -- immer aus config.yaml lesen

## Pull Requests

1. Fork erstellen
2. Feature-Branch anlegen (`git checkout -b feature/mein-feature`)
3. Änderungen mit Tests/Beispielen beschreiben
4. PR mit ausgefülltem Template erstellen
