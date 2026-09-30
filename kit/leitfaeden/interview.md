# Leitfaden: Interviews mit AskUserQuestion

> Wann brauchst du das? Immer, wenn du etwas von der Person wissen oder sie etwas
> entscheiden lassen willst. Die Pflicht selbst steht in `.claude/rules/interview.md`.

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
```

## Gute Fragen

- **Eine Entscheidung pro Frage.** Nicht „Thema und Methode?“.
- **Optionen mit Folgen.** „Literaturarbeit: keine eigenen Daten, dafür mehr Quellen
  (etwa 60 bis 80)“ statt nur „Literaturarbeit“.
- **Echte Alternativen.** Keine Strohmann-Optionen, damit die Empfehlung gut aussieht.
- **Empfehlung begründen.** Warum ist sie für genau diese Person besser?
- **Freitext mitdenken.** Bei Namen, Titeln, Daten ist die Antwort fast immer Freitext.
  Biete Beispielwerte als Hinweis an, z. B. „z. B. 15.07.2027“ und „Später klären“.
- **Bündeln.** Zusammengehörige Fragen in einen Aufruf (bis 4), damit die Person nicht
  zehnmal klicken muss.
- **Nachhaken statt raten.** Ist eine Antwort vage („irgendwas mit KI“), stelle eine
  Folgefrage mit konkreten Deutungen als Optionen.

## Muster

### Freigabe eines Textes
- „Wie findest du den Entwurf von 2.1?“ (header „Freigabe“)
  - „Freigeben (Empfohlen)“: Status final, weiter mit 2.2
  - „Überarbeiten“: du sagst im Freitext, was anders soll
  - „Gemeinsam durchgehen“: Absatz für Absatz mit Rückfragen
  - „Später“: bleibt Entwurf, wir machen woanders weiter

### Unsicherheit der Person
- „Du bist unsicher bei der Methode. Soll ich erst recherchieren, wie andere das gemacht haben?“
  - „Ja, 3 Beispiele aus der Literatur (Empfohlen)“
  - „Erklär mir die Optionen einfach“
  - „Ich frage meinen Betreuer“: kommt auf die Liste für das nächste Treffen

### Nächster Schritt
- „Wie geht es weiter?“ (header „Weiter“)
  - „<nächster Schritt laut Phase> (Empfohlen)“
  - „<sinnvolle Alternative>“
  - „Pause, Stand sichern“: /sync vorschlagen
  - „Etwas anderes“: sie tippt

## Anti-Muster

- Fragen als Fließtext am Ende einer Antwort („Soll ich weitermachen?“).
- Ja/Nein-Fragen, wenn es eigentlich drei Wege gibt.
- Optionen, die technische Begriffe voraussetzen (Branch, Commit, Rebase). Übersetze.
- Mehr als eine Runde Fragen, deren Antworten du aus den Dateien lesen könntest.
