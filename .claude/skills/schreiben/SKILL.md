---
name: schreiben
description: Plant und schreibt ein Unterkapitel oder überarbeitet einen Text der Person, danach Freigabe per Interview.
argument-hint: "[kapitelnummer, z. B. 2.1]"
disable-model-invocation: true
---

# /schreiben: Kapitel planen, schreiben, überarbeiten

## Wann

- In der Phase Schreiben (über `/weiter`) oder gezielt: `/schreiben 3.2`.
- Wenn die Person selbst etwas geschrieben hat und es gemeinsam verbessern will.
- Auch für Exposé-Abschnitte, Abstract und Zusammenfassung (dann Datei statt Kapitelnummer nennen).

## Kontext laden

- `arbeit/projekt.json` (`schreibmodus`, Sprache, Fachprofil), `arbeit/zustand.json` (Kapitel,
  Status, Budget), `arbeit/gliederung/gliederung.md`, `arbeit/begriffe.md`, `arbeit/stil.md`
- Vorbedingung: Gliederung freigegeben (Meilenstein `gliederung` erledigt). Sonst per Interview
  auf `/weiter` verweisen oder bewusst vorgreifen lassen.

## Kapitel wählen

Ohne Argument: das erste Unterkapitel mit Status `offen` oder `geplant` in Gliederungsreihenfolge.
Per Interview bestätigen, dabei Alternativen anbieten:
„Welches Kapitel jetzt?“ header „Kapitel“
- „<nr> <Titel> (Empfohlen)“: nächstes in der Reihenfolge
- „Ergebnisse zuerst“: in der Naturwissenschaft oft sinnvoll, wenn Daten schon da sind
- „Einen eigenen Text überarbeiten“
- „Ein anderes“ (Freitext)

## Ablauf nach Schreibmodus

### claude-schreibt (Standard)

1. **Planen:** Subagent `kapitel-planer` für das Kapitel. Den Plan in 5 bis 8 Zeilen zeigen
   (Absätze, Belege, Abbildungen, Budget) und Lücken nennen.
   Interview „Passt der Plan?“ header „Plan“: „Ja, schreiben (Empfohlen)“, „Anpassen“
   (Freitext), „Erst Lücken schließen“ (dann `/recherche <nr>` oder Daten klären).
   Status: `node kit/werkzeuge/zustand.mjs kapitel <nr> geplant`.
2. **Schreiben:** Subagent `autor`, Modus `neu`. Methoden- und Ergebniskapitel: Tagebuch,
   Daten, Abbildungen einbeziehen. Fehlt eine Abbildung, die per Skript entstehen kann,
   anbieten, sie mit `uv run` in `code/` zu erzeugen (Regel `code.md`).
3. **Selbstkontrolle** vor dem Zeigen: Budget, `[BELEG FEHLT]`, harte Schwellen stichprobenartig.
4. Status `entwurf`.

### gemeinsam

Die Person schreibt, Claude überarbeitet. Datei der Person lesen (oder Text aus dem Chat
übernehmen und an der richtigen Stelle speichern). Subagent `autor` im Modus `ueberarbeiten`.
Änderungen danach absatzweise in Klartext erklären („Absatz 2: Satz geteilt, Beleg ergänzt,
‚Methode‘ statt ‚Verfahren‘ laut Begriffsliste“).

### coach

Claude schreibt keinen Fließtext der Arbeit. Stattdessen: Plan, Stichpunkte, Leitfragen je
Absatz, Feedback auf den Text der Person mit konkreten Verbesserungsvorschlägen, die sie
selbst umsetzt.

## Überarbeiten auf Wunsch

Auch im Modus `claude-schreibt` kann die Person eigene Absätze einfügen oder Texte ändern.
Beim Überarbeiten ihre Formulierungen und Argumente respektieren. Vorher Version sichern
(Agent `autor` macht das).

## Freigabe (Pflicht nach jedem Kapitel)

Kurze Zusammenfassung: Wörter Ist/Soll, Belege, offene Stellen, die eine kritische Anmerkung
(stärkste Schwachstelle). Dann Interview:
„Wie findest du <nr>?“ header „Freigabe“
- „Freigeben (Empfohlen)“: `node kit/werkzeuge/zustand.mjs kapitel <nr> final` – oder
  `geprueft`, wenn `/pruefen` für das Kapitel schon lief
- „Überarbeiten“: was genau (Freitext) → Autor im Modus ueberarbeiten, dann erneut Freigabe
- „Gemeinsam Absatz für Absatz“: je Absatz ein Interview (passt, ändern, streichen)
- „Später“: bleibt `entwurf`

Hinweis: Freigabe ist auch im Dashboard (Reiter Kapitel) möglich.

## Nach dem Schreiben

- `arbeit/begriffe.md` um neue Begriffe ergänzen (Agent meldet sie).
- `arbeit/hilfsmittel.md`: Zeile mit Datum, „Textentwurf“ bzw. „Überarbeitung“, Kapitel.
- `arbeit/tagebuch.md`: Kapitel, Entscheidungen.
- `node kit/werkzeuge/zustand.mjs verlauf "Kapitel <nr> <entwurf|überarbeitet|freigegeben>"`
- `node kit/werkzeuge/zustand.mjs pruefe-abzeichen`
- Wenn in diesem Hauptkapitel alle Unterkapitel mindestens `entwurf` sind: `/pruefen <hauptkapitel>`
  als nächsten Schritt empfehlen.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“
- „Nächstes Kapitel <nr> (Empfohlen)“
- „Dieses Kapitel prüfen (/pruefen <nr>)“
- „Entwurfs-PDF ansehen (/pdf entwurf)“
- „Pause und sichern“
