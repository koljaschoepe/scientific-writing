---
name: sync
description: Sichert die Arbeit und gleicht sie mit GitHub ab (lokal sichern, neuesten Stand holen, hochladen). Nur manuell über /sync.
disable-model-invocation: true
---

# /sync: Sichern und mit GitHub abgleichen

Wann brauchst du das? Wenn die Person ihre Arbeit sichern oder den Stand von einem anderen
Rechner holen will. Es gibt keinen automatischen Sync, deshalb ist dieser Befehl ihr Backup.

## Grundregeln

- Nie `git push --force`, nie `git reset --hard`, nie eine Fassung stillschweigend verwerfen.
- Alle Git-Schritte laufen über `node kit/werkzeuge/sync.mjs`. Keine eigenen Git-Befehle,
  außer zum Anzeigen von Dateifassungen (`git show`) beim Konflikt.
- Die Person sieht keine Git-Begriffe. Sprich von „sichern“, „holen“, „hochladen“,
  „deine Fassung“, „Fassung auf GitHub“.
- Jede Entscheidung über das Interview-Tool (AskUserQuestion), nie als Fließtext-Frage.

## Ablauf

1. `node kit/werkzeuge/sync.mjs --json` ausführen und das Feld `code` auswerten.

2. **code 0 (synchron):** In einem Satz melden, was passiert ist (die `meldung`). Dann weiter
   mit Schritt 5.

3. **Sonderfälle:**

   | code | Lage | Vorgehen |
   | --- | --- | --- |
   | 4 | kein Repo oder kein GitHub-Ziel | Interview: „Soll ich ein privates GitHub-Repo für deine Arbeit anlegen?“ Optionen: „Ja, privat (Empfohlen)“, „Später“. Bei Ja: `gh auth status` prüfen (bei Fehler Schritt Anmeldung), Namen per Interview erfragen (Vorschlag aus `arbeit/projekt.json → arbeit.typ`, etwa `diplomarbeit`), dann `git init` falls nötig und `gh repo create <name> --private --source . --remote origin --push`. Danach `sync.mjs` erneut |
   | 5 | Anmeldung fehlt | Erklären: „GitHub möchte, dass du dich einmal neu anmeldest.“ Dann `gh auth login --web --git-protocol https` starten, der Code erscheint in der Ausgabe, die Person gibt ihn im Browser ein. Danach `gh auth setup-git` und `sync.mjs` erneut |
   | 7 | Datei über 95 MB | Dateien nennen. Interview je Datei: „Aus der Sicherung ausnehmen (Empfohlen)“ (Eintrag in `.gitignore`), „Verkleinern“ (bei PDFs mit Bildern: Hinweis auf Komprimierung), „Außerhalb des Projekts ablegen“. Danach erneut |
   | 6 | altes Zusammenführen offen | wie Konflikt, mit `--merge` weitermachen, oder per Interview `--abbrechen` |
   | 1 | anderer Fehler | `meldung` und `hinweis` in einfachen Worten erklären, mit `/hilfe` weitermachen anbieten |

4. **code 3 (Konflikt):** Beide Rechner haben dieselbe Datei geändert. Nichts ist verloren.
   1. `node kit/werkzeuge/sync.mjs --merge --json` ausführen. Es liefert `dateien`.
   2. Je Datei beide Fassungen lesen: deine Fassung `git show :2:<datei>`, Fassung auf GitHub
      `git show :3:<datei>`. Den Unterschied inhaltlich zusammenfassen (welche Absätze, welche
      Einträge), nicht als Diff zeigen.
   3. Eindeutige Fälle ohne Rückfrage lösen und kurz nennen:
      - JSON-Zustandsdateien (`arbeit/zustand.json`, `arbeit/plan.json`, `quellen/kandidaten.json`):
        feldweise zusammenführen. Listen vereinigen (nach `id` bzw. `nr`), bei gleichem Eintrag
        gewinnt der mit dem späteren Datum (`entschieden`, `datum`), Aktivitätstage addieren
        nicht, sondern das Maximum je Tag nehmen.
      - Nur eine Seite hat inhaltlich etwas geändert, die andere nur Leerzeichen oder Datum.
   4. Alle anderen Dateien per Interview entscheiden (bis zu 4 Dateien pro Aufruf):
      Frage „<datei>: welche Fassung gilt?“, Optionen „Beide zusammenführen (Empfohlen)“ mit
      Beschreibung, was du kombinieren würdest, „Meine Fassung“, „Fassung auf GitHub“.
      Bei Kapiteltexten ist Zusammenführen fast immer richtig: Absätze beider Seiten behalten,
      Doppeltes entfernen.
   5. Die gewählte Fassung in die Datei schreiben (ohne `<<<<<<<`-Markierungen).
   6. `node kit/werkzeuge/sync.mjs --abschliessen --json`. Bei code 3 bleibt noch etwas offen,
      zurück zu Schritt 2. Bei code 0 melden.
   Möchte die Person abbrechen: `node kit/werkzeuge/sync.mjs --abbrechen`, alles ist wie vorher,
   die lokale Sicherung bleibt erhalten.

5. **Abschluss-Interview:** Eine Frage „Wie geht es weiter?“ mit den Optionen „Weiterarbeiten
   mit /weiter (Empfohlen)“, „Dashboard öffnen“, „Fertig für heute“. Bei „Fertig für heute“ in
   einem Satz den Stand nennen (nächster Schritt aus `arbeit/zustand.json`).

## Ausgabe

Kurz, ohne Git-Jargon, zum Beispiel:

> Gesichert und hochgeladen. Neu dabei: Kapitel 2.1 und drei Quellen. Auf GitHub ist jetzt
> alles vom 30.09. 14:20.
