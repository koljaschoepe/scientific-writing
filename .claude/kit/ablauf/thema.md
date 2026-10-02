# Phase: Thema

> Geladen von `/weiter`, wenn die Phase `thema` ist.
> Ziel: eine präzise, beantwortbare Forschungsfrage mit klarer Abgrenzung, die in der
> verfügbaren Zeit mit den verfügbaren Daten machbar ist.

## Ergebnis

`.arbeit/thema/thema.md` mit den Abschnitten:
Ausgangslage · Arbeitstitel · Forschungsfrage · Unterfragen bzw. Hypothesen · Ziel ·
Abgrenzung · Methode (grob) · Machbarkeit · Offene Fragen an die Betreuung · Verworfene Varianten

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn in thema.md |
| --- | --- |
| 1 Lage klären | „Ausgangslage“ nennt, ob vorgegeben, grob oder offen |
| 2 Verstehen bzw. Ideen | Abschnitt „Hintergrund“ oder „Varianten“ gefüllt |
| 3 Frage formulieren | „Forschungsfrage“ gefüllt |
| 4 Challenge | „Machbarkeit“ und „Verworfene Varianten“ gefüllt |
| 5 Freigabe | Meilenstein `thema` erledigt |

## Schritt 1: Lage klären

Falls in „Ausgangslage“ noch unklar, Interview (4 Fragen):
1. „Wie ist dein Thema entstanden?“ header „Herkunft“: „Von der Arbeitsgruppe vorgegeben“,
   „Grob mit Betreuung abgesprochen“, „Eigene Idee“, „Noch gar nicht“.
2. „Was steht schon fest?“ header „Fest“, multiSelect: „Titel“, „Daten oder Proben“,
   „Methode oder Software“, „Nichts davon“.
3. „Was interessiert dich daran am meisten?“ header „Interesse“: Optionen aus den Stichworten
   ableiten, sonst „Die Chemie dahinter“, „Die Methode (z. B. KI)“, „Die Anwendung“.
4. „Hast du Material von der Betreuung?“ header „Material“: „Ja, lege ich in den Eingang“,
   „Ja, eine Aufgabenstellung (tippe ich ein)“, „Nein“.

Material aus `quellen/eingang/` lesen (Aufgabenstellung, Paper der Gruppe, Vorarbeiten).

## Zweig A: Thema vorgegeben oder grob umrissen → Schärfen

1. **Verstehen:** In eigenen Worten wiedergeben, was die Aufgabe verlangt, und per Interview
   bestätigen lassen („Stimmt das so?“). Unklare Begriffe erklären, mit Beispiel aus dem Fach.
2. **Schnelle Orientierung:** 5 bis 10 Schlüsselarbeiten über den Subagent `rechercheur`
   (Auftrag: Überblick, Reviews bevorzugt) als Vorschläge ins Board. Kurz zusammenfassen:
   Was ist Stand, wo ist die Lücke, was hat die Gruppe selbst publiziert?
3. **Forschungsfrage formulieren:** drei Formulierungen unterschiedlicher Breite anbieten
   (eng, mittel, breit) per Interview, jeweils mit Konsequenz (Aufwand, Risiko, Ertrag).
4. **Unterfragen bzw. Hypothesen:** 2 bis 4, jede prüfbar. In der Naturwissenschaft:
   Welche Messung oder Rechnung beantwortet welche Unterfrage?
5. **Abgrenzung:** per Interview mit multiSelect festlegen, was bewusst draußen bleibt.

## Zweig B: Thema offen → Finden

1. **Interessen und Möglichkeiten sammeln** (2 Interview-Runden): Fachgebiete, Methoden,
   die Spaß machen, verfügbare Arbeitsgruppe, Geräte, Daten, Zeit, Berufsziel.
2. **Recherche:** je Interessensfeld aktuelle Reviews und offene Fragen suchen (rechercheur).
3. **Drei Varianten** ausarbeiten, je: Arbeitstitel, Frage, Methode, benötigte Daten,
   Risiko, warum spannend. Als Interview zur Wahl stellen (Freitext für eigene Mischung).
4. Gewählte Variante wie Zweig A ab Schritt 3 schärfen.

## Schritt 4: Challenge (Pflicht, beide Zweige)

Nach `.claude/kit/leitfaeden/challenge.md`:
- **Devil's Advocate:** die zwei stärksten Einwände einer Gutachterin gegen die Frage.
- **Machbarkeit:** Zeit (Wochen bis Abgabe minus Schreibzeit von mindestens 6 Wochen bei
  Diplom- und Masterarbeiten), Daten bzw. Proben, Geräte, Rechenzeit, Betreuung.
  Rechne vor: „Du hast 26 Wochen. 8 fürs Schreiben, 2 Puffer, bleiben 16 für Experimente.
  Bei 2 Messreihen pro Woche sind das 32. Reicht das für drei Hypothesen?“
- **So-what-Test:** Was ist gewonnen, wenn das Ergebnis genau wie erwartet ausfällt?
- **Plan B:** Was, wenn die Methode nicht funktioniert oder die Daten nicht reichen?
Interview je Einwand: beibehalten, anpassen (mit Vorschlag), mit Betreuung klären.

## Fertig, wenn

Frage, Unterfragen, Ziel, Abgrenzung, Machbarkeit stehen, Challenge ist dokumentiert.
Freigabe per Interview (siehe `/weiter`). Offene Punkte nach `.arbeit/betreuung/offene-fragen.md`.
`arbeit.titel` in `.arbeit/einstellungen.md` auf den Arbeitstitel setzen.
Nächste Phase: `recherche`.
