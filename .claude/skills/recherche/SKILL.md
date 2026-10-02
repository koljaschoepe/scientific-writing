---
name: recherche
description: Sucht Literatur zu Thema, Frage oder Kapitel und legt geprüfte Vorschläge im Dashboard ab.
when_to_use: „Such mir Studien zu …“, „gibt es Literatur zu …“, [BELEG FEHLT], Phase Recherche. Nicht für bekannte DOI oder vorhandenes PDF (quellen).
argument-hint: "[thema, frage oder kapitelnummer]"
gruppe: quellen
---

# /recherche: Literatur finden

**Wichtig:** Nie eine Quelle, DOI oder Jahreszahl erfinden, jede DOI gegen Crossref prüfen.
Claude legt nur Vorschläge an, die Person entscheidet. `.arbeit/kandidaten.json` nie lesen
oder von Hand schreiben, nur `node .claude/kit/werkzeuge/kandidaten.mjs`. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS` (z. B. `2.3` für Kapitel 2.3 oder `"yield prediction"`)

## 1. Auftrag klären (höchstens eine Interview-Runde)

Nur wenn das Argument nicht eindeutig ist und „So arbeite ich“ in `.arbeit/stil.md` nichts sagt:
1. „Wofür suchen wir?“ header „Ziel“: aus Thema bzw. Gliederung, z. B. „Stand der Forschung zu
   <Kernbegriff> (Empfohlen)“, „Methoden für <X>“, „Belege für Kapitel <nr>“, „Gegenpositionen“.
2. „Wie breit?“ header „Umfang“: „10 bis 15 starke Treffer (Empfohlen)“, „Breiter Überblick
   (30+)“, „Nur die 5 wichtigsten“.
3. „Wo suchen?“ header „Quellen“, multiSelect: „Fachdatenbanken (Empfohlen)“, „Bibliothek und
   Verlage mit Uni-Login“, „Google Scholar“, „Allgemeine Websuche“ (Browser dauert länger).

## 2. Suchen

- Fachdatenbanken: Subagent `rechercheur`. Auftrag: Ziel, Kapitel, Anzahl, Zeitraum,
  bekannte DOIs zum Ausschließen. Er trägt selbst ins Board ein und gibt nur eine kurze
  Zusammenfassung zurück. Bei `technik.abo: pro` ein Rechercheur, nicht mehrere parallel.
- Browser (Playwright) im Hauptgespräch, wenn gewählt: Katalog aus `hochschule.bibliothek`
  (leer: Bibliotheksseite der Hochschule per Websuche finden, bestätigen lassen, eintragen).
  Beim ersten Mal die Anmeldeseite öffnen und per Interview bitten, sich selbst anzumelden
  („Bin angemeldet“, „Klappt nicht“, „Überspringen“). Langsam und einzeln. Jede DOI prüfen.
- Websuche nur für Hintergrund, Software-Doku, graue Literatur.

Funde aus dem Browser selbst eintragen, alle auf einmal:

```bash
node .claude/kit/werkzeuge/kandidaten.mjs add - <<'JSON'
{"quellen": [{"id": "<doi oder url>", "titel": "", "autoren": ["Nachname, Vorname"],
  "jahr": 2024, "venue": "", "doi": "", "url": "", "kurz": "2 Sätze Inhalt",
  "warum": "1 Satz ohne Jargon", "kapitel": ["2.1"], "relevanz": 4,
  "markierungen": ["review"], "open_access": null, "herkunft": "bibliothek"}]}
JSON
```

`relevanz` 1 bis 5. `markierungen` aus kernquelle, methodik, daten, review, kritisch,
definition, gegenposition. `herkunft` z. B. crossref, semantic-scholar, bibliothek, scholar,
web. Das Werkzeug setzt `status: vorschlag` und Datum und überspringt Dubletten.

## 3. Protokoll

Suchstrings mit Datum und Trefferzahl in `.arbeit/tagebuch.md`, eine Zeile in
`.arbeit/hilfsmittel.md` („Literaturrecherche mit Claude Code“).
`node .claude/kit/werkzeuge/zustand.mjs verlauf "Recherche: <n> Vorschläge zu <Ziel>"`

## 4. Abschluss

Endausgabe laut `AGENTS.md`, keine Tabelle der Treffer (die stehen im Dashboard):
- Satz: „<n> Vorschläge zu <Ziel> stehen im Dashboard unter Quellen.“
- Stichpunkte: was die Treffer zusammen sagen, wichtigste Lücke oder Gegenposition, ob sich
  an Thema oder Frage etwas ändern sollte.

Interview „Wie weiter?“ header „Weiter“:
- „Ich entscheide im Dashboard (Empfohlen)“: danach quellen-Skill
- „Mit mir hier im Chat“: Runden zu je 4 Kandidaten (nehmen, verwerfen, später), Ergebnis per
  `kandidaten.mjs set <id> status=<genommen|verworfen|spaeter>`
- „Weitersuchen zu <Lücke>“
- „Pause“
