# Phase: Gliederung

> Geladen von `/weiter`, wenn `phase` = `gliederung`.
> Ziel: verbindliche Gliederung bis zur zweiten Ebene mit Seitenbudget je Unterkapitel,
> gesperrten Kernbegriffen und angelegten Kapiteln im Zustand.

Aus der Bachelorarbeit: Das Hauptkapitel musste komplett neu gebaut werden, weil die
Kernbegriffe in der Gliederungsphase nicht festgelegt waren, und die erste Fassung hatte
55 Prozent zu viele Seiten, weil die Budgets nicht verbindlich waren. Beides wird hier verhindert.

## Ergebnis

- `arbeit/gliederung/gliederung.md`: nummerierte Gliederung, je Unterkapitel eine Zeile
  Kernaussage, Budget in Wörtern und Seiten, zugeordnete Kernquellen bzw. Daten.
- `arbeit/begriffe.md` mit Kernbegriffen (Spalte „fest“ = ja).
- `arbeit/zustand.json → kapitel[]` mit allen Unterkapiteln.

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Modell | gliederung.md hat ein gewähltes Modell (Kommentar oben) |
| 2 Entwurf | alle Unterkapitel mit Kernaussage |
| 3 Budget | Summe der Budgets = `woerter_ziel` ±10 % |
| 4 Begriffe | Kernbegriffe mit „fest“ in begriffe.md |
| 5 Zustand | `kapitel[]` in zustand.json gefüllt |
| 6 Freigabe | Meilenstein `gliederung` erledigt |

## Schritte

1. **Modell wählen:** aus `kit/leitfaeden/fachprofile/<fachprofil>.md` und
   `kit/leitfaeden/struktur/kapitelmodelle.md` zwei passende Modelle per Interview anbieten
   (mit Beispiel-Gliederung in der Beschreibung). Frage nach einer Beispielarbeit der
   Arbeitsgruppe: wenn ja, deren Aufbau übernehmen.
2. **Entwurf:** Gliederung aus Exposé, Forschungsstand und Unterfragen ableiten. Jede
   Unterfrage muss einem Ergebnis- und einem Diskussionsabschnitt zugeordnet sein.
   Regeln aus `kit/leitfaeden/struktur/subkapitel-regeln.md` (mindestens zwei Unterkapitel
   pro Ebene, aussagekräftige Titel) und `gewichtung.md`.
3. **Budget:** Wörterziel auf Kapitel verteilen (Richtwert: Einleitung 8 %, Grundlagen 20 %,
   Methoden 15 %, Ergebnisse und Diskussion 45 %, Fazit 7 %, Rest Puffer; nach Fachprofil
   anpassen). Budgets sind verbindlich (±10 %).
4. **Begriffe sperren:** Kernbegriffe und Abkürzungen per Interview festlegen, besonders
   bei konkurrierenden Bezeichnungen („Modell“ oder „Model“, „Vorhersage“ oder „Prognose“,
   deutsche oder englische Fachbegriffe). In begriffe.md mit „fest: ja“.
5. **Challenge:** roter Faden (`kit/leitfaeden/struktur/roter-faden.md`), Devil's Advocate:
   Welches Kapitel könnte man streichen, ohne dass die Frage unbeantwortet bleibt? Welches
   fehlt? Ist die Gewichtung auf die Eigenleistung ausgerichtet?
6. **Zustand anlegen:** Für jedes Unterkapitel einen Eintrag in `arbeit/zustand.json → kapitel[]`
   (Schema in `kit/SPEC.md`): `nr`, `titel`, `hauptkapitel`, `datei`
   (`arbeit/kapitel/<nr-mit-bindestrich>-<slug>.md`), `status: "offen"`, `woerter_ziel`,
   `note_schaetzung: null`, `offene_punkte: 0`. Hauptkapitel ohne Unterkapitel bekommen einen
   Eintrag mit `nr` = Hauptkapitelnummer. Datei vorher lesen, gezielt ergänzen, gültiges JSON schreiben.

## Fertig, wenn

Gliederung freigegeben. Danach ist sie gesperrt: Änderungen nur bewusst per Interview mit
Hinweis auf die Folgen für geschriebene Kapitel (Budget, Begriffe, Querbezüge).
Nächste Phase: `schreiben`.
