# Leitfaden: Literaturrecherche

> Wann brauchst du das? Bei `/recherche`, in der Phase Recherche und immer, wenn eine
> Aussage einen Beleg braucht, den es noch nicht gibt.
> Stand: 2026-09-30. Limits und Bedingungen der Dienste ändern sich, bei Fehlern
> die Doku des Dienstes prüfen.

## Grundsätze

- **Nie eine Quelle erfinden.** Jeder Treffer hat eine DOI oder eine stabile URL, die
  tatsächlich aufgerufen wurde. DOIs werden gegen Crossref geprüft.
- **Die Person entscheidet.** Treffer landen als `status: vorschlag` in
  `quellen/kandidaten.json` mit Begründung (`warum`) und Kapitelzuordnung. Im Dashboard
  nimmt oder verwirft sie.
- **Qualität vor Menge.** Peer-Review, Übersichtsartikel (Reviews) als Einstieg, dann
  Primärliteratur. Preprints (arXiv, ChemRxiv) kennzeichnen.
- **Aktualität prüfen.** In schnellen Feldern (Machine Learning) zählen die letzten drei
  Jahre, Grundlagenwerke dürfen alt sein.

## Suchstrategie

1. Kernbegriffe aus Forschungsfrage ableiten, je Begriff Synonyme auf Deutsch und Englisch.
2. Boolesche Suchstrings bauen, z. B.
   `("machine learning" OR "deep learning") AND ("reaction yield" OR "yield prediction")`.
3. Suchstrings in `arbeit/tagebuch.md` protokollieren (Datum, Datenbank, String, Treffer).
   Das braucht der Methodenteil einer Literaturarbeit und das Hilfsmittelverzeichnis.
4. Schneeball: Referenzen und Zitierungen der besten Treffer auswerten
   (Semantic Scholar liefert beides).
5. Sättigung: Wenn neue Suchen fast nur Bekanntes liefern, ist die Recherche für diesen
   Aspekt fertig.

## Dienste

| Dienst | Zugang | Limits (Stand 2026-09) | Wofür |
| --- | --- | --- | --- |
| Crossref `api.crossref.org/works` | ohne Key, `mailto=` Parameter für den Polite Pool | ohne mailto etwa 5 Anfragen gleichzeitig begrenzt, mit mailto großzügiger | Metadaten, DOI-Prüfung, Suche |
| Semantic Scholar `api.semanticscholar.org/graph/v1` | ohne Key möglich | gemeinsamer Pool, wird gedrosselt; bei 429 warten und langsamer werden | Suche, Abstracts, Referenzen, Zitierungen |
| OpenAlex `api.openalex.org` | **seit 13.02.2026 nur mit Key** | kostenloses Tagesbudget mit Key | nur nutzen, wenn ein Key in der Umgebung `OPENALEX_API_KEY` steht |
| Unpaywall `api.unpaywall.org/v2/<doi>?email=` | E-Mail als Parameter | moderat | legale Open-Access-PDFs finden |
| SLUB Katalog `katalog.slub-dresden.de` | Browser (Playwright) | – | Bücher, Zugang zu lizenzierten Zeitschriften (TU Dresden) |
| Google Scholar | Browser (Playwright), langsam und menschlich bedienen | blockt bei vielen Abfragen | breite Suche, Zitierzahlen |
| Verlagsseiten (ACS, RSC, Wiley, Elsevier, Springer) | Browser mit Uni-Login | – | Volltexte über die Lizenz der Hochschule |

Beispielaufrufe (WebFetch oder `curl` über Bash):

```
https://api.crossref.org/works?query=reaction%20yield%20prediction%20machine%20learning&rows=20&filter=from-pub-date:2021&mailto=<email>
https://api.semanticscholar.org/graph/v1/paper/search?query=reaction+yield+prediction&fields=title,authors,year,venue,externalIds,abstract,citationCount,openAccessPdf&limit=20
https://api.unpaywall.org/v2/10.1021/acs.jcim.0c00001?email=<email>
```

Die E-Mail für `mailto` steht in `arbeit/projekt.json → autor.email`. Fehlt sie,
per Interview fragen.

## Browser-Zugang (Playwright)

- Das Browserprofil bleibt gespeichert. Die Person meldet sich **einmal selbst** an
  (z. B. SLUB, Shibboleth-Login der Hochschule). Du tippst nie Passwörter ein und speicherst
  keine Zugangsdaten.
- Vor dem ersten Login per Interview erklären: „Ich öffne jetzt die Anmeldeseite. Bitte melde
  dich selbst an und sag mir Bescheid, wenn du fertig bist.“
- Bei Google Scholar langsam arbeiten (einzelne Suchen, keine Massenabfragen). Bei Captcha
  die Person bitten, es zu lösen.
- PDFs nur über legale Wege: Open Access, Lizenz der Hochschule, Fernleihe. Keine
  Schattenbibliotheken.

## Zotero (optional)

Wenn `arbeit/projekt.json → werkzeuge.zotero` true ist:
- Zotero 7 oder neuer mit Better BibTeX, Auto-Export der Sammlung als `.bib` mit
  „Keep updated“ in den Projektordner (z. B. `quellen/zotero.bib`).
- `/quellen` übernimmt neue Einträge aus dieser Datei in `literatur.bib` und das Board
  (`herkunft: zotero`, `status: genommen`).
- Lokale Zotero-API unter `http://localhost:23119/api/` (in Zotero unter Einstellungen,
  Erweitert aktivieren) erlaubt Lesen ohne Key.

## Bewertung eines Treffers

`relevanz` 1 bis 5 aus: Passung zur Forschungsfrage, Qualität des Publikationsorts,
Aktualität, Zitierungen im Verhältnis zum Alter, Methode vergleichbar mit der eigenen Arbeit.
`warum` in einem Satz, der ohne Fachjargon verständlich ist.
