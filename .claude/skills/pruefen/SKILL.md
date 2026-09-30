---
name: pruefen
description: Prüft Kapitel oder die ganze Arbeit mit vier Prüfern (Sprache, Zitattreue, Argumentation mit Notenschätzung, Fach), erstellt bei Bedarf einen Kürzungsplan und setzt Korrekturen nach Freigabe um.
argument-hint: "[kapitelnummer | hauptkapitel | alles | final]"
disable-model-invocation: true
---

# /pruefen: Qualität sichern

## Wann

- Nach dem Entwurf eines Kapitels oder Hauptkapitels.
- In der Phase Prüfen für die ganze Arbeit (`/pruefen alles`).
- Vor der Abgabe als Final-Gate (`/pruefen final`).

## Kontext laden

- `arbeit/projekt.json`, `arbeit/zustand.json` (Kapitel und Status, Wörterziel)
- Die Kapiteldateien aus `kapitel[].datei`
- Wortstand: `node kit/werkzeuge/stand.mjs` (liefert Wörter je Kapitel und gesamt)

## Umfang wählen

Ohne Argument per Interview: „Was soll ich prüfen?“ header „Umfang“
- „<letztes Kapitel mit Status entwurf> (Empfohlen)“
- „Ganzes Hauptkapitel <n>“
- „Die ganze Arbeit“: Hinweis bei Claude Pro: dauert lange und verbraucht viel Kontingent,
  Kapitel einzeln ist sparsamer
- „Final-Gate vor der Abgabe“

Dann: „Welche Prüfungen?“ header „Prüfer“, multiSelect
- „Alle vier (Empfohlen)“, „Sprache“, „Zitattreue“, „Argumentation und Note“ (Fach über Freitext
  oder bei „Alle vier“)

## Prüfen

Je Kapitel die gewählten Subagents: `pruefer-sprache`, `pruefer-zitate`,
`pruefer-argumentation`, `pruefer-fach`. Bei Claude Pro nacheinander bzw. höchstens zwei
gleichzeitig. Ergebnisse zusammenführen nach `arbeit/pruefung/pruefung-<nr>.md`:

```markdown
# Prüfung <nr> · <YYYY-MM-DD>

Notenschätzung: <Argumentation> · Sprache <x> · Fach <y>
Funde: hoch <a>, mittel <b>, niedrig <c>
Umfang: <Ist> von <Soll> Wörtern (<+/-%>)

## Die drei wichtigsten Punkte
1. ...

## Sprache | Zitate | Argumentation | Fach
<Tabellen der Prüfer>
```

`offene_punkte` und `note_schaetzung` des Kapitels in `arbeit/zustand.json` setzen.

## Umfang und Kürzen

Aus der Bachelorarbeit: Die erste Fassung hatte 73 statt 47 Seiten. Kürzen war der größte
Einzelaufwand. Deshalb:
- Überschreitet ein Kapitel sein Budget um mehr als 10 Prozent oder die Arbeit ihr Ziel:
  Kürzungsplan in die Prüfdatei (je Absatz: streichen, zusammenfassen, in den Anhang,
  behalten, mit geschätzter Ersparnis). Redundanzen zwischen Kapiteln zuerst.
- Unterschreitung über 10 Prozent: Stellen nennen, die Tiefe brauchen (meist Diskussion).

## Ergebnis besprechen (Interview)

Die drei wichtigsten Punkte in Klartext zeigen, dann:
„Was soll ich umsetzen?“ header „Korrekturen“
- „Alle hohen und mittleren Funde (Empfohlen)“
- „Nur hohe Funde“
- „Einzeln durchgehen“: je Fund-Gruppe ein Interview (übernehmen, anders, ignorieren)
- „Nichts, nur merken“

Umsetzen mit Subagent `autor` (Modus `ueberarbeiten` bzw. `kuerzen`), dann die geänderten
Stellen erneut vom jeweiligen Prüfer kontrollieren lassen (nur die Funde, nicht alles neu).
Kapitelstatus danach `geprueft`. Freigabe auf `final` per Interview wie bei `/schreiben`.

## Final-Gate (`/pruefen final`)

Hart, vor jeder Abgabe:
- Kein `[BELEG FEHLT]`, keine `TODO`, keine leeren Kapitel.
- Jede Behauptung belegt oder eigenes Ergebnis, jede Abbildung und Tabelle im Text erwähnt.
- Zahlen im Text stimmen mit Tabellen und Daten überein, Zählwörter („drei Faktoren“) stimmen.
- Forschungsfrage wird im Fazit ausdrücklich beantwortet.
- Umfang im Rahmen, alle Kapitel `final`.
- `node kit/werkzeuge/bib.mjs check` fehlerfrei, jede zitierte Quelle in der bib, keine
  ungenutzten Kernquellen ohne Grund.
- Begriffe einheitlich, Abkürzungen alle in `arbeit/begriffe.md`.
- Hilfsmittelprotokoll vollständig.
Ergebnis als Ampel je Punkt in `arbeit/pruefung/final.md`. Rot blockiert die Empfehlung zur Abgabe.

## Zustand

```
node kit/werkzeuge/zustand.mjs kapitel <nr> geprueft
node kit/werkzeuge/zustand.mjs verlauf "Prüfung <nr>: Note ~<x>, <n> Funde umgesetzt"
node kit/werkzeuge/zustand.mjs pruefe-abzeichen
```
`arbeit/hilfsmittel.md`: „Prüfung und Überarbeitung mit Claude Code“.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“
- nächster Schritt (nächstes Kapitel prüfen, zurück zum Schreiben, oder `/weiter`) (Empfohlen)
- „Entwurfs-PDF ansehen“
- „Mit Betreuung besprechen“: Prüfbericht als Gesprächsgrundlage
- „Pause und sichern“
