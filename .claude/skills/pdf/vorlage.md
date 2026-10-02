# Format und Vorlage

- Deckblatt, Ränder, Schrift, Zeilenabstand, Verzeichnisse: Abschnitt `## Layout` in
  `.arbeit/einstellungen.md` (`vorlage`, `schrift`, `schriftgroesse`, `zeilenabstand`,
  `raender` als oben/unten/innen/außen in cm, `zweiseitig`, `logo`, `verzeichnisse`).
  Zitierstil: `zitieren.stil`. Deckblattdaten: Abschnitte Arbeit, Person, Hochschule.
- Eigene LaTeX-Pakete oder Makros: `.arbeit/latex/eigene-praeambel.tex`, eigener Wortlaut der
  Erklärung: `.arbeit/latex/eigene-erklaerung.tex`, eigener CSL-Stil für Word: `.arbeit/latex/eigene.csl`. Logo: `abbildungen/logo.png`
  (oder .pdf, .jpg).
- `layout.vorlage`: `koma` (Standard, hochschulneutral). `tudscr` nur für die TU Dresden
  (Stand 2026-09-30 altes Corporate Design, mit dem Lehrstuhl klären).
- Eine LaTeX-Vorlage der Arbeitsgruppe unterstützt `pdf.mjs` nicht direkt. Claude überträgt
  deren Vorgaben in die Einstellungen und `eigene-praeambel.tex`. Eine ganz eigene Vorlage
  wäre nur von Hand baubar, vorher per Interview klären.
