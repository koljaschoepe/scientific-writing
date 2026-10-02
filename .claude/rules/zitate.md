---
paths:
  - "kapitel/**"
  - ".arbeit/expose/**"
  - "quellen/notizen/**"
  - "quellen/literatur.bib"
---

# Zitate und Quellen

- Zitiert wird nur, was in `quellen/literatur.bib` steht: `[@bibkey]`, mit Seite
  `[@bibkey, S. 4]` (englisch `[@bibkey, p. 4]`), mehrere `[@a; @b]`, mit „vgl.“
  `[vgl. @bibkey, S. 4]`, Autor im Satz `@bibkey zeigt ...`. Das Format im PDF setzt biblatex
  nach `zitieren.stil`. Das Literaturverzeichnis entsteht automatisch.
- Nie eine Quelle, DOI, Seitenzahl oder ein Zitat erfinden. Neue DOIs vor dem Eintrag gegen
  Crossref prüfen (`node .claude/kit/werkzeuge/bib.mjs check`).
- Inhaltliche Aussagen stammen aus `quellen/notizen/<bibkey>.md` oder dem PDF. Gibt es keine
  Stelle: `[BELEG FEHLT]` im Text und melden.
- Seitenangabe ist die gedruckte Seite (`seite`), nicht die PDF-Seite (`seite_pdf`).
- Übersetzte Zitate sind nie direkte Zitate. Fremdsprachiges wird paraphrasiert und indirekt
  belegt, das Original steht in der Notiz unter `original`.
- Keine Sekundärzitate, wenn die Primärquelle beschaffbar ist. Sonst kennzeichnen.
- Paraphrase heißt eigene Satzstruktur. Fast wörtliche Übernahme mit indirektem Beleg ist ein
  Plagiatsrisiko.
- Im Quellen-Board legt Claude nur Vorschläge an (`kandidaten.mjs add`). Nehmen oder verwerfen
  entscheidet die Person.
- Jede KI-Nutzung, die in die Arbeit eingeht, in `.arbeit/hilfsmittel.md` (Datum, Werkzeug,
  Zweck, betroffener Teil).
