# Formeln, Einheiten und chemische Notation

> Formatierungsregeln für naturwissenschaftliche Arbeiten, besonders Chemie.
> Gilt für alle Texte in `arbeit/kapitel/`. Technische Schreibweise: `.claude/rules/latex.md`.
> Stand: 2026-09-30 · Grundlage: IUPAC-Empfehlungen (Green Book, 3. Aufl.; Nomenklatur-Empfehlungen), SI-Broschüre (9. Aufl.), Paketdokumentationen siunitx v3, mhchem v4, chemfig

Wann brauchst du das? Beim Schreiben und Prüfen jedes Abschnitts mit Zahlen, Einheiten,
Formeln, Reaktionen, Abbildungen oder Tabellen. Der Fachprüfer in `/pruefen` prüft danach.

## 1. Zahlen und Einheiten (siunitx)

| Fall | Schreibweise im Markdown | Ergebnis (deutsch) |
| --- | --- | --- |
| Zahl mit Einheit | `\qty{5.0}{\milli\litre}` | 5,0 mL |
| Temperatur | `\qty{80}{\celsius}`, `\qty{298.15}{\kelvin}` | 80 °C, 298,15 K |
| Konzentration | `\qty{0.1}{\mol\per\litre}` oder `\qty{0.1}{\Molar}` nur wenn Fachgruppe M nutzt | 0,1 mol/L |
| Messunsicherheit | `\qty{12.3(4)}{\milli\gram}` bzw. `\qty{12.3 +- 0.4}{\milli\gram}` | 12,3(4) mg |
| Bereich | `\qtyrange{20}{25}{\celsius}` | 20 °C bis 25 °C |
| Große/kleine Zahl | `\num{1.5e-3}`, `\num{6.022e23}` | 1,5 · 10⁻³ |
| Nur Einheit | `\unit{\kilo\joule\per\mole}` | kJ/mol |
| Prozent | `\qty{95}{\percent}` | 95 % |

Regeln:
- In `\qty` und `\num` immer Punkt als Dezimaltrenner. Die Ausgabe wird automatisch deutsch
  (Komma) bzw. englisch (Punkt), je nach `arbeit.sprache`.
- Zwischen Zahl und Einheit steht immer ein Leerzeichen, das setzt siunitx. Ausnahme: Grad
  als Winkel (`\ang{30}`).
- Einheiten aufrecht, Größen kursiv: $m$ (Masse) vs. m (Meter). Größensymbole in `$...$`.
- Liter: `\litre` ergibt L (Großbuchstabe, in der Chemie üblich). Einheitlich bleiben.
- Keine veralteten Einheiten (kcal, Å nur wenn fachüblich und erklärt, ppm nur für NMR).
- Signifikante Stellen passend zur Messgenauigkeit. Nicht mehr Nachkommastellen als die
  Messung hergibt, auch wenn die Software mehr ausgibt.

## 2. Formeln und Gleichungen

- Inline für kurze Ausdrücke: `$K_\mathrm{d} = \frac{[A][B]}{[AB]}$`.
- Abgesetzt und nummeriert, wenn später darauf verwiesen wird:
  `$$\Delta G^\circ = -RT \ln K$$ {#eq:gibbs-k}`, im Text `\cref{eq:gibbs-k}`.
- Indizes, die Wörter oder Abkürzungen sind, aufrecht: `$c_\mathrm{max}$`, `$T_\mathrm{m}$`.
  Laufindizes kursiv: `$x_i$`.
- Jede Größe wird bei ihrer ersten Verwendung erklärt, direkt nach der Formel
  („mit $R$ als universeller Gaskonstante“) oder im Formelzeichenverzeichnis
  (`arbeit/begriffe.md`, Tabelle mit Spalte „Symbol“).
- Satzzeichen nach einer abgesetzten Formel gehören zum Satz, stehen also in der Formel.
- Vektoren fett (`$\mathbf{x}$`), Matrizen fett groß (`$\mathbf{W}$`), in ML-Kapiteln
  einheitlich bleiben.

## 3. Chemische Formeln und Reaktionen (mhchem)

| Fall | Schreibweise | Hinweis |
| --- | --- | --- |
| Summenformel | `\ce{C6H12O6}` | Ziffern werden automatisch tiefgestellt |
| Ionen | `\ce{SO4^2-}`, `\ce{Fe^3+}` | Ladung nach `^` |
| Isotope | `\ce{^{13}C}`, `\ce{^{2}H}` | |
| Reaktion | `\ce{2 H2 + O2 -> 2 H2O}` | Pfeil `->` |
| Gleichgewicht | `\ce{A <=> B}` | |
| Bedingungen am Pfeil | `\ce{A ->[\text{Pd(0)}][\qty{80}{\celsius}] B}` | oben/unten |
| Aggregatzustand | `\ce{NaCl(aq)}`, `\ce{H2O(l)}` | |
| Komplexe | `\ce{[Cu(NH3)4]^2+}` | |
| Hydrate | `\ce{CuSO4 * 5 H2O}` | `*` ergibt den Punkt |

Regeln:
- Jede chemische Formel im Text mit `\ce{}`, auch im Fließtext und in Tabellen.
- Nummerierte Reaktionsgleichung: `$$\ce{A + B -> C}$$ {#eq:r1}`.
- Verbindungen im Text: beim ersten Auftreten der Name nach IUPAC (oder der etablierte
  Trivialname mit IUPAC-Name in Klammern), danach Formel, Abkürzung oder fette Nummer
  (**1**, **2a**) konsequent gleich. Abkürzungen ins Abkürzungsverzeichnis.
- Stereodeskriptoren kursiv: *R*, *S*, *E*, *Z*, *cis*, *trans*, *tert*-Butyl, *n*-Hexan.
- Elementsymbole nie kursiv.

## 4. Strukturformeln

- Erste Wahl: Zeichnung in ChemDraw, ChemSketch oder MarvinSketch, exportiert als PDF oder
  SVG→PDF nach `abbildungen/`, eingebunden als Abbildung. Einheitlicher Stil (ACS
  Document 1996 ist in ChemDraw voreingestellt und in der Chemie Standard).
- Für einfache Moleküle direkt im Text mit chemfig:
  `\chemfig{*6((-OH)=-=-=-)}` (Phenol). Nur wenn die Person das ausdrücklich möchte,
  komplexe Strukturen werden mit chemfig schnell unlesbar.
- SMILES aus der Datenarbeit (RDKit) lassen sich im Code-Teil zu Bildern rendern
  (`rdkit.Chem.Draw.MolToFile`), dann als Abbildung einbinden.

## 5. Abbildungen

- Jede Abbildung hat eine Beschriftung, die ohne den Text verständlich ist: was ist
  dargestellt, unter welchen Bedingungen, was bedeuten Farben und Fehlerbalken.
- Beschriftung unter der Abbildung (macht die Vorlage automatisch).
- Achsen immer mit Größe und Einheit: „Temperatur / °C“ oder „$T$ / K“ (Größe durch Einheit,
  IUPAC-Stil). Keine Einheit in eckigen Klammern, wenn die Fachgruppe den IUPAC-Stil nutzt.
- Plots aus Python (matplotlib) als PDF speichern, Schriftgröße im Plot passend zum Text
  (8 bis 10 pt bei Endgröße), keine Titel im Plot (der steht in der Beschriftung).
- Fremde Abbildungen nur mit Quellenangabe in der Beschriftung („nach [@key]“ bzw.
  „aus [@key]“) und nur, wenn die Nutzung rechtlich zulässig ist.
- Im Text immer mit `\cref{fig:...}` verweisen, vor dem ersten Erscheinen.

## 6. Tabellen

- Beschriftung über der Tabelle (macht die Vorlage automatisch), Nummerierung durchgehend.
- Keine senkrechten Linien, nur die drei waagerechten (booktabs, automatisch).
- Einheiten in den Spaltenkopf, nicht in jede Zelle: „Ausbeute / %“.
- Zahlen in einer Spalte mit gleicher Anzahl Nachkommastellen, rechtsbündig (`---:`
  in der Pipe-Tabelle).
- Fußnoten zu Tabellen (Bedingungen, Abkürzungen) als Satz unter der Tabelle.

## 7. Experimenteller Teil

- Reproduzierbarkeit ist das Kriterium: Mengen (Masse, Stoffmenge, Äquivalente), Reinheit
  und Bezugsquelle der Chemikalien, Geräte mit Hersteller und Modell, Bedingungen
  (Temperatur, Zeit, Atmosphäre), Aufarbeitung, Ausbeute (Masse und Prozent).
- Analytik im fachüblichen Format, z. B. NMR: „¹H-NMR (400 MHz, CDCl₃): δ = 7,26 (s, 1H)“.
  Frequenz, Lösungsmittel, Multiplizität und Integral immer angeben.
- Bei computational/ML-Arbeiten gilt dasselbe für Software und Daten: Versionen
  (Python, Pakete, aus `code/pyproject.toml`), Hardware, Zufalls-Seeds, Datensatz mit Quelle
  und Aufteilung (Training/Validierung/Test), Hyperparameter, Metriken mit Definition.
- Passiv oder unpersönlich, Vergangenheit: „Die Lösung wurde ... gerührt.“

## 8. Häufige Fehler, auf die der Fachprüfer achtet

- Einheit fehlt oder ist falsch formatiert (5mL, 5 ml, 5,0mL ohne siunitx).
- Zu viele signifikante Stellen (R² = 0,923847).
- Formelzeichen nicht eingeführt.
- Chemische Formel ohne Tiefstellung (H2O im Fließtext).
- Abbildung ohne Verweis im Text oder Beschriftung ohne Aussage.
- Metrik ohne Definition (MAE, RMSE, R²) oder ohne Vergleichswert (Baseline).
- „Signifikant“ ohne statistischen Test.
