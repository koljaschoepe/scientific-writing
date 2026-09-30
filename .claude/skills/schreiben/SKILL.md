---
name: schreiben
description: Plant und schreibt ein Unterkapitel oder überarbeitet einen Text der Person, mit Freigabe.
when_to_use: Kapitel schreiben, fortsetzen, umschreiben, kürzen oder eigenen Text verbessern. Nicht für Tippfehler.
argument-hint: "[kapitelnummer, z. B. 2.1, oder datei]"
gruppe: arbeit
---

# /schreiben: Kapitel planen, schreiben, überarbeiten

**Wichtig:** Schreibmodus aus `arbeit/projekt.json → schreibmodus` beachten (`coach`: kein
Fließtext). Nur Quellen aus der bib, nie erfinden, fehlend `[BELEG FEHLT]`. Umfang ±10 %.
Freigabe setzt `geprueft`, `final` gibt es erst nach `/pruefen`. Zustand nur über
`zustand.mjs`. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Kontext laden

- `arbeit/projekt.json`, `arbeit/zustand.json` (Kapitel, Status, `woerter_ziel`),
  `arbeit/gliederung/gliederung.md`
- Vorbedingung: Meilenstein `gliederung` erledigt. Sonst per Interview auf `/weiter` verweisen
  oder bewusst vorgreifen lassen.

## Kapitel wählen

Ohne Argument: erstes Unterkapitel mit Status `offen` oder `geplant` in empfohlener Reihenfolge
(`kit/ablauf/schreiben.md`). Interview „Welches Kapitel jetzt?“ header „Kapitel“:
„<nr> <Titel> (Empfohlen)“, „Ergebnisse zuerst“ (wenn Daten da sind), „Eigenen Text
überarbeiten“, „Ein anderes“.

## claude-schreibt (Standard)

1. **Planen:** Subagent `kapitel-planer`. Plan in 5 bis 8 Zeilen zeigen, Lücken nennen.
   Interview „Passt der Plan?“ header „Plan“: „Ja, schreiben (Empfohlen)“, „Anpassen“,
   „Erst Lücken schließen“ (dann recherche-Skill mit `<nr>` oder Daten klären).
   `node kit/werkzeuge/zustand.mjs kapitel <nr> geplant`
2. **Schreiben:** Subagent `autor`, Modus `neu`. Methoden und Ergebnisse: Tagebuch, Daten,
   Abbildungen einbeziehen. Fehlende Abbildung aus Daten: anbieten, sie mit `uv run` zu erzeugen.
3. **Selbstkontrolle:** Umfang, `[BELEG FEHLT]`, harte Schwellen stichprobenartig.
4. `node kit/werkzeuge/zustand.mjs kapitel <nr> entwurf`

## gemeinsam

Die Person schreibt, Claude überarbeitet: Subagent `autor`, Modus `ueberarbeiten`. Danach je
geändertem Absatz eine Zeile Erklärung („Absatz 2: Satz geteilt, Beleg ergänzt“).

## coach

Kein Fließtext der Arbeit. Plan, Stichpunkte, Leitfragen je Absatz, konkretes Feedback auf
den Text der Person.

## Überarbeiten auf Wunsch

Formulierungen und Argumente der Person respektieren. Der `autor` sichert vorher eine Kopie
nach `arbeit/kapitel/.versionen/`. Hinweis: Rewind stellt vom `autor` geschriebene Dateien
nicht wieder her, die Kopie und `/sync` schon.

## Freigabe (nach jedem Kapitel)

Endausgabe laut `AGENTS.md`: Satz mit Wörtern Ist/Soll, Stichpunkte mit offenen Stellen und
der stärksten Schwachstelle, `Geändert:` mit Link zur Kapiteldatei. Dann Interview
„Wie findest du <nr>?“ header „Freigabe“:
- „Freigeben (Empfohlen)“: `node kit/werkzeuge/zustand.mjs kapitel <nr> geprueft`
- „Überarbeiten“ (Freitext): `autor` Modus `ueberarbeiten`, dann erneut Freigabe
- „Gemeinsam Absatz für Absatz“: je Absatz ein Interview (passt, ändern, streichen)
- „Später“: bleibt `entwurf`

Die Person kann auch im Dashboard (Kapitel lesen) Absätze direkt korrigieren oder „an Claude“
schicken. Das Journal meldet das vor ihrem nächsten Prompt.

## Nach dem Schreiben

- Neue Begriffe (meldet der `autor`) in `arbeit/begriffe.md`.
- `arbeit/hilfsmittel.md`: Datum, „Textentwurf“ bzw. „Überarbeitung“, Kapitel.
- `arbeit/tagebuch.md`: Entscheidungen.
- `node kit/werkzeuge/zustand.mjs verlauf "Kapitel <nr> <entwurf|überarbeitet|freigegeben>"`
- Alle Unterkapitel eines Hauptkapitels mindestens `entwurf`: `/pruefen <hauptkapitel>` empfehlen.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“: „Nächstes Kapitel <nr> (Empfohlen)“, „Dieses Kapitel prüfen“,
„Entwurfs-PDF ansehen“, „Pause und sichern“.
