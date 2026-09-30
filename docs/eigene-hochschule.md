# An die eigene Hochschule anpassen

> Formvorgaben, Deckblatt, Logo und Zitierstil einstellen.
> Stand: 2026-09-30

## Am einfachsten: Merkblatt hochladen

Lege das Merkblatt oder den Leitfaden deiner Fakultät als PDF in `quellen/eingang/` und sag
bei `/start` (oder später jederzeit): „Übernimm die Formvorgaben aus dem Merkblatt.“ Claude
liest Seitenränder, Schrift, Zeilenabstand, Umfang, Pflichtverzeichnisse und Zitierweise
heraus, zeigt dir das Ergebnis und trägt es nach deiner Bestätigung ein.

## Wo die Einstellungen liegen

Alles steht in `arbeit/projekt.json`. Du musst die Datei nicht selbst bearbeiten, sag Claude,
was sich ändern soll („Ränder links 3 cm“, „Zitierstil ACS“). Wichtige Felder:

| Feld | Bedeutung | Beispiel |
| --- | --- | --- |
| `arbeit.typ` | Art der Arbeit | `diplomarbeit` |
| `arbeit.sprache` | Sprache des Texts | `de` oder `en` |
| `arbeit.fachprofil` | Fachkultur (Gliederung, Stil, Belegpraxis) | `naturwissenschaft` |
| `zitation.stil` | biblatex-Stil | `chem-acs`, `ieee`, `apa`, `harvard-de` |
| `latex.vorlage` | Vorlage | `koma` (Standard) oder `tudscr` |
| `latex.raender_cm` | Seitenränder | `{ "oben": 2.5, "innen": 3, ... }` |
| `latex.verzeichnisse` | welche Verzeichnisse erscheinen | `abkuerzungen`, `hilfsmittel`, ... |
| `ki_regeln` | was deine Prüfungsordnung zu KI sagt | `erlaubt-mit-deklaration` |

## Logo

Logo als PNG oder PDF nach `abbildungen/logo.png` legen und Claude sagen, dass es aufs
Deckblatt soll. Nutze nur ein Logo, das du laut Corporate Design deiner Hochschule verwenden
darfst.

## TU Dresden

Die offizielle LaTeX-Klasse `tudscr` bildet nach aktuellem Stand (Recherche 2026-09-30) das
neue Corporate Design und Logo der TU Dresden noch nicht ab. Das Kit nutzt deshalb
standardmäßig eine neutrale KOMA-Script-Vorlage. Verlangt deine Arbeitsgruppe `tudscr`, bei
`/start` auswählen oder `latex.vorlage` auf `tudscr` setzen. Im Zweifel beim Betreuer
nachfragen, welche Vorlage erwartet wird.

## Zitierstile

Naturwissenschaften zitieren meist nummerisch: `chem-acs` (American Chemical Society),
`chem-rsc` (Royal Society of Chemistry), `chem-angew` (Angewandte Chemie), `ieee`.
Wirtschaft und Sozialwissenschaften meist Autor-Jahr: `apa`, `authoryear`, `harvard-de`
(mit „vgl.“). Die Literaturdaten liegen in `quellen/literatur.bib`, das Verzeichnis entsteht
automatisch. Ein Stilwechsel ist deshalb jederzeit möglich, ohne den Text anzufassen.
