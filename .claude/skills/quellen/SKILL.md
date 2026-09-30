---
name: quellen
description: Verarbeitet Quellen-Entscheidungen aus dem Dashboard und neue Dateien im Eingang - bib-Eintrag anlegen, PDF beschaffen, Zitate extrahieren, Kapitel zuordnen.
argument-hint: "[bibkey, doi oder pfad]"
disable-model-invocation: true
---

# /quellen: Quellen verarbeiten

## Wann

- Nachdem die Person im Dashboard Quellen genommen hat.
- Wenn Dateien in `quellen/eingang/` liegen (Upload im Dashboard oder abgelegt im Explorer).
- Mit Argument: eine DOI, ein Pfad zu einem PDF oder ein bibkey, der neu ausgewertet werden soll.
- Bei Zotero-Nutzung: neue Einträge aus der exportierten `.bib` übernehmen.

## Kontext laden

- `quellen/kandidaten.json`, `quellen/literatur.bib`, Dateiliste `quellen/eingang/`,
  `quellen/pdfs/`, `quellen/zitate/`
- `arbeit/projekt.json` (E-Mail, Sprache), `arbeit/gliederung/gliederung.md` bzw. `arbeit/thema/thema.md`
- `kit/leitfaeden/recherche.md` (legale Beschaffung)

## Ablauf

### 1. Arbeitsliste bilden

- A: Board-Einträge mit `status: genommen` und (`bibkey` leer oder `ausgewertet: false`).
- B: Dateien in `quellen/eingang/`.
- C: Zotero-Export mit Einträgen, die nicht in `literatur.bib` stehen.

Zeige die Liste kurz. Bei mehr als 8 Quellen per Interview: „Alle jetzt verarbeiten
(Empfohlen, etwa <n> Minuten)“, „Nur Kernquellen (Stern oder Markierung kernquelle)“,
„Die ersten 5“. Bei Claude Pro höchstens 2 Auswertungen parallel.

### 2. Eingang (B) sortieren

Für jede Datei:
- PDF: Metadaten aus der ersten Seite lesen (Titel, Autoren, DOI). DOI über Crossref prüfen.
  Datei nach `quellen/pdfs/<bibkey>.pdf` verschieben. Board-Eintrag anlegen oder vorhandenen
  ergänzen mit `herkunft: upload`, `status: genommen`.
- `.bib` oder `.ris`: Einträge übernehmen, jeden als `genommen` ins Board.
- Merkblatt, Prüfungsordnung, Vorlage der Arbeitsgruppe: nicht als Quelle behandeln, sondern
  per Interview fragen, wofür es ist, und nach `arbeit/betreuung/` bzw. `latex/vorlage-ag/` legen.
- Unklare Dateien: per Interview fragen.

### 3. Je Quelle (A, B, C)

1. **bibkey** bilden: `nachnameJahrErstesWort`, klein, ohne Umlaute, z. B. `schwaller2019molecular`.
   Kollision: Suffix a, b.
2. **bib-Eintrag** anlegen: bevorzugt `node kit/werkzeuge/bib.mjs add <doi>` (holt Crossref-Daten).
   Ohne DOI: Eintrag aus den Metadaten von Hand schreiben, Typ korrekt (`@article`, `@book`,
   `@incollection`, `@online`, `@misc` für Preprints). Pflichtfelder laut Zitierstil-Leitfaden.
   Zeitschriftenkürzel für Chemie-Stile in `shortjournal`.
3. **PDF beschaffen**, wenn keins da ist, in dieser Reihenfolge:
   - `open_access`-Link aus dem Board oder Unpaywall
   - Verlagsseite mit Uni-Login per Playwright (Profil bleibt angemeldet; wenn nicht, Person
     per Interview bitten, sich anzumelden)
   - geht nicht: `pdf: null` lassen, im Dashboard als „PDF fehlt“ sichtbar, Person per
     Interview fragen („Selbst besorgen und in den Eingang legen“, „Fernleihe“, „Ohne PDF
     nur Abstract nutzen“, „Quelle verwerfen“).
4. **Auswerten** mit Subagent `quellen-auswerter` (bibkey, PDF-Pfad, Kapitel, Notiz der Person).
5. **Board aktualisieren:** `bibkey`, `pdf`, `ausgewertet: true`, `zitate: <anzahl>`,
   `kapitel` ergänzen, falls die Auswertung weitere Kapitel ergibt.

`node kit/werkzeuge/bib.mjs check` am Ende: alle DOIs verifiziert, Fehler melden.

### 4. Einordnen

Kurz zusammenfassen: verarbeitet, fehlende PDFs, auffällige Befunde (Widersprüche zwischen
Quellen, Preprints, Quellen, die die Forschungsfrage infrage stellen). Challengen, wenn eine
neue Quelle eine bisherige Annahme schwächt.

## Zustand

```
node kit/werkzeuge/zustand.mjs verlauf "<n> Quellen ausgewertet"
node kit/werkzeuge/zustand.mjs pruefe-abzeichen
```
`arbeit/hilfsmittel.md`: „Quellenauswertung (Extraktion von Zitaten) mit Claude Code“.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“
- nächster Schritt laut Phase (z. B. „Exposé schreiben (Empfohlen)“ oder „Kapitel <nr> planen“)
- „Mehr recherchieren zu <Lücke>“
- „Fehlende PDFs klären“
- „Pause“
