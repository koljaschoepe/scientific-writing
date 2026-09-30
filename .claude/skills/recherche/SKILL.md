---
name: recherche
description: Sucht Literatur zu Thema, Frage oder Kapitel und legt geprüfte Vorschläge im Quellen-Board an.
when_to_use: Belege fehlen, [BELEG FEHLT] im Text, Frage nach Literatur oder Studien, Phase Recherche.
argument-hint: "[thema, frage oder kapitelnummer]"
gruppe: quellen
---

# /recherche: Literatur finden

**Wichtig:** Nie eine Quelle, DOI oder Jahreszahl erfinden, jede DOI gegen Crossref prüfen.
Claude legt nur Vorschläge an, die Person entscheidet. `kandidaten.json` nie ganz lesen oder
von Hand schreiben, sondern `node kit/werkzeuge/kandidaten.mjs`. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS` (z. B. `2.3` für Kapitel 2.3 oder `"yield prediction"`)

## Kontext laden

- `arbeit/thema/thema.md`, `arbeit/gliederung/gliederung.md` (falls vorhanden)
- Was schon da ist: `node kit/werkzeuge/kandidaten.mjs list --kurz` (auch verworfene nicht
  erneut vorschlagen)
- `kit/leitfaeden/recherche.md`

## 1. Auftrag klären (höchstens eine Interview-Runde)

Nur wenn das Argument nicht eindeutig ist und `arbeit/stil.md` („So arbeite ich“) nichts sagt:
1. „Wofür suchen wir?“ header „Ziel“: aus Thema bzw. Gliederung, z. B. „Stand der Forschung zu
   <Kernbegriff> (Empfohlen)“, „Methoden für <X>“, „Belege für Kapitel <nr>“, „Gegenpositionen“.
2. „Wie breit?“ header „Umfang“: „10 bis 15 starke Treffer (Empfohlen)“, „Breiter Überblick
   (30+)“, „Nur die 5 wichtigsten“.
3. „Wo suchen?“ header „Quellen“, multiSelect: „Fachdatenbanken per API (Empfohlen)“,
   „Bibliothek und Verlage mit Uni-Login“, „Google Scholar“, „Allgemeine Websuche“
   (Browser-Suche dauert länger).

## 2. Suchen

- API-Suche über den Subagent `rechercheur` (Auftrag: Ziel, Kapitel, Anzahl, Zeitraum, E-Mail
  aus `arbeit/projekt.json → autor.email`, bekannte DOIs zum Ausschließen). Bei Claude Pro
  ein Subagent, nicht mehrere parallel.
- Browser (Playwright), wenn gewählt, im Hauptgespräch: beim ersten Mal Anmeldeseite öffnen
  und per Interview bitten, sich selbst anzumelden („Bin angemeldet“, „Klappt nicht“,
  „Überspringen“). SLUB, Verlage, Scholar langsam und einzeln. Jede DOI über Crossref prüfen.
- Websuche nur für Hintergrund, Software-Doku, graue Literatur.

## 3. Ins Board

Kandidaten als JSON-Liste nach `kit/SPEC.md` (Triage-Board) an
`node kit/werkzeuge/kandidaten.mjs add -` übergeben. Das Werkzeug setzt `status: vorschlag`,
Datum und Standardfelder und überspringt Dubletten (gleiche id oder DOI).
Suchstrings mit Datum und Trefferzahl in `arbeit/tagebuch.md`, eine Zeile in
`arbeit/hilfsmittel.md` („Literaturrecherche mit Claude Code“).
`node kit/werkzeuge/zustand.mjs verlauf "Recherche: <n> Vorschläge zu <Ziel>"`

## 4. Abschluss

Endausgabe laut `AGENTS.md`, keine Tabelle der Treffer (die stehen im Dashboard):
- Satz: „<n> Vorschläge zu <Ziel> stehen im Dashboard unter Quellen.“
- Stichpunkte: was die Treffer zusammen sagen, wichtigste Lücke oder Gegenposition, ob sich
  an Thema oder Frage etwas ändern sollte.

Interview „Wie weiter?“ header „Weiter“:
- „Ich entscheide im Dashboard (Empfohlen)“: danach `/quellen`
- „Mit mir hier im Chat“: Runden zu je 4 Kandidaten (nehmen, verwerfen, später), Ergebnis
  per `node kit/werkzeuge/kandidaten.mjs set <id> status=<...>`
- „Weitersuchen zu <Lücke>“
- „Pause“
