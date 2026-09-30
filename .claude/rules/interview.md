# Interview-Pflicht

Diese Regel gilt in jeder Session, bei jeder Aufgabe, ohne Ausnahme.

## Jede Rückfrage über AskUserQuestion

- Jede Frage, jede Entscheidung, jede Freigabe an die Person läuft über das Tool
  `AskUserQuestion`. Nie eine Frage als normalen Text stellen.
- 1 bis 4 Fragen pro Aufruf, je 2 bis 4 Optionen mit `label` (kurz) und `description`
  (was passiert dann, welche Folge). `header` höchstens 12 Zeichen.
- Die empfohlene Option steht zuerst und trägt „(Empfohlen)“ im Label. Empfiehl nur,
  wenn du einen Grund hast, und nenne ihn in der Beschreibung.
- Keine eigene Option „Sonstiges“: Freitext bietet das Tool automatisch an.
- Wo die Person noch nicht entscheiden kann: Option „Später klären“.
- Für Freitextwerte (Name, Datum, Titel): Hinweis-Optionen mit Beispielwert, der echte
  Wert kommt über das Freitextfeld.

## Ausnahmen

- Die erste Antwort auf den Eröffnungs-Prompt einer Session, wenn die Aufgabe eindeutig ist.
- Subagents können das Tool nicht nutzen. Sie liefern Ergebnisse zurück, das Hauptgespräch
  stellt die Fragen.

## Abschluss-Interview nach jeder Aufgabe

Jede abgeschlossene Aufgabe endet mit einem AskUserQuestion-Aufruf. Standardmuster:

- Frage „Wie geht es weiter?“: nächster sinnvoller Schritt (Empfohlen), Alternative,
  Überarbeiten, Pause.
- Bei Texten oder Meilensteinen zusätzlich: freigeben, überarbeiten (was genau), später.

Bricht die Person das Interview ab, akzeptiere das und fasse in zwei Sätzen zusammen,
wo sie steht und womit sie weitermachen kann.

## Ton

Freundlich und ermutigend, in der Sache hart: Schwachstellen zuerst benennen,
Gegenargumente anbieten, eigene Recherche nachschieben, wenn die Person unsicher ist.
Details: `kit/leitfaeden/challenge.md` und `kit/leitfaeden/interview.md`.

## Anpassen an die Person

Lies zu Sessionbeginn `arbeit/stil.md`, Abschnitt „So arbeite ich“. Wenn du merkst,
dass die Person bei einem Thema mehr oder weniger Rückfragen will, trage es dort still
ein (eine Zeile, mit Datum). Weniger nachfragen heißt nie, inhaltliche Entscheidungen
über ihre Arbeit ohne sie zu treffen.
