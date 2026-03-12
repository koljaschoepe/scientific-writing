---
globs: ["output/**/*.tex"]
---

# Regeln für LaTeX-Dateien

## Konvertierung
- Inline-Zitationen als Text übernehmen (KEIN \cite{}, KEIN BibTeX)
- Überschriften-Nummern entfernen (LaTeX nummeriert automatisch)
- Anführungszeichen mit \enquote{} setzen (csquotes-Paket)
- Sonderzeichen escapen: %, &, _, #, $

## Geschützte Leerzeichen
- z. B. -> z.\,B.
- d. h. -> d.\,h.
- u. a. -> u.\,a.
- o. Ä. -> o.\,Ä.

## Listen
- Aufeinanderfolgende Listenpunkte in EINE itemize/enumerate-Umgebung
- Nicht für jeden Punkt eine eigene Umgebung

## Tabellen
- booktabs-Paket verwenden (\toprule, \midrule, \bottomrule)
- Keine vertikalen Linien

## Abbildungen
- \begin{figure}[htbp] mit \centering
- Beschriftung unter der Abbildung
- \label{fig:bezeichnung} für Verweise

## Seitenangaben
- Halbgeviertstrich für Bereiche: S.\,45--67 (nicht 45-67)

## Formatierung
- Alle Werte aus config.yaml übernehmen (Schriftart, Ränder, etc.)
- Deckblatt-Daten aus config.yaml generieren
- Verzeichnisse je nach config.yaml ein-/ausblenden
