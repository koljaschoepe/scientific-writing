# Zitierstile für den Word-Export

> Stand: 2026-10-01
> Quelle: https://github.com/citation-style-language/styles (Branch master, Commit 000d75d)

Diese CSL-Dateien nutzt `node .claude/kit/werkzeuge/pdf.mjs docx` (Pandoc mit `--citeproc`), um
`Arbeit.docx` mit Literaturverzeichnis zu erzeugen. Das PDF nutzt sie nicht, dort arbeitet biblatex.

| `stil` unter „Zitieren“ in `.arbeit/einstellungen.md` | CSL-Datei |
| --- | --- |
| `chem-acs` | `american-chemical-society.csl` |
| `chem-rsc` | `royal-society-of-chemistry.csl` |
| `chem-angew` | `angewandte-chemie.csl` |
| `ieee`, `numeric` | `ieee.csl` |
| `apa` | `apa.csl` |
| `harvard-de` | `din-1505-2.csl` (Autor-Jahr, Deutsch) |
| `authoryear` | `harvard-cite-them-right.csl` |
| `chicago` | keine Datei, Pandoc bringt Chicago Author-Date selbst mit |

## Lizenz

Die Stile stammen aus dem offiziellen Repository des Citation Style Language Projekts und
stehen unter der Lizenz Creative Commons Attribution-ShareAlike 3.0 Unported
(CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/). Autorinnen und Autoren stehen
jeweils im `<info>`-Block der Datei. Die Dateien sind unverändert.

Eigene Stile: weitere `.csl`-Datei hier ablegen ist Herstellerzone und wird von `/update`
nicht geschützt. Eigene Stile besser nach `.arbeit/latex/eigene.csl` legen, das Werkzeug nimmt sie dann vorrangig.
