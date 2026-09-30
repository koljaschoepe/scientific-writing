# Fachprofil: Naturwissenschaft

> Gilt bei `arbeit/projekt.json → arbeit.fachprofil: naturwissenschaft`
> (Chemie, Physik, Biologie, Materialwissenschaft, Pharmazie, Lebensmittelchemie).
> Hat Vorrang vor den allgemeinen Leitfäden. Stand: 2026-09-30

## Kapitelmodelle

### Experimentelle Arbeit (Diplom-, Master-, Bachelorarbeit)

```
Zusammenfassung / Abstract
1 Einleitung und Zielsetzung
2 Theoretische Grundlagen und Stand der Forschung
   2.1 ... (nur, was für Methode und Diskussion gebraucht wird)
3 Ergebnisse und Diskussion        (in der Chemie oft zusammengelegt)
   3.1 ... (nach Fragestellung gegliedert, nicht chronologisch)
4 Zusammenfassung und Ausblick
5 Experimenteller Teil             (steht in der Chemie oft am Ende)
   5.1 Allgemeine Methoden, Geräte, Chemikalien
   5.2 Synthesevorschriften / Messprotokolle
Literaturverzeichnis
Anhang (Spektren, Rohdaten, Code)
```

Variante getrennt: 3 Methoden, 4 Ergebnisse, 5 Diskussion, 6 Zusammenfassung (IMRaD).
Welche Variante gilt, entscheidet die Arbeitsgruppe. Im Interview fragen, ob es eine
Beispielarbeit aus der Gruppe gibt, und deren Gliederung übernehmen.

### Computational Arbeit (Modellierung, Machine Learning, Simulation)

```
1 Einleitung und Zielsetzung
2 Grundlagen
   2.1 Chemischer Hintergrund (Stoffklasse, Reaktion, Eigenschaft)
   2.2 Methodische Grundlagen (z. B. Molekülrepräsentationen, ML-Modelle, DFT)
   2.3 Stand der Forschung (wer hat was mit welcher Genauigkeit vorhergesagt)
3 Daten und Methoden
   3.1 Datensatz (Herkunft, Umfang, Bereinigung, Aufteilung)
   3.2 Merkmale und Repräsentation
   3.3 Modelle und Training (Hyperparameter, Validierung, Metriken)
   3.4 Software und Reproduzierbarkeit
4 Ergebnisse
5 Diskussion (Vergleich mit Literatur, Fehleranalyse, Anwendbarkeitsbereich, Grenzen)
6 Zusammenfassung und Ausblick
Anhang (Hyperparameter, zusätzliche Auswertungen, Code-Verweis)
```

## Belegregeln

- **Eigene Messungen und Rechnungen sind Beleg.** Sie werden über Abbildung, Tabelle,
  Methodenteil oder Anhang nachvollziehbar gemacht, nicht über Literatur.
- Zitierdichte: Einleitung und Grundlagen dicht (fast jede Sachaussage belegt),
  Ergebnisse dünn (nur Vergleichswerte), Diskussion mittel (jeder Vergleich belegt).
- Querverweise sind erwünscht: „\cref{fig:ausbeute}“, „\cref{tbl:parameter}“,
  „Gleichung \eqref{eq:arrhenius}“, „siehe Abschnitt 5.2“.
- Nummernzitierstil ist Standard (ACS, RSC, Angewandte). Siehe `../zitierstile/chem-acs.md`.

## Sprache

- Deutsch: unpersönlich, Passiv im Methodenteil üblich („wurde ... gerührt“).
- Englisch: Aktiv mit „we“ ist in Chemie-Journalen verbreitet. In Abschlussarbeiten
  vorher mit der Betreuung klären und in `arbeit/stil.md` festhalten.
- Zeitform: Methoden und eigene Ergebnisse im Präteritum, allgemein gültiges Wissen
  und Literaturaussagen im Präsens.
- Keine Wertungen ohne Zahl: nicht „deutlich besser“, sondern „R² von 0,71 auf 0,86“.

## Formalia und Notation (LaTeX, direkt im Markdown)

| Was | Schreibweise | Hinweis |
| --- | --- | --- |
| Summenformeln, Reaktionen | `\ce{H2SO4}`, `\ce{A + B -> C}` | mhchem |
| Strukturformeln | `\chemfig{...}` oder als Abbildung aus ChemDraw/RDKit | lieber Abbildung |
| Zahlen mit Einheit | `\qty{25}{\celsius}`, `\qty{5.0(2)}{\milli\mol}` | siunitx, Dezimaltrennzeichen setzt die Vorlage |
| Einheit allein | `\unit{\kilo\joule\per\mol}` | |
| Formeln | `$E_\text{a}$`, `$$k = A\,e^{-E_\text{a}/RT}$$` | Variablen kursiv, Indizes aufrecht, wenn sie Wörter sind |
| Verbindungsnummern | fett, `**1**`, `**2a**` | in der Chemie üblich |
| Abbildung | `![Beschriftung.](abbildungen/x.pdf){#fig:x width=80%}` | Beschriftung unter der Abbildung |
| Tabelle | Pipe-Tabelle plus `: Beschriftung. {#tbl:x}` | Beschriftung über der Tabelle |

Nomenklatur nach IUPAC. Trivialnamen beim ersten Auftreten mit IUPAC-Namen oder Nummer.
Abkürzungen (NMR, DFT, GNN, MAE) in `arbeit/begriffe.md` eintragen.

## Ergebnisse darstellen

- Jede Abbildung wird im Text erwähnt und interpretiert, bevor oder während sie erscheint.
- Achsen mit Größe und Einheit, `Größe / Einheit` (z. B. „T / °C“).
- Unsicherheiten angeben (Standardabweichung, Konfidenzintervall, Anzahl Wiederholungen).
- Statistik: Welche Metrik, auf welchem Datensatz (Test, nicht Training), Vergleich mit
  einer einfachen Baseline.
- Machine Learning: Datenleck ausschließen (Aufteilung nach Gerüst oder Zeit, wenn
  sinnvoll), Anwendbarkeitsbereich benennen, keine Überinterpretation von Feature Importance.
- Negative Ergebnisse sind Ergebnisse. Ehrlich darstellen und erklären.

## Typische Gutachterfragen (für das Challengen)

- Ist das Ergebnis reproduzierbar beschrieben (Mengen, Bedingungen, Geräte, Software-Versionen)?
- Wie groß ist die Unsicherheit, und ist der Unterschied größer als sie?
- Gegen welche Baseline oder Literaturwerte wird verglichen?
- Gilt die Aussage auch außerhalb des untersuchten Datensatzes?
- Welche alternative chemische Erklärung gibt es?

## Sicherheit und Ethik

Gefährliche Synthesen, Toxizität oder Dual-Use-Themen: fachlich korrekt beschreiben,
keine Anleitungen über das in der Arbeit Nötige hinaus. Entsorgung und
Sicherheitshinweise gehören in den Experimentellen Teil, wenn die Gruppe das verlangt.
