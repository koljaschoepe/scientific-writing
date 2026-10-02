# Sonderfälle bei /sync

| code | Lage | Vorgehen |
| --- | --- | --- |
| 4 | kein Repo oder GitHub-Ziel | Interview „Privates GitHub-Repo anlegen?“ („Ja, privat (Empfohlen)“, „Später“). Bei Ja: `gh auth status`, Namen erfragen (Vorschlag aus `arbeit.typ`), `git init` falls nötig, `gh repo create <name> --private --source . --remote origin --push`, dann erneut |
| 5 | Anmeldung fehlt | „GitHub möchte, dass du dich einmal neu anmeldest.“ `gh auth login --web --git-protocol https`, Code steht in der Ausgabe, dann `gh auth setup-git`, erneut |
| 7 | Datei über 95 MB | Dateien nennen, je Datei Interview: „Aus der Sicherung ausnehmen (Empfohlen)“ (`.gitignore`), „Verkleinern“, „Außerhalb ablegen“. Erneut |
| 6 | altes Zusammenführen offen | wie Konflikt mit `--merge`, oder per Interview `--abbrechen` |
| 8 | Projekt liegt in einem fremden Git-Ordner | nichts angefasst. Erklären, beim Umzug in einen eigenen Ordner helfen |
| 9 | lokale Änderungen wären überschrieben | vorher gesichert, nichts verloren. `meldung` erklären, erneut |
| 1 | anderer Fehler | `meldung` und `hinweis` einfach erklären, hilfe-Skill anbieten |

## code 3: Konflikt

Beide Rechner haben dieselbe Datei geändert, nichts ist verloren.

1. `node .claude/kit/werkzeuge/sync.mjs --merge --json` liefert `dateien`.
2. Je Datei `git show :2:<datei>` (deine Fassung) und `git show :3:<datei>` (GitHub) lesen,
   den Unterschied inhaltlich zusammenfassen, nicht als Diff.
3. Ohne Rückfrage lösen:
   - JSON (`.arbeit/zustand.json`, `.arbeit/kandidaten.json`) feldweise, Listen nach `id` bzw.
     `nr` vereinigen, bei gleichem Eintrag gewinnt das spätere Datum (`entschieden`, `datum`).
   - `.arbeit/plan.md`: Zeilen beider Fassungen vereinigen, Dubletten entfernen, nach Datum sortieren.
   - `.arbeit/einstellungen.md`: verschiedene Zeilen geändert, beide übernehmen.
   - nur Leerzeichen oder Datum verschieden.
4. Sonst Interview (bis 4 Dateien je Aufruf): „<datei>: welche Fassung gilt?“, „Beide
   zusammenführen (Empfohlen)“ mit Beschreibung, „Meine Fassung“, „Fassung auf GitHub“. Bei
   Kapiteln fast immer zusammenführen. Derselbe Einstellungswert verschieden: fragen.
5. Gewählte Fassung schreiben, ohne `<<<<<<<`-Marken.
6. `node .claude/kit/werkzeuge/sync.mjs --abschliessen --json`. code 3: zurück zu 2.

Abbrechen: `node .claude/kit/werkzeuge/sync.mjs --abbrechen`, alles wie vorher.
