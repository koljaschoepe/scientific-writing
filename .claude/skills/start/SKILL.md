---
name: start
description: Richtet das Projekt per Interview ein (Arbeit, Person, Zeit und Umfang, KI-Regeln, Format, Werkzeuge) und legt Meilensteine an, später auch zum Ändern der Einstellungen.
argument-hint: "[bereich, z. B. fristen]"
disable-model-invocation: true
gruppe: arbeit
---

# /start: Projekt einrichten

**Wichtig:** Jede Frage über das Rückfrage-Tool, bis zu 4 Fragen je Runde. „Später klären“
bleibt als leerer Wert stehen. Relative Daten in echte Daten umrechnen (heutiges Datum aus dem
Kontext). Nie Passwörter tippen. Werte nur in `.arbeit/einstellungen.md`: einzelne mit
`zustand.mjs einstellung <abschnitt.schluessel> <wert>`, bei der Ersteinrichtung die Datei in einem
Zug bearbeiten (nur hinter den Doppelpunkten, Kommentare bleiben). Zustand nur über
`zustand.mjs`. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## Kontext laden

1. `node .claude/kit/werkzeuge/zustand.mjs init` (legt fehlende Dateien aus den Vorlagen an).
2. `.arbeit/einstellungen.md` und `.arbeit/plan.md` lesen.
3. `.claude/kit/leitfaeden/interview.md` beachten.

Die Runden stehen in eigenen Dateien. Lies immer nur die Runde, die gerade dran ist:

| Runde | Datei | Inhalt |
| --- | --- | --- |
| 1 | `runden/1-arbeit.md` | Arbeitstyp, Fach, Sprache, Methodik |
| 2 | `runden/2-person.md` | Name, Hochschule, Institut, E-Mail |
| 3 | `runden/3-zeit.md` | Beginn, Abgabe, Betreuung, Termine, Seitenbereich |
| 4 | `runden/4-thema.md` | Thema, KI-Regeln, Schreibmodus |
| 5 | `runden/5-format.md` | Zitierstil, Vorlage, Verzeichnisse, Logo |
| 6 | `runden/6-werkzeuge.md` | Code, Zotero, Bibliothek, Reparatur |

## Schon eingerichtet

`- eingerichtet: ja` und kein Argument: Interview „Was möchtest du ändern?“ (header „Ändern“,
multiSelect): „Umfang, Fristen, Termine“ (Runde 3), „Arbeit, Thema, KI-Regeln“ (1 und 4),
„Format und Zitierstil“ (5), „Werkzeuge und Systemcheck“ (6). In der Beschreibung erwähnen:
Alles andere ändert sie direkt in `.arbeit/einstellungen.md` (Klick im Dashboard) oder sagt
es einfach. Ein Argument (`/start fristen`) springt direkt zur passenden Runde. Danach
speichern wie unten, nur die geänderten Werte.

## Ersteinrichtung

**Begrüßung** (einziger Text ohne Interview): „Hallo! Ich begleite dich durch die ganze
Arbeit, von der Themenfindung bis zum PDF. Ich stelle dir jetzt ein paar Fragen, meistens zum
Anklicken. Das dauert etwa 10 Minuten. Wenn du etwas nicht weißt, wähl ‚Später klären‘.
Nichts davon ist endgültig.“

Vor der ersten Frage still `node .claude/kit/werkzeuge/check.mjs --json`. Ergebnis erst in
Runde 6 und in der Zusammenfassung verwenden. Dann Runde 1 bis 6 nacheinander.

## Speichern

1. `.arbeit/einstellungen.md`: alle Antworten, zuletzt `eingerichtet: ja`. `arbeit.titel` nie
   leer lassen (notfalls vorläufig), sonst gilt das Projekt als nicht eingerichtet.
2. `.arbeit/plan.md`, Format `- YYYY-MM-DD · Text · kapitel: … · status: …` bzw. Termine
   `- YYYY-MM-DD HH:MM · Text`. Termine aus Runde 3. Meilensteine rückwärts von
   `arbeit.abgabe`, nach Bestätigung per Interview:
   - Abgabe minus 2 Wochen: „Abgabefertig“ · kapitel: alle · status: final
   - minus 4 Wochen: „Alle Kapitel geprüft“ · kapitel: alle · status: geprueft
   - minus 8 Wochen (bei Seminar- und Hausarbeit minus 2): „Rohfassung“ · kapitel: alle · status: entwurf
   - dazwischen Exposé und Gliederung als Termine ohne Kapitel, wenn die Zeit es hergibt
   Kapitelgenaue Meilensteine kommen in der Phase Gliederung dazu.
3. `.arbeit/thema/thema.md` mit Abschnitt „Ausgangslage“ (Lage, Stichworte, Datum).
4. `.arbeit/hilfsmittel.md`: erste Zeile „Claude Code, Einrichtung des Projekts“ mit Datum.
5. `.arbeit/tagebuch.md`: „Projekt eingerichtet“ mit den wichtigsten Entscheidungen.
6. Offenes für die Betreuung (KI-Regeln unbekannt, Sprache offen) nach
   `.arbeit/betreuung/offene-fragen.md`.
7. Zustand:
   ```
   node .claude/kit/werkzeuge/zustand.mjs phase thema
   node .claude/kit/werkzeuge/zustand.mjs verlauf "Projekt eingerichtet"
   node .claude/kit/werkzeuge/zustand.mjs naechster "Thema schärfen mit /weiter"
   ```

## Ausgabe

Endausgabe laut `AGENTS.md`, keine Tabelle:
- „Eingerichtet: <Arbeitstyp> in <Fach>, <Seiten> Seiten, Abgabe in <n> Tagen (<Datum>).“
- Höchstens drei Stichpunkte: Offenes für die Betreuung, Systemcheck in Klartext, Hinweis,
  dass alle Einstellungen lesbar in `.arbeit/einstellungen.md` stehen.
- `Geändert:` mit Links zu `.arbeit/einstellungen.md`, `.arbeit/plan.md`, `.arbeit/thema/thema.md`.

Interview „Wie möchtest du weitermachen?“ header „Weiter“:
- „Mit dem Thema starten (Empfohlen)“: `weiter`-Skill (Phase thema)
- „Erst das Dashboard ansehen“: `node .claude/kit/dashboard/server.mjs --starten`, Link nennen
- „Später“: `/weiter` setzt jederzeit fort, `/sync` sichert
