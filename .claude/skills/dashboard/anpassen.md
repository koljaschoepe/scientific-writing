# Dashboard umbauen (`/dashboard anpassen <wunsch>`)

**Kontext sparen:** `.claude/kit/dashboard/app.js` und `style.css` nie ganz lesen (zusammen
über 150 KB). Stellen per Grep finden (Funktionsname, CSS-Klasse, Variable) und nur die
Umgebung mit `offset`/`limit` lesen. Datenfelder stehen in `.claude/kit/dashboard/API.md`,
auch dort nur den passenden Abschnitt.

| Änderung | Datei | Übersteht /update |
| --- | --- | --- |
| Aussehen (Farben, Abstände, ausblenden) | `.arbeit/dashboard-anpassungen.css` | ja |
| Neues Verhalten, eigener Block, Knopf | `.arbeit/dashboard-anpassungen.js` | ja |
| Fehler im Kit, Verbesserung für alle | `.claude/kit/dashboard/*` | nein |

Nur wenn es in den Anpassungsdateien nicht geht, an `.claude/kit/dashboard/*` arbeiten, einmal
sagen, dass `/update` das überschreiben kann, und die Änderung in
`.arbeit/dashboard-anpassungen.md` notieren.

1. **Verstehen** (ein Interview, bis 4 Fragen): Was stört oder fehlt, welcher Reiter. Bei
   größeren Umbauten 2 bis 3 Varianten mit `preview`-Skizze, bei Farben oder Abständen nicht.
   Verschlechtert der Wunsch den Überblick (Zahlenflut, versteckte Fristen): sagen und eine
   bessere Variante anbieten.
2. **Umsetzen.** CSS-Variablen stehen unter `:root` in `style.css` (Grep nach `:root`), auch
   für den Dunkelmodus überschreiben. JS: `window.SW` laut API.md. Keine externen Bibliotheken,
   keine CDNs (offline). Neue Daten in eine Datei unter `.arbeit/`, nie im Browser speichern.
   Neue Schreibwege nur im Server mit `schreibeJson` aus `.claude/kit/werkzeuge/lib.mjs`.
3. **Prüfen.** Seite neu laden. Nach Änderungen an Server oder Werkzeugen `server.mjs
   --stoppen`, dann `--starten`. Nur bei Layout-Umbauten mit Playwright hell und dunkel ansehen.
4. **Abschluss-Interview:** „Passt“, „Noch anpassen“, „Zurück zum alten Stand“.
5. Verrät der Wunsch etwas über die Arbeitsweise: Zeile unter „So arbeite ich“ in `.arbeit/stil.md`.
