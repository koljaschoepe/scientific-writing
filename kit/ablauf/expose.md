# Phase: Exposé

> Geladen von `/weiter`, wenn `phase` = `expose`.
> Ziel: ein Dokument von 2 bis 5 Seiten für die Betreuung, das Frage, Stand der Forschung,
> Methode, Gliederungsentwurf, Zeitplan und Risiken überzeugend darlegt. Erster großer Meilenstein.

## Ergebnis

- `arbeit/expose/expose.md` nach `kit/vorlagen/expose.md`
- `arbeit/expose/expose.pdf`
- Termine und Meilensteine aus dem Zeitplan in `arbeit/plan.json`

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Rahmen | Formvorgaben der Betreuung geklärt (in expose.md als Kommentar oben) |
| 2 Entwurf | alle Abschnitte der Vorlage gefüllt |
| 3 Challenge | Abschnitt „Risiken“ und „Offene Fragen“ gefüllt, Prüfung dokumentiert |
| 4 PDF | expose.pdf existiert |
| 5 Freigabe | Meilenstein `expose` erledigt |

## Schritte

1. **Rahmen klären** (Interview): Gibt es Vorgaben der Betreuung (Länge, Gliederung, Sprache,
   Abgabeform)? Wann ist das Gespräch? Ist ein Zeitplan gewünscht?
2. **Entwurf:** Aus `arbeit/thema/thema.md` und `arbeit/thema/forschungsstand.md` die Abschnitte
   schreiben (Schreibmodus beachten, im Modus coach nur Stichpunkte und Leitfragen).
   - Gliederungsentwurf nach Fachprofil (`kit/leitfaeden/fachprofile/`).
   - **Zeitplan rückwärts** von der Abgabe: Puffer 2 Wochen, Korrektur und Layout 2 Wochen,
     Schreiben je nach Umfang 6 bis 10 Wochen, Rest für Experimente bzw. Implementierung.
     Meilensteine (Exposé, Gliederung, Ergebnisse, Rohfassung, Abgabe) als `art: frist` in
     `arbeit/plan.json` eintragen, nach Bestätigung per Interview.
   - Zitate als `[@bibkey]`.
3. **Challenge:** Gegen die Bewertungskriterien lesen (`kit/leitfaeden/bewertungskriterien.md`),
   die drei Fragen formulieren, die die Betreuung am wahrscheinlichsten stellt, und im
   Abschnitt „Offene Fragen an die Betreuung“ die Entscheidungen, die sie treffen muss.
   Kurze Sprach- und Zitatprüfung wie in `/pruefen` (nur hohe Funde).
4. **PDF:** `/pdf expose` (`node kit/werkzeuge/pdf.mjs expose --json`) schreibt
   `arbeit/expose/expose.pdf`. Kommentiert die Betreuung lieber in Word, zusätzlich
   `/pdf docx` anbieten.
5. **Betreuungsgespräch vorbereiten:** `arbeit/betreuung/<datum>.md` aus
   `kit/vorlagen/betreuung.md` mit Entscheidungen, Fragen, Tendenzen.

## Nach dem Gespräch

Beim nächsten `/weiter` fragen: „Wie lief das Gespräch mit deiner Betreuung?“ und Beschlüsse
ins Protokoll, Änderungen in thema.md und Exposé übernehmen. Erst dann Meilenstein freigeben,
wenn die Person das will (Option „Exposé ist abgenommen“).

## Fertig, wenn

Exposé freigegeben, idealerweise nach Rückmeldung der Betreuung. Nächste Phase: `gliederung`.
