# An die eigene Hochschule anpassen

> Formvorgaben, Deckblatt, Logo, Zitierstil, Bibliothek und Stilregeln einstellen.
> Stand: 2026-10-01

## Am einfachsten: Merkblatt hochladen

Lege das Merkblatt oder den Leitfaden deiner Fakultät als PDF in `quellen/eingang/` und sag
bei `/start` (oder später jederzeit): „Übernimm die Formvorgaben aus dem Merkblatt.“ Claude
liest Seitenränder, Schrift, Zeilenabstand, Umfang, Pflichtverzeichnisse und Zitierweise
heraus, zeigt dir das Ergebnis und trägt es nach deiner Bestätigung ein.

## Wo die Einstellungen liegen

Alles steht in einer lesbaren Datei: `.arbeit/einstellungen.md`. Jede Zeile hat die Form
`- schluessel: wert`, darunter steht kurz, was erlaubt ist. Du kannst sie selbst ändern
(nur hinter dem Doppelpunkt) oder Claude sagen, was anders sein soll („Ränder innen 3 cm“,
„Zitierstil ACS“). Die wichtigsten Abschnitte:

| Abschnitt | Was darin steht | Beispiel |
| --- | --- | --- |
| Arbeit | Titel, Art, Sprache, Fach, Seitenbereich, Abgabe | `seiten: 60-80` |
| Person | Name, Matrikel, E-Mail | |
| Hochschule | Name, Institut, Betreuung, KI-Regeln, Bibliothek | `ki_regeln: erlaubt` |
| Zitieren | Zitierstil | `stil: chem-acs` |
| Stil | Schalter für Ich-Form, Gedankenstriche, Semikolons, Satzlänge, Kommas, Schreibmodus | `semikolons: ja` |
| Layout | Vorlage, Schrift, Ränder, Verzeichnisse, Logo | `raender: 2.5/2.5/3/2.5` |
| Technik | Python, Zotero, Abo, Port des Dashboards | `abo: pro` |

## Stilregeln deiner Betreuung

Was sich schalten lässt (Ich-Form, Gedankenstriche, Semikolons, Satzlänge, Kommas), steht im
Abschnitt Stil. Alles andere schreibst du in Worten in `.arbeit/stil.md`, etwa „Präsens im
Ergebnisteil“ oder „kein Passiv in der Einleitung“. Claude und die Stilprüfung halten sich an
beides.

## Bibliothek

Damit Claude über deinen Uni-Zugang Volltexte findet, steht die Adresse des Katalogs deiner
Bibliothek unter `bibliothek:` im Abschnitt Hochschule. Kennst du sie nicht, sucht Claude sie
bei der Einrichtung und fragt dich, ob sie stimmt.

## Vorlage der Arbeitsgruppe

Das Kit baut mit einer neutralen KOMA-Script-Vorlage (`vorlage: koma`). Hat deine
Arbeitsgruppe eine eigene LaTeX-Vorlage, leg sie in `quellen/eingang/`. Claude überträgt
Ränder, Schrift und nötige Pakete in deine Einstellungen und eine eigene Präambel. Reicht das
nicht, sag es Claude, dann klärt ihr gemeinsam den Weg.

An der TU Dresden gibt es zusätzlich die Klasse `tudscr` (`vorlage: tudscr`). Sie bildet nach
Stand 2026-09-30 das neue Corporate Design noch nicht ab. Im Zweifel bei der Betreuung
nachfragen, welche Vorlage erwartet wird.

## Bewertungskriterien

Hast du den Bewertungsbogen deines Lehrstuhls, gib ihn Claude. Er landet in
`.arbeit/betreuung/bewertung.md`, und die Notenschätzungen in `/pruefen` richten sich danach.

## Logo

Logo als PNG oder PDF nach `abbildungen/logo.png` legen und Claude sagen, dass es aufs
Deckblatt soll. Nutze nur ein Logo, das du laut Corporate Design deiner Hochschule verwenden
darfst.

## Zitierstile

Naturwissenschaften zitieren meist nummerisch: `chem-acs` (American Chemical Society),
`chem-rsc` (Royal Society of Chemistry), `chem-angew` (Angewandte Chemie), `ieee`.
Wirtschaft und Sozialwissenschaften meist Autor-Jahr: `apa`, `authoryear`, `harvard-de`
(mit „vgl.“). Geisteswissenschaften: `chicago` (Autor-Jahr). Die Literaturdaten liegen in
`quellen/literatur.bib`, das Verzeichnis entsteht automatisch. Ein Stilwechsel ist deshalb
jederzeit möglich, ohne den Text anzufassen.
