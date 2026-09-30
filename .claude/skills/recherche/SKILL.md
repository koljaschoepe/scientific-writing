---
name: recherche
description: Sucht Literatur zu einem Thema oder Kapitel (Crossref, Semantic Scholar, Bibliothek und Google Scholar per Browser, Web) und legt Vorschläge im Quellen-Board an, über die die Person im Dashboard entscheidet.
argument-hint: "[thema, frage oder kapitelnummer]"
disable-model-invocation: true
---

# /recherche: Literatur finden

## Wann

- In der Phase Recherche (über `/weiter`) oder jederzeit, wenn Belege fehlen.
- Wenn ein Kapitel `[BELEG FEHLT]`-Marken hat.
- Mit Argument: `/recherche 2.3` sucht für Kapitel 2.3, `/recherche "yield prediction"` zu einem Begriff.

## Kontext laden

- `arbeit/projekt.json`, `arbeit/thema/thema.md`, `arbeit/gliederung/gliederung.md` (falls vorhanden)
- `quellen/kandidaten.json` (was schon da ist, was verworfen wurde: nicht erneut vorschlagen)
- `kit/leitfaeden/recherche.md`

## Ablauf

### 1. Auftrag klären (Interview, eine Runde)

Wenn kein eindeutiges Argument da ist:
1. „Wofür suchen wir?“ header „Ziel“: passende Optionen aus Gliederung bzw. Thema
   (z. B. „Stand der Forschung zu <Kernbegriff> (Empfohlen)“, „Methoden für <X>“,
   „Belege für Kapitel <nr>“, „Gegenpositionen und Kritik“).
2. „Wie breit?“ header „Umfang“: „10 bis 15 starke Treffer (Empfohlen)“, „Breiter Überblick
   (30+)“, „Nur die 5 wichtigsten“.
3. „Wo suchen?“ header „Quellen“, multiSelect: „Fachdatenbanken per API (Empfohlen)“,
   „Bibliothek und Verlage mit Uni-Login“, „Google Scholar“, „Allgemeine Websuche“.
   Hinweis in der Beschreibung: Browser-Suche dauert länger.

Überspringe Fragen, deren Antwort aus `arbeit/stil.md` („So arbeite ich“) klar ist.

### 2. Suchen

- API-Suche über den Subagent `rechercheur` (Auftrag: Ziel, Kapitel, Anzahl, Zeitraum,
  E-Mail für mailto). Bei Claude Pro ein Subagent, nicht mehrere parallel.
- Browser (Playwright), wenn gewählt, im Hauptgespräch:
  - Beim ersten Mal: Anmeldeseite öffnen und per Interview bitten, sich selbst anzumelden
    („Ich habe die Anmeldeseite geöffnet. Sag Bescheid, wenn du angemeldet bist.“ –
    Optionen „Bin angemeldet“, „Klappt nicht“, „Überspringen“).
  - SLUB-Katalog, Verlagsseiten, Google Scholar langsam und einzeln abfragen.
  - Jeden Browser-Treffer mit DOI über Crossref prüfen.
- Allgemeine Websuche (WebSearch) nur für Hintergrund, Datenbanken, Software-Dokumentation,
  graue Literatur. Nicht als Ersatz für Fachliteratur.

### 3. Ins Board eintragen

Für jeden Kandidaten einen Eintrag in `quellen/kandidaten.json` nach Schema in `kit/SPEC.md`
anlegen: `status: "vorschlag"`, `stern: 0`, `notiz: ""`, `ausgewertet: false`, `zitate: 0`,
`hinzugefuegt: <heute>`, `entschieden: null`, `bibkey: ""`. Dubletten (gleiche DOI oder
gleicher Titel) nicht anlegen. Datei als gültiges JSON schreiben (vorher lesen, ergänzen,
ganz schreiben).

Suchstrings mit Datum und Trefferzahl in `arbeit/tagebuch.md` protokollieren.
`arbeit/hilfsmittel.md`: „Literaturrecherche mit Claude Code (APIs/Browser)“.

### 4. Einordnen und challengen

Zeige eine kurze Tabelle der Top-5 (Titel gekürzt, Jahr, warum, Relevanz) und benenne:
- Was die Treffer zusammen sagen (2 Sätze).
- Die wichtigste Lücke oder Gegenposition.
- Ob sich an Thema oder Forschungsfrage etwas ändern sollte, wenn die Literatur das nahelegt.

## Zustand

```
node kit/werkzeuge/zustand.mjs verlauf "Recherche: <n> Vorschläge zu <Ziel>"
node kit/werkzeuge/zustand.mjs pruefe-abzeichen
```

## Abschluss-Interview

„Die Vorschläge stehen im Dashboard unter Quellen. Wie weiter?“ header „Weiter“
- „Ich entscheide jetzt im Dashboard (Empfohlen)“: Hinweis, danach `/quellen` ausführen
- „Entscheide mit mir hier im Chat“: Kandidaten in Runden zu je 4 per Interview durchgehen
  (Optionen je Quelle: nehmen, verwerfen, später), Ergebnis ins Board schreiben
- „Weitersuchen zu <Lücke>“
- „Pause“
