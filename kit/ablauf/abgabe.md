# Phase: Abgabe

> Geladen von `/weiter`, wenn `phase` = `abgabe`.
> Ziel: ein fertiges, formal korrektes PDF mit allen Pflichtbestandteilen, rechtzeitig.

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Formalia | Deckblattdaten in projekt.json vollständig |
| 2 Abstract | Abstract und Zusammenfassung in `arbeit/kapitel/00-abstract.md` bzw. `00-zusammenfassung.md` |
| 3 Hilfsmittel | `arbeit/kapitel/99-hilfsmittel.md` existiert und ist mit der Person abgestimmt |
| 4 PDF | `Arbeit.pdf` aktuell und fehlerfrei gebaut |
| 5 Checkliste | alle Punkte unten bestätigt |

## Schritte

1. **Formalia prüfen** (Interview, nur fehlende Werte): Titel exakt wie angemeldet, Name,
   Matrikelnummer, Betreuung und Gutachter mit Titeln, Institut, Abgabedatum, Ort,
   Sperrvermerk ja/nein, Danksagung ja/nein.
2. **Abstract und Zusammenfassung:** zuletzt schreiben (150 bis 300 Wörter, eigenständig
   verständlich, ohne Zitate): Thema, Frage, Methode, zentrale Ergebnisse mit Zahlen,
   Schlussfolgerung. Englisches Abstract und deutsche Zusammenfassung, wenn beide aktiviert.
3. **Hilfsmittelverzeichnis bzw. KI-Erklärung** (Interview, Pflicht bei `verzeichnisse.hilfsmittel`):
   - Grundlage `arbeit/hilfsmittel.md`. Zusammenfassen nach Werkzeug, Zweck, betroffenen Teilen.
   - Vorgaben der Hochschule prüfen (`ki_regeln`, Merkblatt, Formular der Prüfungsordnung).
     Gibt es ein offizielles Formular, dessen Form verwenden.
   - Interview: „Wie ausführlich soll die Erklärung sein?“ (Tabelle nach Werkzeug und Zweck
     (Empfohlen), Fließtext, Vorgabe der Hochschule) und „Welche Eigenleistungen möchtest du
     hervorheben?“ (multiSelect: Fragestellung, Experimente bzw. Daten, Interpretation, Auswahl
     und Bewertung der Quellen, Endredaktion).
   - Ehrlich und vollständig: Was nicht deklariert ist, ist ein Risiko für die Person.
   - Ergebnis nach `arbeit/kapitel/99-hilfsmittel.md`.
4. **Erklärung zur Selbstständigkeit:** Wortlaut laut Prüfungsordnung (Person soll den
   offiziellen Text liefern oder bestätigen). Die Vorlage setzt einen Platzhalter.
5. **PDF bauen:** `/pdf`. Alle Warnungen beheben (fehlende Zitate, undefinierte Verweise,
   überlaufende Zeilen in Tabellen).
6. **Checkliste** (Interview mit multiSelect, was schon erledigt ist):
   - Deckblatt und Titel exakt wie angemeldet
   - Seitenzahlen, Inhaltsverzeichnis, Verzeichnisse vollständig
   - alle Abbildungen lesbar, alle Verweise aufgelöst
   - Literaturverzeichnis vollständig und einheitlich
   - Hilfsmittelverzeichnis und Erklärung unterschrieben (bei Papierabgabe)
   - Abgabeform geklärt (PDF, gebunden, Anzahl Exemplare, Datenträger, Upload-Portal)
   - Rohdaten und Code nach Vorgabe der Arbeitsgruppe archiviert
   - Letzter `/sync` nach dem finalen PDF
7. **Feiern.** Wirklich. Kurz, aber ehrlich gratulieren.

## Fertig, wenn

Person bestätigt die Abgabe. `node kit/werkzeuge/zustand.mjs phase abgabe` ist aktiv, dann
Meilenstein per `zustand.mjs` als erledigt markieren (Abzeichen „Abgegeben“).
