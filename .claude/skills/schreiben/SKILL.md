---
name: schreiben
description: Plant und schreibt ein Kapitel oder Unterkapitel (eine Kapiteldatei) oder verbessert einen Text der Person und legt ihn zur Freigabe vor.
when_to_use: „Schreib 2.1“, „mach 3.2 besser“, „kürze Kapitel 4“, eigener Text zum Überarbeiten. Nicht für Tippfehler oder eine reine Einschätzung (pruefen).
argument-hint: "[kapitelnummer, z. B. 2.1, oder datei]"
gruppe: arbeit
---

# /schreiben: Kapitel planen, schreiben, überarbeiten

**Wichtig:** `stil.schreibmodus` beachten (`ich-schreibe`: kein Fließtext). Nur Quellen aus
der bib, nie erfinden, fehlend `[BELEG FEHLT]`. Umfang in Seiten, ±10 %. Die Freigabe hier
setzt höchstens `entwurf`, `geprueft` und `final` gibt es nur über `/pruefen`. Zustand nur
über `zustand.mjs`. Kapiteltext liest nur der Subagent, nicht das Hauptgespräch.
Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Kontext laden

- `node .claude/kit/werkzeuge/zustand.mjs zeige` (Kapitel, Status, Seitenziel und -stand)
- `node .claude/kit/werkzeuge/zustand.mjs gliederung` (Einheiten mit Dateien und ihren Abschnitten)
- Vorbedingung: Phase Gliederung erledigt. Sonst per Interview auf `/weiter` verweisen oder
  bewusst vorgreifen lassen.

## Kapitel wählen

Eine Einheit ist eine Kapiteldatei, auf beliebiger Ebene (`1`, `3.2`). Nennt die Person einen
Abschnitt innerhalb einer Datei (`3.2.1`), gilt die Einheit, die ihn enthält; der Auftrag an
`kapitel-planer` und `autor` nennt dann den Abschnitt. Nennt sie ein Kapitel, das in
Unterdateien aufgeteilt ist (`4` mit `4.1`, `4.2`), gilt die erste offene Untereinheit;
Interview, falls mehrere sinnvoll sind.

Ohne Argument: erste Einheit mit Status `offen` oder `geplant` in empfohlener Reihenfolge
(`.claude/kit/ablauf/schreiben.md`). Interview „Welches Kapitel jetzt?“ header „Kapitel“:
„<nr> <Titel> (Empfohlen)“, „Ergebnisse zuerst“ (wenn Daten da sind), „Eigenen Text
überarbeiten“, „Ein anderes“.

## claude-schreibt (Standard)

1. **Planen:** Subagent `kapitel-planer` mit Nummer, Titel und Seitenziel. Plan in 5 bis 8
   Zeilen zeigen, Lücken nennen. Interview „Passt der Plan?“ header „Plan“: „Ja, schreiben
   (Empfohlen)“, „Anpassen“, „Erst Lücken schließen“ (recherche-Skill mit `<nr>` oder Daten
   klären). `node .claude/kit/werkzeuge/zustand.mjs kapitel <nr> geplant`
2. **Schreiben:** Subagent `autor`, Modus `neu`, mit Seitenziel. Methoden und Ergebnisse:
   Tagebuch, Daten, Abbildungen einbeziehen. Fehlende Abbildung aus Daten: anbieten, sie mit
   `uv run` zu erzeugen. Der Autor prüft selbst mit `stil.mjs` und meldet offene Funde.
3. `node .claude/kit/werkzeuge/zustand.mjs kapitel <nr> entwurf`

## gemeinsam

Die Person schreibt, Claude überarbeitet: Subagent `autor`, Modus `ueberarbeiten`. Danach je
geändertem Absatz eine Zeile Erklärung („Absatz 2: Satz geteilt, Beleg ergänzt“). Steht das
Kapitel noch auf `offen`: `zustand.mjs kapitel <nr> entwurf --erzwingen`.

## ich-schreibe

Kein Fließtext der Arbeit. Plan, Stichpunkte, Leitfragen je Absatz, konkretes Feedback auf
den Text der Person. `node .claude/kit/werkzeuge/stil.mjs <datei>` darf laufen, die Funde
erklärst du, die Sätze formuliert sie.

## Vorlegen

Endausgabe laut `AGENTS.md`: Satz mit Seiten Ist/Ziel, Stichpunkte mit offenen Stellen und der
stärksten Schwachstelle, `Geändert:` mit Link zur Kapiteldatei. Dann Interview „Wie findest du
<nr>?“ header „Entwurf“:
- „Passt so, später prüfen (Empfohlen)“: Status bleibt `entwurf`
- „Überarbeiten“ (Freitext): `autor` Modus `ueberarbeiten`, dann erneut vorlegen
- „Gemeinsam Absatz für Absatz“: je Absatz ein Interview (passt, ändern, streichen)
- „Gleich prüfen“: pruefen-Skill für `<nr>`

Der `autor` sichert vor jeder Überarbeitung eine Kopie nach `kapitel/.versionen/`. Rewind holt
vom `autor` geschriebene Dateien nicht zurück, die Kopie und `/sync` schon.

## Nach dem Schreiben

- Neue Begriffe (meldet der `autor`) in `.arbeit/begriffe.md`.
- `.arbeit/hilfsmittel.md`: Datum, „Textentwurf“ bzw. „Überarbeitung“, Kapitel.
- `.arbeit/tagebuch.md`: Entscheidungen.
- `node .claude/kit/werkzeuge/zustand.mjs verlauf "Kapitel <nr> <entworfen|überarbeitet>"`
- Alle Einheiten eines Hauptkapitels mindestens `entwurf`: `/pruefen <hauptkapitel>` empfehlen.
- Meldet der `autor`, dass eine Einheit deutlich über 15 Seiten wächst: per Interview vorschlagen,
  sie aufzuteilen (`node .claude/kit/werkzeuge/zustand.mjs aufteilen <nr> --probe` zeigen, dann ohne
  `--probe`). Nur vorschlagen, nie ungefragt aufteilen. Umgekehrt `zusammenfuehren <nr>`.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“: „Nächstes Kapitel <nr> (Empfohlen)“, „Dieses Kapitel prüfen“,
„Entwurfs-PDF ansehen“, „Pause und sichern“.
