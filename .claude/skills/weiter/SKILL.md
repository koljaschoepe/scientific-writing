---
name: weiter
description: Führt durch den nächsten Schritt der Arbeit, von Thema bis Abgabe, mit Freigabe am Ende. Richtet beim ersten Mal das Projekt ein.
when_to_use: „weiter“, „mach weiter“, „was jetzt?“, „wo stehe ich?“, Start ohne konkreten Auftrag. Nicht bei Technikproblemen (hilfe) oder einem genannten Kapitel (schreiben).
argument-hint: "[phase oder wunsch]"
gruppe: arbeit
---

# /weiter: Der nächste Schritt

**Wichtig:** Nur die Ablaufdatei der aktiven Phase laden. Zustand nur über
`node .claude/kit/werkzeuge/zustand.mjs`. Rückfragen nur per Rückfrage-Tool. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Kontext laden

1. Nicht eingerichtet (meldet der Start-Hook, sonst `eingerichtet: nein` oder leerer
   `arbeit.titel` in `.arbeit/einstellungen.md`):
   `.claude/skills/start/SKILL.md` lesen und befolgen, hier aufhören.
2. `node .claude/kit/werkzeuge/zustand.mjs zeige` (Phase, Kapitel, Seiten), `.arbeit/plan.md`
   (Meilensteine, Termine).
3. `.claude/kit/ablauf/<phase>.md`. Nur diese Datei.
4. Ab der Phase Gliederung: `node .claude/kit/werkzeuge/zustand.mjs gliederung` (Einheiten mit Dateien,
   Status und Abschnitten). Die Gliederung steht in den Kapiteldateien, nicht in einer eigenen Datei.

Phasen: einrichtung, thema, recherche, expose, gliederung, schreiben, pruefen, abgabe. Ein
Argument (`/weiter gliederung`) gilt nur, wenn die vorigen Phasen erledigt sind oder die
Person nach Hinweis auf die Lücke bewusst springt (Interview).

## Dringendes zuerst

Höchstens drei Zeilen Lage (Phase, letzter Stand, Tage bis Abgabe). Dann per Interview
anbieten, falls zutreffend:
- Betreuungstermin in höchstens 3 Tagen: Vorbereitung (`.claude/kit/vorlagen/betreuung.md`).
- Meilenstein überfällig: ehrlich sagen, neue Daten in `.arbeit/plan.md` vorschlagen.
- Letzter Sync über 2 Tage (meldet der Start-Hook): `/sync`.
- Unverarbeitete Quellen (`node .claude/kit/werkzeuge/kandidaten.mjs neu`) oder Dateien in
  `quellen/eingang/`: quellen-Skill.

Nichts davon: direkt loslegen, ohne Interview.

## Ablauf

1. Nächsten Schritt aus der Ablaufdatei bestimmen (Tabelle „erledigt, wenn“).
2. In einem Satz sagen, was jetzt passiert und warum.
3. Schritt ausführen, Interviews an den Entscheidungspunkten.
4. Ergebnisse in die Dateien laut Ablaufdatei, `.arbeit/tagebuch.md` ergänzen, bei KI-Beitrag
   `.arbeit/hilfsmittel.md`.
5. Zustand:
   ```
   node .claude/kit/werkzeuge/zustand.mjs verlauf "<was erledigt wurde>"
   node .claude/kit/werkzeuge/zustand.mjs naechster "<ein Satz, den die Person im Dashboard versteht>"
   ```

## Freigabe einer Phase

Vorher einmal challengen: die stärkste Schwachstelle in einem Satz
(`.claude/kit/leitfaeden/challenge.md`). Ist nichts Wesentliches zu finden, das sagen.
Interview „<Phase> ist fertig. Freigeben?“ header „Freigabe“:
- „Freigeben und weiter zu <nächste Phase> (Empfohlen)“: `zustand.mjs phase <nächste>`
- „Noch überarbeiten“ (Freitext), dann Schleife
- „Mit Betreuung besprechen“: Punkt nach `.arbeit/betreuung/offene-fragen.md`, Phase bleibt
- „Später“

## Abschluss

Endausgabe laut `AGENTS.md`, dann Interview „Wie geht es weiter?“ header „Weiter“: nächster
Schritt laut Ablauf (Empfohlen), eine Alternative, „Pause und sichern (/sync)“.
