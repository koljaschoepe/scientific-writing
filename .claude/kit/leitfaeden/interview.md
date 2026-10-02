# Leitfaden: Interviews

> Wann brauchst du das? Immer, wenn du etwas von der Person wissen oder sie etwas
> entscheiden lassen willst. Die Kurzregel steht in `AGENTS.md`, hier die Details.
> Das Rückfrage-Tool heißt in Claude Code `AskUserQuestion`.

## Wann ein Interview, wann nicht

| Anlass | Interview? |
| --- | --- |
| Entscheidung über die Arbeit (Thema, Frage, Methode, Gliederung, Quelle, Stil) | ja |
| Freigabe eines Textes oder Meilensteins | ja |
| Aufgabe beendet, die Dateien geändert hat | ja, als Abschluss („Wie weiter?“) |
| Reine Sachfrage oder Erklärung („Was ist ein Graph Neural Network?“) | nein, einfach antworten |
| Technische Kleinigkeit, die die Person nicht entscheiden muss | nein, selbst erledigen |
| Erste Antwort einer Session auf eine eindeutige Aufgabe | nein |

Subagents können nicht fragen. Sie liefern Ergebnisse, das Hauptgespräch stellt die Fragen.
Bricht die Person ein Interview ab, akzeptiere das und sag in zwei Sätzen, wo sie steht und
womit sie weitermachen kann.

## Grundmuster

```
AskUserQuestion
  questions: 1 bis 4
    question:    ganze Frage mit Fragezeichen, Kontext in einem Halbsatz
    header:      höchstens 12 Zeichen ("Thema", "Frist", "Freigabe")
    multiSelect: false, außer die Optionen schließen sich nicht aus
    options:     2 bis 4
      label:       1 bis 5 Wörter, Empfehlung zuerst mit "(Empfohlen)"
      description: was dann passiert, welche Konsequenz, welcher Aufwand
      preview:     optional, kleine ASCII-Skizze für Varianten
```

- Keine eigene Option „Sonstiges“: Freitext bietet das Tool automatisch an.
- Empfiehl nur mit Grund und nenne ihn in der Beschreibung.
- Wo die Person noch nicht entscheiden kann: „Später klären“.

## Gute Fragen

- **Eine Entscheidung pro Frage.** Nicht „Thema und Methode?“.
- **Optionen mit Folgen.** „Literaturarbeit: keine eigenen Daten, dafür mehr Quellen
  (etwa 60 bis 80)“ statt nur „Literaturarbeit“.
- **Echte Alternativen.** Keine Strohmann-Optionen, damit die Empfehlung gut aussieht.
- **Freitext mitdenken.** Bei Namen, Titeln, Daten ist die Antwort fast immer Freitext.
  Biete Beispielwerte als Hinweis an, z. B. „z. B. 2027-07-15“ und „Später klären“.
- **Bündeln.** Zusammengehörige Fragen in einen Aufruf (bis 4).
- **Nachhaken statt raten.** Ist eine Antwort vage („irgendwas mit KI“), stelle eine
  Folgefrage mit konkreten Deutungen als Optionen.

## Muster

### Freigabe eines Textes
- „Wie findest du den Entwurf von 2.1?“ (header „Freigabe“)
  - „Freigeben (Empfohlen)“: Status geprüft bzw. final, weiter mit 2.2
  - „Überarbeiten“: du sagst im Freitext, was anders soll
  - „Gemeinsam durchgehen“: Absatz für Absatz mit Rückfragen
  - „Später“: bleibt Entwurf

### Unsicherheit der Person
- „Du bist unsicher bei der Methode. Soll ich erst recherchieren, wie andere das gemacht haben?“
  - „Ja, 3 Beispiele aus der Literatur (Empfohlen)“
  - „Erklär mir die Optionen einfach“
  - „Ich frage meine Betreuung“: kommt auf die Liste für das nächste Treffen

### Nächster Schritt (Abschluss)
- „Wie geht es weiter?“ (header „Weiter“)
  - „<nächster Schritt laut Phase> (Empfohlen)“
  - „<sinnvolle Alternative>“
  - „Pause, Stand sichern“: /sync vorschlagen

## Anpassen an die Person

Merkst du, dass die Person bei einem Thema mehr oder weniger Rückfragen will, trage es still
unter „So arbeite ich“ in `.arbeit/stil.md` ein (eine Zeile, mit Datum). Weniger nachfragen
heißt nie, inhaltliche Entscheidungen über ihre Arbeit ohne sie zu treffen.

## Anti-Muster

- Fragen als Fließtext am Ende einer Antwort („Soll ich weitermachen?“).
- Ein Interview nach einer reinen Erklärung.
- Ja/Nein-Fragen, wenn es eigentlich drei Wege gibt.
- Optionen, die technische Begriffe voraussetzen (Branch, Commit, Rebase). Übersetze.
- Mehr als eine Runde Fragen, deren Antworten du aus den Dateien lesen könntest.
- Vor dem Interview lange Zusammenfassungen. Endausgabe-Format laut `AGENTS.md`.
