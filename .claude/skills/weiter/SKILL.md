---
name: weiter
description: Macht mit dem nächsten sinnvollen Schritt der Arbeit weiter, je nach aktueller Phase (Thema, Recherche, Exposé, Gliederung, Schreiben, Prüfen, Abgabe), und schließt mit einem Freigabe-Interview ab.
argument-hint: "[phase oder wunsch]"
disable-model-invocation: true
gruppe: arbeit
---

# /weiter: Der nächste Schritt

**Wichtig:** Nur die Ablaufdatei der aktiven Phase laden. Zustand nur über
`node kit/werkzeuge/zustand.mjs`. Rückfragen nur per Rückfrage-Tool. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Kontext laden

1. `arbeit/projekt.json`. `eingerichtet: false`: `.claude/skills/start/SKILL.md` lesen und
   befolgen, hier aufhören.
2. `arbeit/zustand.json` (Phase, Kapitel, Verlauf), `arbeit/plan.json` (Termine, Frist).
3. `kit/ablauf/<phase>.md`. Nur diese Datei.

Phasen: einrichtung, thema, recherche, expose, gliederung, schreiben, pruefen, abgabe. Ein
Argument (`/weiter gliederung`) gilt nur, wenn die vorigen Meilensteine erledigt sind oder
die Person nach Hinweis auf die Lücke bewusst springt (Interview).

## Dringendes zuerst

Höchstens drei Zeilen Lage (Phase, letzter Stand, Tage bis Abgabe). Dann per Interview
anbieten, falls zutreffend:
- Betreuungstermin in 3 Tagen: Vorbereitung (`kit/vorlagen/betreuung.md`).
- Letzter Sync über 2 Tage: `/sync`.
- Unverarbeitete Quellen (`node kit/werkzeuge/kandidaten.mjs neu`) oder Dateien in
  `quellen/eingang/`: `/quellen`.
- Tagesziel mehrere Tage verfehlt: ehrlich sagen, Plan anpassen anbieten.

Nichts davon: direkt loslegen, ohne Interview.

## Ablauf

1. Nächsten Schritt aus der Ablaufdatei bestimmen (Tabelle „erledigt, wenn“).
2. In einem Satz sagen, was jetzt passiert und warum.
3. Schritt ausführen, Interviews an den Entscheidungspunkten.
4. Ergebnisse in die Dateien laut Ablaufdatei, `arbeit/tagebuch.md` ergänzen, bei KI-Beitrag
   `arbeit/hilfsmittel.md`.
5. Zustand:
   ```
   node kit/werkzeuge/zustand.mjs verlauf "<was erledigt wurde>"
   node kit/werkzeuge/zustand.mjs naechster "<ein Satz, den die Person im Dashboard versteht>"
   ```

## Freigabe eines Meilensteins

Vorher einmal challengen: die stärkste Schwachstelle in einem Satz
(`kit/leitfaeden/challenge.md`). Ist nichts Wesentliches zu finden, das sagen.
Interview „<Meilenstein> ist fertig. Freigeben?“ header „Freigabe“:
- „Freigeben und weiter zu <nächste Phase> (Empfohlen)“: `node kit/werkzeuge/zustand.mjs phase <nächste>`
- „Noch überarbeiten“ (Freitext), dann Schleife
- „Mit Betreuung besprechen“: Punkt nach `arbeit/betreuung/offene-fragen.md`, Phase bleibt
- „Später“

## Abschluss

Endausgabe laut `AGENTS.md`, dann Interview „Wie geht es weiter?“ header „Weiter“: nächster
Schritt laut Ablauf (Empfohlen), eine Alternative, „Pause und sichern (/sync)“.
