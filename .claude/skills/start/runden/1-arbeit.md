# Runde 1: Die Arbeit (4 Fragen)

Ziel: `arbeit.typ`, `arbeit.fachprofil`, `arbeit.fachgebiet`, `arbeit.sprache`, `arbeit.methodik`.

1. „Was für eine Arbeit schreibst du?“ header „Arbeitstyp“ → `arbeit.typ`
   - „Diplomarbeit“: meist 60 bis 100 Seiten
   - „Masterarbeit“: meist 50 bis 100 Seiten
   - „Bachelorarbeit“: meist 30 bis 60 Seiten
   - „Kleinere Arbeit“: Seminar-, Haus-, Projektarbeit (Folgefrage, welche)
   Dissertation über Freitext.
2. „In welchem Fach?“ header „Fach“ → `arbeit.fachprofil`
   - „Naturwissenschaft“ (`naturwissenschaft`): Chemie, Physik, Biologie, Pharmazie
   - „Technik/Informatik“ (`technik-informatik`): Informatik, Ingenieurwesen, Data Science
   - „Wirtschaft/Sozial“ (`wirtschaft-sozial`): BWL, VWL, Psychologie, Soziologie
   - „Geisteswissenschaft“ (`geistes`): Geschichte, Philosophie, Literatur, Sprachen
   Das konkrete Fach (z. B. „Chemie“) aus Freitext oder Folgefrage → `arbeit.fachgebiet`.
3. „In welcher Sprache schreibst du die Arbeit?“ header „Sprache“ → `arbeit.sprache` (`de`, `en`)
   - „Deutsch“ / „Englisch“ / „Noch offen“ (in der Chemie oft Englisch, mit Betreuung klären)
   Die Bedienung bleibt immer deutsch.
4. „Wie arbeitest du hauptsächlich?“ header „Methodik“ → `arbeit.methodik`, Optionen nach Fach:
   - Naturwissenschaft: „Experimentell (Labor)“, „Computational (Modelle, Simulation, KI)“,
     „Beides“, „Literaturarbeit“
   - Wirtschaft/Sozial: „Literatur/Konzept“, „Empirisch qualitativ“, „Empirisch quantitativ“, „Gemischt“
   - andere: sinnvoll analog
   Werte: experimentell, computational, gemischt, literatur, empirisch-qualitativ, empirisch-quantitativ.
