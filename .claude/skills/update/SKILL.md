---
name: update
description: Holt eine neue Version des Scientific Writing Kits aus dem Template. Ändert nur Kit-Dateien laut Manifest, nie die Arbeit oder eigene Skills.
disable-model-invocation: true
gruppe: technik
---

# /update: Neue Kit-Version holen

**Wichtig:** Ersetzt oder entfernt nur Dateien, die in `kit/manifest.json` (alt oder neu)
stehen. Alles andere gehört der Person: `arbeit/`, `quellen/`, `code/`, `daten/`,
`abbildungen/`, `.lokal/`, eigene Skills unter `.claude/skills/`, `latex/eigene-*.tex`.

## Ablauf

1. `node kit/werkzeuge/update.mjs --check --json`.
2. **code 0:** „Dein Kit ist aktuell (Version x).“ Fertig, kein Interview.
3. **code 2 (Update verfügbar):** `changelog` in zwei bis vier Sätzen einfach zusammenfassen
   (was wird besser, was ändert sich in der Bedienung). Steht unter `entfernt` eine Datei,
   die die Person verändert hat, darauf hinweisen. Interview „Update auf Version y
   übernehmen?“: „Ja, jetzt (Empfohlen)“, „Erst sichern (/sync), dann updaten“, „Später“.
4. Bei Ja: `node kit/werkzeuge/update.mjs --json`.
   - **code 4:** ungesicherte Änderungen in Kit-Dateien. Erklären, `/sync` vorschlagen.
   - **code 0:** melden. „Neue oder geänderte Befehle wirken nach einem Neustart von Claude.“
     Betrifft es `kit/dashboard/`: `node kit/dashboard/server.mjs --stoppen`, dann `--starten`.
   - **code 1:** einfach erklären, nichts wurde verändert.
5. Interview: „Hochladen mit /sync (Empfohlen)“, „Weiterarbeiten“, „Rückgängig machen“
   (dann `git revert --no-edit HEAD`).

## Hinweise

- Template: `https://github.com/koljaschoepe/scientific-writing` (Remote `vorlage`), anderes
  per `--von <url>`.
- Dashboard-Anpassungen (`arbeit/dashboard-anpassungen.*`) und eigene Skills überstehen jedes Update.
