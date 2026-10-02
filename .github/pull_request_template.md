## Zusammenfassung

Was ändert dieser PR?

## Änderungen

- ...

## Typ

- [ ] Neuer Agent
- [ ] Neuer Skill / Slash Command
- [ ] Neuer Zitierstil
- [ ] Dashboard
- [ ] Werkzeug (.claude/kit/werkzeuge)
- [ ] Fehlerbehebung
- [ ] Dokumentation

## Checkliste

- [ ] Läuft auf Windows und macOS (nur Node-Built-ins, Pfade über `path.join`)
- [ ] `.claude/kit/SPEC.md`, `.claude/kit/docs/` und bei Bedarf `.claude/kit/dashboard/API.md` aktualisiert
- [ ] Regeln nur an ihrer Quelle geändert (Stil: `stilregeln.md`, Befehle: Skill-Frontmatter)
- [ ] `node .claude/kit/werkzeuge/update.mjs manifest` ausgeführt
- [ ] `AGENTS.md` + `.claude/CLAUDE.md` ohne HTML-Kommentare unter 4.500 Zeichen
- [ ] Formate in `.arbeit/` (einstellungen.md, plan.md, zustand.json) rückwärtskompatibel oder Migration in `zustand.mjs init`
