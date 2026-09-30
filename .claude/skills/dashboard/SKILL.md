---
name: dashboard
description: Dashboard starten und öffnen oder nach Wunsch umbauen. Aufruf /dashboard oder /dashboard anpassen <wunsch>.
argument-hint: "[anpassen <wunsch>]"
disable-model-invocation: true
---

# /dashboard

Das Dashboard ist die Übersicht der Person über ihre Arbeit: Phase, Fristen, Quellen, Kapitel,
Aufträge an Claude. Es ist eine **Ansicht**, keine Datenquelle. Die Wahrheit liegt in
`arbeit/*.json`, `quellen/kandidaten.json`, `quellen/literatur.bib` und den Kapiteldateien.

Argument: `$ARGUMENTS`

## Ohne Argument: starten und öffnen

1. Server sicherstellen (startet im Hintergrund, falls nötig, und gibt die Adresse aus):
   ```
   node kit/dashboard/server.mjs --starten
   ```
2. Der Person in einem Satz sagen, wie sie es in VS Code öffnet:
   Strg+Shift+P (Mac: Cmd+Shift+P), „Simple Browser: Show“ tippen, Adresse einfügen.
   Wer lieber den normalen Browser nimmt: `node kit/dashboard/server.mjs --starten --oeffnen`.
3. Scheitert der Start: `node kit/dashboard/server.mjs` im Vordergrund laufen lassen, um die
   Fehlermeldung zu sehen, in einfacher Sprache erklären, reparieren. Häufig: Node fehlt
   (`/hilfe`), oder eine JSON-Datei in `arbeit/` ist kaputt (mit `node -e` einlesen, Fehlerstelle
   zeigen, reparieren).
4. Abschluss per AskUserQuestion: Was als Nächstes? Optionen etwa „Nächster Schritt (/weiter)“,
   „Dashboard anpassen“, „Nichts, danke“.

## Mit `anpassen <wunsch>`: Dashboard umbauen

Ziel: Das Dashboard passt sich der Person an, ohne dass ein Update ihre Änderungen überschreibt.

### Wo Änderungen hingehören

| Art der Änderung | Datei | Übersteht /update |
| --- | --- | --- |
| Aussehen (Farben, Abstände, Schriftgröße, etwas ausblenden) | `arbeit/dashboard-anpassungen.css` | ja |
| Neues Verhalten, zusätzlicher Block, anderer Knopf | `arbeit/dashboard-anpassungen.js` | ja |
| Fehler im Kit, Verbesserung für alle | `kit/dashboard/*` | nein, wird bei /update ersetzt |

**Standard ist immer die Anpassungsdatei.** Nur wenn der Wunsch dort nicht umsetzbar ist, an
`kit/dashboard/*` arbeiten und der Person einmal sagen: „Das ändert eine Kit-Datei. Ein
/update kann das überschreiben. Ich notiere die Änderung in arbeit/dashboard-anpassungen.md,
damit sie danach wiederhergestellt werden kann.“ Dann genau das tun.

### Ablauf

1. **Verstehen per Interview** (AskUserQuestion, bis zu 4 Fragen in einem Aufruf). Frage nach:
   - Was genau stört oder fehlt? (Optionen aus dem Wunsch ableiten, Freitext bleibt offen)
   - Welcher Reiter? (Übersicht, Quellen, Kapitel, Plan, Hilfe, überall)
   - Wie soll es aussehen oder sich verhalten? Biete 2 bis 3 konkrete Varianten an, die
     empfohlene zuerst mit „(Empfohlen)“. Nutze `preview`, um Varianten als kleine
     ASCII-Skizze zu zeigen.
   - Challenge, freundlich: Wenn der Wunsch den Überblick verschlechtert (zu viele Zahlen,
     doppelte Information, versteckt Fristen), sag das und biete eine bessere Variante an.
2. **Umsetzen.**
   - CSS: Variablen stehen in `kit/dashboard/style.css` unter `:root` (z. B. `--akzent`,
     `--bg`). Überschreiben in `arbeit/dashboard-anpassungen.css`, auch für den Dunkelmodus
     (`@media (prefers-color-scheme: dark)`).
   - JS: In `arbeit/dashboard-anpassungen.js` steht `window.SW` bereit:
     `SW.stand()` (alle Daten), `SW.neuZeichnen()`, `SW.auftrag(cmd, text, sofort)`,
     `SW.baustein({ key, art, label, prompt })`, `SW.reiter(id)`, `SW.toast(text)`.
     Für eigene Blöcke nach jedem Zeichnen einhängen, z. B. mit einem `MutationObserver` auf
     `#inhalt`. Keine externen Bibliotheken, keine CDNs: das Dashboard muss offline laufen.
   - Neue Daten nie im Dashboard speichern, sondern in einer Datei unter `arbeit/` und über
     `kit/werkzeuge/stand.mjs` lesen. Neue Schreibwege nur über `kit/dashboard/server.mjs`
     mit atomarem Schreiben (`schreibeJson` aus `kit/werkzeuge/lib.mjs`).
3. **Prüfen.** Seite neu laden (der Server liefert CSS und JS der Anpassungen frisch aus,
   Änderungen an `kit/dashboard/app.js` und `style.css` auch). Bei Änderungen an
   `server.mjs` oder `kit/werkzeuge/*`: `node kit/dashboard/server.mjs --stoppen`, dann
   `--starten`. Wenn Playwright verfügbar ist, einen Screenshot hell und dunkel machen und
   selbst ansehen. `node kit/dashboard/server.mjs --statisch` schreibt die Kopie `dashboard.html` neu.
4. **Abschluss per AskUserQuestion:** „So gut?“ mit Optionen „Passt“, „Noch anpassen (was?)“,
   „Zurück zum alten Stand“. Beim Zurücksetzen die Anpassungsdatei leeren bzw. die Änderung
   rückgängig machen.
5. In `arbeit/stil.md` unter „So arbeite ich“ eine Zeile ergänzen, wenn der Wunsch etwas über
   die Arbeitsweise verrät (z. B. „will Fristen immer ganz oben sehen“).

## Regeln

- Rückfragen nur per AskUserQuestion.
- `dashboard.html` nie von Hand bearbeiten, sie wird generiert.
- Keine Datenfelder erfinden, die kein Skill befüllt. Wenn ein Wunsch neue Daten braucht,
  erst klären, wer sie pflegt.
