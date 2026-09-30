---
name: sync
description: Sichert die Arbeit und gleicht sie mit GitHub ab (lokal sichern, neuesten Stand holen, hochladen). Nur manuell über /sync.
disable-model-invocation: true
gruppe: technik
---

# /sync: Sichern und mit GitHub abgleichen

**Wichtig:** Nur manuell, direkt auf `main`, keine Branches. Nie `git push --force`, nie
`git reset --hard`, nie eine Fassung stillschweigend verwerfen. Alle Git-Schritte über
`node kit/werkzeuge/sync.mjs`, eigene Git-Befehle nur zum Anzeigen (`git show`). Keine
Git-Begriffe gegenüber der Person: „sichern“, „holen“, „hochladen“, „deine Fassung“,
„Fassung auf GitHub“.

## Ablauf

1. `node kit/werkzeuge/sync.mjs --json`, Feld `code` auswerten.
2. **code 0:** ein Satz aus `meldung`, fertig. Kein Interview.
3. **Sonderfälle:**

   | code | Lage | Vorgehen |
   | --- | --- | --- |
   | 4 | kein Repo oder GitHub-Ziel | Interview „Privates GitHub-Repo anlegen?“ („Ja, privat (Empfohlen)“, „Später“). Bei Ja: `gh auth status`, Namen erfragen (Vorschlag aus `arbeit.typ`), `git init` falls nötig, `gh repo create <name> --private --source . --remote origin --push`, dann erneut |
   | 5 | Anmeldung fehlt | „GitHub möchte, dass du dich einmal neu anmeldest.“ `gh auth login --web --git-protocol https`, Code steht in der Ausgabe, dann `gh auth setup-git`, erneut |
   | 7 | Datei über 95 MB | Dateien nennen, je Datei Interview: „Aus der Sicherung ausnehmen (Empfohlen)“ (`.gitignore`), „Verkleinern“, „Außerhalb ablegen“. Erneut |
   | 6 | altes Zusammenführen offen | wie Konflikt mit `--merge`, oder per Interview `--abbrechen` |
   | 8 | Projekt liegt in einem fremden Git-Ordner | nichts angefasst. Erklären, beim Umzug in einen eigenen Ordner helfen |
   | 9 | lokale Änderungen wären überschrieben | vorher gesichert, nichts verloren. `meldung` erklären, erneut |
   | 1 | anderer Fehler | `meldung` und `hinweis` einfach erklären, hilfe-Skill anbieten |

4. **code 3 (Konflikt):** Beide Rechner haben dieselbe Datei geändert, nichts ist verloren.
   1. `node kit/werkzeuge/sync.mjs --merge --json` liefert `dateien`.
   2. Je Datei `git show :2:<datei>` (deine Fassung) und `git show :3:<datei>` (GitHub) lesen,
      Unterschied inhaltlich zusammenfassen, nicht als Diff.
   3. Ohne Rückfrage lösen: JSON-Dateien (`arbeit/zustand.json`, `arbeit/plan.json`,
      `quellen/kandidaten.json`) feldweise, Listen nach `id` bzw. `nr` vereinigen, bei gleichem
      Eintrag gewinnt das spätere Datum (`entschieden`, `datum`). Nur Leerzeichen oder Datum
      verschieden.
   4. Sonst Interview (bis 4 Dateien je Aufruf): „<datei>: welche Fassung gilt?“, „Beide
      zusammenführen (Empfohlen)“ mit Beschreibung, „Meine Fassung“, „Fassung auf GitHub“.
      Bei Kapiteln fast immer zusammenführen.
   5. Gewählte Fassung schreiben, ohne `<<<<<<<`-Marken.
   6. `node kit/werkzeuge/sync.mjs --abschliessen --json`. code 3: zurück zu 2.
   Abbrechen: `node kit/werkzeuge/sync.mjs --abbrechen`, alles wie vorher.

## Ausgabe

Ein bis zwei Sätze ohne Git-Jargon, z. B. „Gesichert und hochgeladen. Neu dabei: Kapitel 2.1
und drei Quellen.“ Interview nur nach Konflikt oder Sonderfall: „Weiterarbeiten (Empfohlen)“,
„Fertig für heute“.
