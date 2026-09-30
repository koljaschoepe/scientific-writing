# Zitierstil: ACS (American Chemical Society)

> Wird geladen, wenn `arbeit/projekt.json → zitation.stil` den Wert `chem-acs` hat.
> Biblatex-Stil: `chem-acs` aus dem Paket biblatex-chem. Stand: 2026-09-30
> Empfohlen für Chemie, wenn die Arbeitsgruppe nichts anderes vorgibt.

## So zitierst du im Markdown

| Zweck | Markdown | Ergebnis im PDF |
| --- | --- | --- |
| Beleg | `[@schwaller2019]` | hochgestellte Nummer¹ |
| mehrere | `[@schwaller2019; @coley2017]` | ¹˒² bzw. Bereich ¹⁻³ |
| mit Seite | `[@atkins2018, S. 112]` | ¹ (Seite im Verzeichnis bzw. in Klammern) |
| Autor im Satz | `Schwaller et al. [@schwaller2019] zeigten ...` | Schwaller et al.¹ zeigten ... |

Nummeriert wird in der Reihenfolge des ersten Auftretens. Das erledigt biblatex, nie
von Hand zählen.

## Regeln

- Die Nummer steht nach dem Satzzeichen, wenn biblatex so konfiguriert ist (Vorlage macht
  das). Im Markdown steht `[@key]` direkt vor dem Punkt: `... gezeigt [@key].`
- Autorennamen im Satz nur, wenn die Person oder Gruppe für die Aussage wichtig ist.
- Seitenangaben sind in der Chemie unüblich, außer bei Büchern und direkten Zitaten.
- Direkte Zitate sind in naturwissenschaftlichen Arbeiten selten. Paraphrase ist Standard.

## Pflichtfelder in literatur.bib

| Typ | Felder |
| --- | --- |
| `@article` | author, title, journaltitle (bzw. journal), year, volume, pages, doi |
| `@book` | author oder editor, title, publisher, year, edition (ab 2. Aufl.) |
| `@incollection` | author, title, booktitle, editor, publisher, year, pages |
| `@online` | author oder organization, title, url, urldate |
| `@misc` (Preprint) | author, title, year, eprint oder doi, howpublished = {ChemRxiv} |

Zeitschriftentitel werden im ACS-Stil abgekürzt (CASSI). biblatex-chem kürzt nicht
automatisch: Gib in der bib `shortjournal` an oder nutze `journaltitle` bereits abgekürzt,
z. B. `J. Chem. Inf. Model.`, `J. Am. Chem. Soc.`, `Angew. Chem. Int. Ed.`

## Beispiel im Verzeichnis

(1) Schwaller, P.; Laino, T.; Gaudin, T.; Bolgar, P.; Hunter, C. A.; Bekas, C.; Lee, A. A.
Molecular Transformer: A Model for Uncertainty-Calibrated Chemical Reaction Prediction.
*ACS Cent. Sci.* **2019**, *5*, 1572–1583. DOI: 10.1021/acscentsci.9b00576.
