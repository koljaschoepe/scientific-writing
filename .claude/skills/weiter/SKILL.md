---
name: weiter
description: Macht mit dem nächsten sinnvollen Schritt der Arbeit weiter, je nach aktueller Phase (Thema, Recherche, Exposé, Gliederung, Schreiben, Prüfen, Abgabe), und schließt mit einem Freigabe-Interview ab.
argument-hint: "[phase oder wunsch]"
disable-model-invocation: true
---

# /weiter: Der nächste Schritt

## Wann

Immer, wenn die Person nicht genau weiß, was als Nächstes kommt, oder einfach
weiterarbeiten will. Das ist der Hauptbefehl des Kits.

## Kontext laden

1. `arbeit/projekt.json`. Wenn `eingerichtet` false: `/start` ausführen und hier aufhören.
2. `arbeit/zustand.json` (aktive Phase, Kapitel, nächster Schritt), `arbeit/plan.json`
   (anstehende Termine und Frist).
3. `arbeit/stil.md` (Abschnitt „So arbeite ich“), `kit/leitfaeden/challenge.md`.
4. Das Vorgehen der aktiven Phase: `kit/ablauf/<phase>.md`. Nur diese Datei laden.

Phasen in Reihenfolge: einrichtung, thema, recherche, expose, gliederung, schreiben,
pruefen, abgabe. Ist ein Argument angegeben (`/weiter gliederung`), gilt diese Phase,
aber nur, wenn die vorherigen Meilensteine erledigt sind oder die Person nach Hinweis auf
die Lücke bewusst springt (Interview).

## Lage prüfen, bevor es losgeht

Nenne in höchstens drei Zeilen: Phase, letzter Stand (aus `verlauf`), Tage bis Abgabe.
Weise auf Dringendes hin und frage per Interview, ob es vorgeht:
- Betreuungstermin in den nächsten 3 Tagen: Vorbereitung anbieten (`kit/vorlagen/betreuung.md`).
- Letzter Sync länger als 2 Tage her: `/sync` anbieten.
- Neue Dateien in `quellen/eingang/` oder Entscheidungen im Board, die noch nicht
  verarbeitet sind (`status: genommen` und `ausgewertet: false`): `/quellen` anbieten.
- Hinter dem Zeitplan (Tagesziel über mehrere Tage verfehlt): ehrlich sagen und
  Plan anpassen anbieten.

## Ablauf

1. Den nächsten Schritt aus `kit/ablauf/<phase>.md` bestimmen (dort steht, woran man
   erkennt, was schon erledigt ist).
2. Zu Beginn in einem Satz sagen, was jetzt passiert und warum.
3. Den Schritt ausführen, mit Interviews an allen Entscheidungspunkten.
4. Ergebnisse in die in der Ablaufdatei genannten Dateien schreiben.
5. `arbeit/tagebuch.md` ergänzen (gemacht, entschieden, offen) und bei KI-Beitrag zur Arbeit
   `arbeit/hilfsmittel.md`.
6. Zustand aktualisieren:
   - `node kit/werkzeuge/zustand.mjs verlauf "<was erledigt wurde>"`
   - `naechster_schritt` in `arbeit/zustand.json` auf einen Satz setzen, den die Person im
     Dashboard versteht.
   - `node kit/werkzeuge/zustand.mjs pruefe-abzeichen`

## Freigabe eines Meilensteins

Wenn die Ablaufdatei sagt, dass die Phase fertig ist, Interview:
„<Meilenstein> ist fertig. Freigeben?“ header „Freigabe“
- „Freigeben und weiter zu <nächste Phase> (Empfohlen)“: `node kit/werkzeuge/zustand.mjs phase <nächste>`
- „Noch überarbeiten“: was genau (Freitext), dann Schleife
- „Mit Betreuung besprechen“: Punkt nach `arbeit/betreuung/offene-fragen.md`, Phase bleibt
- „Später“

Vor jeder Freigabe einmal challengen: die stärkste Schwachstelle nennen
(`kit/leitfaeden/challenge.md`). Ist nichts Wesentliches zu finden, das auch sagen.

## Abschluss-Interview

„Wie geht es weiter?“ header „Weiter“ mit dem nächsten Schritt laut Ablauf als
Empfehlung, einer Alternative, „Pause und sichern (/sync)“.
