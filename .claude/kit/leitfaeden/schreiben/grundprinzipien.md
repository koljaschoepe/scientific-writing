# Grundprinzipien wissenschaftlichen Schreibens

> Hintergrund für Menschen und für die Gliederungsphase. Schwellen und Schalter stehen in
> `stilregeln.md`. Stand: 2026-10-01

## Objektivität
- Keine persönlichen Meinungen ohne Quellenbeleg
- Sachliche Darstellung von Fakten
- Ausgewogene Betrachtung verschiedener Perspektiven
- Eigene Schlussfolgerungen klar als solche kennzeichnen

## Präzision
- Exakte Fachterminologie verwenden
- Begriffe beim ersten Auftreten definieren, danach Abkürzung nutzen
- Muster: "[Begriff] ([Abk.]) bezeichnet [Definition]."
- Keine vagen Formulierungen ("einige", "manche" -> konkret benennen)

## Nachvollziehbarkeit
- Argumentationsschritte klar darlegen
- Jede faktische Behauptung mit Quelle belegen
- Logische Übergänge zwischen Absätzen und Kapiteln
- Keine Gedankensprünge

## Wissenschaftliche Sprache

### Geboten
- Sachlich und neutral formulieren
- Unpersönliche Form, solange `ich_form: nein` gilt
- Quellenbasierte Argumentation
- Präzise Fachterminologie

### Verboten
- Ich-Perspektive (außer bei `ich_form: ja`)
- Journalistische Übertreibungen ("enorm", "phänomenal", "revolutionär")
- Umgangssprachliche Formulierungen
- Persönliche Meinungsäußerungen (außer kritische Würdigung)
- Absolute Aussagen ohne Beleg ("immer", "nie", "alle")

## Zahlen und Statistiken

Zahlen in den Satz integrieren, nicht in Klammern:
```
NEIN: die Ausbeute stieg deutlich (von 42 auf 78 Prozent)
JA:   Die Ausbeute stieg von 42 auf 78 Prozent und hat sich damit fast verdoppelt
```

Interpretation mitliefern:
```
JA: Mit einem mittleren absoluten Fehler von 8 Prozentpunkten liegt das Modell
    unter der Streuung wiederholter Laborversuche [@beispiel2024].
```

Einheiten und Messwerte immer mit siunitx (`\qty{25}{\celsius}`), Unsicherheiten
mit angeben, signifikante Stellen passend zur Messgenauigkeit. Im Fachprofil
Wirtschaft/Sozial gelten Befragungsanteile analog (Anteil, Basis, Quelle).

## Checkliste

- [ ] Ich-Form nur, wenn `ich_form: ja`?
- [ ] Keine Umgangssprache?
- [ ] Keine Übertreibungen?
- [ ] Fachbegriffe definiert?
- [ ] Alle Behauptungen belegt?
- [ ] Schlussfolgerungen nachvollziehbar?
