---
name: dashboard
description: Dashboard starten und öffnen, nach Wunsch umbauen oder einen eigenen Skill für den Werkzeugkasten anlegen oder ändern.
argument-hint: "[anpassen <wunsch> | skill <name>]"
disable-model-invocation: true
gruppe: technik
---

# /dashboard

**Wichtig:** Das Dashboard ist eine Ansicht, die Wahrheit liegt in den Dateien.
Anpassungen der Person gehören nach `arbeit/dashboard-anpassungen.css|js`, nie zuerst in
`kit/dashboard/*` (wird bei `/update` ersetzt). `dashboard.html` wird generiert.
Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Ohne Argument: starten und öffnen

1. `node kit/dashboard/server.mjs --starten` (startet im Hintergrund, gibt die Adresse aus).
2. Ein Satz: Link anklicken (öffnet im VS-Code-Browser) oder Strg+Shift+P (Mac Cmd+Shift+P),
   „Simple Browser: Show“, Adresse einfügen. Normaler Browser: `--starten --oeffnen`.
3. Scheitert es: `node kit/dashboard/server.mjs` im Vordergrund, Fehlermeldung einfach
   erklären, reparieren (Node fehlt: hilfe-Skill, JSON kaputt: `check.mjs --reparieren`).
4. Kein Interview nötig, außer etwas war kaputt.

Was die Person dort findet (für Fragen): Reiter Übersicht, Quellen, Kapitel, Plan, Hilfe.
Lesepanel rechts für PDF, Kapitel und Skills. „Zuletzt geändert“ mit markierten Absätzen,
Absatz direkt korrigieren oder „an Claude“ schicken, PDF-Textstelle als Zitat speichern,
„PDF aktualisieren“, Suche mit Strg/Cmd+K, Rückgängig für jede Aktion, Werkzeugkasten mit
allen Skills. Dashboard-Aktionen erreichen Claude als Journal vor dem nächsten Prompt.

## `anpassen <wunsch>`: Dashboard umbauen

| Änderung | Datei | Übersteht /update |
| --- | --- | --- |
| Aussehen (Farben, Abstände, ausblenden) | `arbeit/dashboard-anpassungen.css` | ja |
| Neues Verhalten, eigener Block, Knopf | `arbeit/dashboard-anpassungen.js` | ja |
| Fehler im Kit, Verbesserung für alle | `kit/dashboard/*` | nein |

Nur wenn es in den Anpassungsdateien nicht geht, an `kit/dashboard/*` arbeiten, einmal sagen,
dass `/update` das überschreiben kann, und die Änderung in `arbeit/dashboard-anpassungen.md`
notieren.

1. **Verstehen** (ein Interview, bis 4 Fragen): Was stört oder fehlt, welcher Reiter,
   2 bis 3 Varianten mit `preview`-Skizze. Verschlechtert der Wunsch den Überblick (Zahlenflut,
   versteckte Fristen): sagen und bessere Variante anbieten.
2. **Umsetzen.** CSS-Variablen stehen unter `:root` in `kit/dashboard/style.css`, auch für
   Dunkelmodus überschreiben. JS: `window.SW` laut `kit/dashboard/API.md` bzw. dem Kommentar
   oben in `kit/dashboard/app.js`. Keine externen Bibliotheken, keine CDNs (offline).
   Neue Daten in eine Datei unter `arbeit/`, nie im Browser speichern. Neue Schreibwege nur
   im Server mit `schreibeJson` aus `kit/werkzeuge/lib.mjs`.
3. **Prüfen.** Seite neu laden. Nach Änderungen an Server oder Werkzeugen
   `server.mjs --stoppen`, dann `--starten`. Mit Playwright hell und dunkel ansehen.
4. **Abschluss-Interview:** „Passt“, „Noch anpassen“, „Zurück zum alten Stand“.
5. Verrät der Wunsch etwas über die Arbeitsweise: Zeile unter „So arbeite ich“ in `arbeit/stil.md`.

## `skill <name>`: eigener Skill im Werkzeugkasten

Kommt meist vom Knopf „Neu“ oder „Ändern“ im Werkzeugkasten.
1. Per Interview klären: Was soll der Skill tun, wann soll Claude ihn nutzen, darf Claude ihn
   selbst starten oder nur per Slash?
2. Anlegen unter `.claude/skills/<name>/SKILL.md` (Kleinbuchstaben, Bindestriche):
   ```yaml
   ---
   name: <name>
   description: <ein Satz, was er tut>
   when_to_use: <wann Claude ihn nutzen soll>
   gruppe: eigene
   disable-model-invocation: true   # nur wenn ausschließlich per Slash
   ---
   ```
   Darunter oben die wichtigsten Regeln, dann die Schritte. Kurz halten.
3. Eigene Skills stehen nicht in `kit/manifest.json`, deshalb lässt `/update` sie in Ruhe.
   Kit-Skills nicht umschreiben, sondern einen eigenen daneben anlegen.
4. Hinweis: Neue Skills wirken nach einem Neustart von Claude.
