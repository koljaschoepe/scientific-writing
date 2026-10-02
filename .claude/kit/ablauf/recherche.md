# Phase: Recherche

> Geladen von `/weiter`, wenn `phase` = `recherche`.
> Ziel: ein belastbarer Stand der Forschung für Exposé und Grundlagenkapitel,
> ausgewertete Kernquellen, dokumentierte Suchstrategie.

## Ergebnis

- `.arbeit/thema/suchstrategie.md`: Kernbegriffe de/en, Synonyme, Suchstrings, Datenbanken,
  Zeitraum, Ein- und Ausschlusskriterien.
- Entschiedene Quellen im Board (`kandidaten.mjs`), `quellen/literatur.bib`,
  `quellen/notizen/*.md` für die Kernquellen.
- `.arbeit/thema/forschungsstand.md`: Synthese (Themenblöcke, wer sagt was, Konsens,
  Widersprüche, Lücke), Grundlage für Exposé und Kapitel 2.

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Suchstrategie | `suchstrategie.md` existiert |
| 2 Erste Suche | mindestens 15 Kandidaten im Board |
| 3 Triage | keine Kandidaten mehr mit `status: vorschlag` älter als 7 Tage, oder Person hat entschieden |
| 4 Auswertung | alle `genommen` mit `ausgewertet: true` oder begründetem fehlenden PDF |
| 5 Synthese | `forschungsstand.md` existiert |
| 6 Sättigung | Person hat per Interview bestätigt |

## Schritte

1. **Suchstrategie** gemeinsam entwickeln: Kernbegriffe aus der Forschungsfrage ziehen,
   Synonyme vorschlagen, per Interview (multiSelect) bestätigen. Ein- und Ausschluss
   (Zeitraum, Sprachen, Publikationstypen) per Interview.
2. **Suche** über `/recherche` je Themenblock (höchstens ein Block pro Durchgang, damit die
   Person nicht mit 60 Vorschlägen erschlagen wird).
3. **Triage** im Dashboard. Anbieten, gemeinsam im Chat zu entscheiden. Muster erkennen und
   still in `.arbeit/stil.md` notieren (z. B. verwirft Preprints, mag Reviews).
4. **Auswerten** mit `/quellen`. Mit Kernquellen (Stern 3 oder Markierung kernquelle) beginnen.
5. **Synthese:** Evidenzmatrix als Tabelle in `forschungsstand.md` (Quelle, Methode, Daten,
   Ergebnis, Grenze), danach 1 bis 2 Seiten Fließtext-Entwurf je Themenblock. Die Lücke, die
   die eigene Arbeit füllt, ausdrücklich benennen.
6. **Sättigung prüfen:** Liefern neue Suchen Neues? Fehlen Gegenpositionen? Ist jede
   Unterfrage durch Literatur gerahmt? Interview: „weiter suchen“ oder „reicht fürs Exposé“.

## Challenge

- Ist die Forschungslücke echt, oder hat sie schon jemand geschlossen? Gezielt danach suchen.
- Sind die Quellen einseitig (nur eine Gruppe, nur ein Journal, nur alt)?
- Verändert die Literatur die Forschungsfrage? Wenn ja, offen sagen und Phase thema anbieten.

## Richtwerte

Grob, je nach Fach: Diplom- oder Masterarbeit 40 bis 80 zitierte Quellen, davon 10 bis 20
Kernquellen gründlich ausgewertet. Nicht Menge zählt, sondern Abdeckung der Unterfragen.

## Fertig, wenn

Synthese steht, Kernquellen sind ausgewertet, Sättigung bestätigt. Recherche geht in
späteren Phasen punktuell weiter (`/recherche <nr>`). Nächste Phase: `expose`.
