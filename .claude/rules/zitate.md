---
paths:
  - "arbeit/kapitel/**"
  - "arbeit/expose/**"
  - "quellen/zitate/**"
  - "quellen/literatur.bib"
---

# Zitate und Quellen

- Zitiert wird ausschließlich, was in `quellen/literatur.bib` steht. Zitierbefehl im Markdown:
  `[@bibkey]`, mit Seite `[@bibkey, S. 4]` (englisch `[@bibkey, p. 4]`), mehrere `[@a; @b]`.
  Das Format im PDF setzt biblatex nach `arbeit/projekt.json → zitation.stil`.
- Nie eine Quelle, eine DOI, eine Seitenzahl oder ein Zitat erfinden. Jede neue DOI wird
  gegen Crossref geprüft (`node kit/werkzeuge/bib.mjs check`), bevor sie in die bib kommt.
- Inhaltliche Aussagen stammen aus `quellen/zitate/<bibkey>.md` oder dem PDF. Gibt es für
  eine Behauptung keine Stelle, markiere sie im Text mit `[BELEG FEHLT]` und melde es.
- Übersetzte Zitate sind nie direkte Zitate. Fremdsprachige Stellen werden paraphrasiert
  und indirekt belegt. Das Original steht in der Zitatedatei im Feld `original`.
- Keine Sekundärzitate, wenn die Primärquelle beschaffbar ist. Sonst kennzeichnen.
- Paraphrase heißt eigene Satzstruktur. Fast wörtliche Übernahme mit indirektem Beleg ist
  ein Plagiatsrisiko.
- Im Triage-Board legt Claude nur Vorschläge an (`status: vorschlag`, über
  `node kit/werkzeuge/kandidaten.mjs add`). Nehmen oder verwerfen entscheidet die Person.
- Jede KI-Nutzung, die in die Arbeit eingeht, wird in `arbeit/hilfsmittel.md` protokolliert
  (Datum, Werkzeug, Zweck, betroffener Teil).
