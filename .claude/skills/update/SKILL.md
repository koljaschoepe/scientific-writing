---
name: update
description: Holt eine neue Version des Scientific Writing Kits aus dem Template. Ändert nur Kit-Dateien, nie die Arbeit selbst.
disable-model-invocation: true
---

# /update: Neue Kit-Version holen

Wann brauchst du das? Wenn es im öffentlichen Template neue Funktionen oder Fehlerbehebungen
gibt. Die Arbeit der Person (`arbeit/`, `quellen/`, `code/`, `daten/`, `abbildungen/`,
`latex/kapitel/`) wird nie angefasst. Übernommen wird nur die Herstellerzone (siehe
`kit/SPEC.md`, Abschnitt Eigentumszonen).

## Ablauf

1. `node kit/werkzeuge/update.mjs --check --json` ausführen.
2. **code 0:** „Dein Kit ist aktuell (Version x).“ Dann Abschluss-Interview.
3. **code 2 (Update verfügbar):**
   - Den `changelog` in zwei bis fünf Sätzen in einfacher Sprache zusammenfassen: was wird
     besser, was ändert sich für sie in der Bedienung.
   - Unter `entfernt` stehen Kit-Dateien, die das Template nicht mehr hat. Liegt dort eine
     Datei, die die Person oder Claude selbst angelegt hat (zum Beispiel ein eigener Skill
     unter `.claude/skills/`), ausdrücklich darauf hinweisen und vor dem Update nach
     `arbeit/eigene/` kopieren.
   - Interview: „Update auf Version y übernehmen?“ Optionen: „Ja, jetzt (Empfohlen)“,
     „Erst sichern (/sync), dann updaten“, „Später“.
4. Bei Ja: `node kit/werkzeuge/update.mjs --json`.
   - **code 4:** Es gibt ungesicherte Änderungen in Kit-Dateien. Erklären, dann `/sync`
     vorschlagen und danach erneut.
   - **code 0:** Melden, was neu ist. Hinweis: „Neue oder geänderte Befehle wirken nach einem
     Neustart von Claude (Fenster schließen und neu öffnen).“ Wenn `kit/dashboard/` betroffen
     ist: Das Dashboard neu starten (`/dashboard`).
   - **code 1:** Fehler einfach erklären, nichts wurde verändert.
5. Abschluss-Interview: „Hochladen mit /sync (Empfohlen)“, „Weiterarbeiten mit /weiter“,
   „Rückgängig machen“ (dann `git revert --no-edit HEAD` und melden).

## Hinweise

- Das Template ist `https://github.com/koljaschoepe/scientific-writing` (Remote `vorlage`,
  legt das Werkzeug selbst an). Ein anderes Template: `--von <url>`.
- Anpassungen am Dashboard, die mit `/dashboard anpassen` entstanden sind, liegen in
  `arbeit/` und überstehen jedes Update.
