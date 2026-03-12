---
name: write
description: Schreibt ein bestimmtes Kapitel oder das nächste ungeschriebene. Nutze diesen Skill wenn der User /write eingibt, optional mit Kapitelnummer wie /write 2.3.
---

# Kapitel schreiben

Schreibt den wissenschaftlichen Fließtext für ein Unterkapitel.

## Ablauf

### 1. Kapitelnummer bestimmen

**Mit Parameter (z.B. /write 2.3):**
- Verwende die angegebene Kapitelnummer

**Ohne Parameter (/write):**
- Lies `output/phase-02-outline/final/thesis-structure.yaml`
- Finde das nächste Kapitel das:
  - Einen freigegebenen Plan hat (`output/phase-04-plans/final/plan-X-X.md`)
  - Noch NICHT geschrieben ist (keine Datei in `output/phase-05-writing/draft/` oder `final/`)
- Falls kein Kapitel gefunden: "Alle geplanten Kapitel sind bereits geschrieben.
  Nutze /review um die Qualitätsprüfung zu starten."

### 2. Vorbedingungen prüfen

- [ ] config.yaml existiert
- [ ] Freigegebener Plan existiert für dieses Kapitel
- [ ] Alle vorherigen Kapitel sind geschrieben und freigegeben
- [ ] Benötigte Zitate sind in `sources/literature.md`

Falls eine Bedingung fehlt:
- Erkläre was fehlt
- Schlage Lösung vor (z.B. "/next um den Plan zu erstellen")

### 3. Agent starten

Starte den Agent `.claude/agents/writer.md` mit dem Kapitel als Kontext.

### 4. Ergebnis

Nach dem Schreiben:
- Zeige Zusammenfassung: Kapitel [X.X], [Y] Wörter, [Z] geplante Seiten
- Falls Abweichung > 15%: Melde es
- Empfehle: "Prüfe das Ergebnis in output/phase-05-writing/draft/[X-X].md
  und nutze /approve um es freizugeben."
