---
name: dashboard
description: Dashboard starten und öffnen, nach Wunsch umbauen oder einen eigenen Skill für den Werkzeugkasten anlegen oder ändern.
argument-hint: "[anpassen <wunsch> | skill <name>]"
disable-model-invocation: true
gruppe: technik
---

# /dashboard

**Wichtig:** Das Dashboard ist eine Ansicht, die Wahrheit liegt in den Dateien. Anpassungen
der Person gehören nach `.arbeit/dashboard-anpassungen.css|js`, nie zuerst in
`.claude/kit/dashboard/` (wird bei `/update` ersetzt). Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`. Mit `anpassen`: `dashboard/anpassen.md` lesen und befolgen. Mit
`skill`: `dashboard/skill-anlegen.md` lesen und befolgen.

## Ohne Argument: starten und öffnen

1. `node .claude/kit/dashboard/server.mjs --starten` (startet im Hintergrund, gibt die Adresse aus).
2. Ein Satz: Link anklicken (öffnet im VS-Code-Browser) oder Strg+Shift+P (Mac Cmd+Shift+P),
   „Simple Browser: Show“, Adresse einfügen. Normaler Browser: `--starten --oeffnen`.
3. Scheitert es: `node .claude/kit/dashboard/server.mjs` im Vordergrund, Fehlermeldung einfach
   erklären, reparieren (Node fehlt: hilfe-Skill, Datei kaputt: `check.mjs --reparieren`).
4. Kein Interview nötig, außer etwas war kaputt.

Für Fragen, was es dort gibt: Reiter Übersicht, Quellen, Kapitel, Plan, Hilfe. Klick auf einen
Datei- oder Absatznamen öffnet VS Code an der Stelle, Klick auf eine Zeile klappt sie auf.
Lesepanel rechts für PDF und Kapitel, Quellen mit Zitaten, Fundstellen und Kernaussage,
Umfang in Seiten, Plan mit Meilensteinen und Terminen, Werkzeugkasten mit allen Skills,
Rückgängig für jede Aktion. Aktionen erreichen Claude als Journal vor dem nächsten Prompt.
