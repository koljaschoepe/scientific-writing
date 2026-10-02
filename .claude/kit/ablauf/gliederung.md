# Phase: Gliederung

> Geladen von `/weiter`, wenn `phase` = `gliederung`.
> Ziel: verbindliche Gliederung, so tief wie die Person sie will, als Überschriften in den
> Kapiteldateien, mit Seitenanteilen, gesperrten Kernbegriffen und angelegten Kapiteln im Zustand.

Aus der Bachelorarbeit: Das Hauptkapitel musste komplett neu gebaut werden, weil die
Kernbegriffe in der Gliederungsphase nicht festgelegt waren, und die erste Fassung hatte
55 Prozent zu viele Seiten, weil die Budgets nicht verbindlich waren. Beides wird hier verhindert.

## Ergebnis

- Die Gliederung steht **in den Kapiteldateien selbst**: je Schreibeinheit eine Datei in
  `kapitel/`, darin die geplanten Überschriften und unter jeder ein Kommentar mit Kernaussage,
  Kernquellen bzw. Daten (`<!-- Geplant: … -->`). Kommentare zählen nicht als Text.
  Überblick jederzeit: `node .claude/kit/werkzeuge/zustand.mjs gliederung`.
- Eine Datei = eine Schreibeinheit mit Status, auf beliebiger Ebene: ein kleines Kapitel ist eine
  Datei („1 Einleitung“), ein großes ist in Unterkapitel aufgeteilt („3.1“, „3.2“ je Datei).
  Alles unterhalb einer Einheit sind Überschriften in ihrer Datei, keine eigenen Einträge.
- `.arbeit/gliederung/gliederung.md` nur noch für das gewählte Modell und die Begründung
  (optional). Die Struktur selbst steht dort nicht, sonst gäbe es sie zweimal.
- `.arbeit/begriffe.md` mit Kernbegriffen (Spalte „fest“ = ja).
- Alle Einheiten im Zustand (mit Anteil nur, wo er vom Standard abweicht), kapitelgenaue
  Meilensteine in `.arbeit/plan.md`.

## Woran du erkennst, was schon erledigt ist

| Schritt | erledigt, wenn |
| --- | --- |
| 1 Modell | gliederung.md hat ein gewähltes Modell (Kommentar oben) |
| 2 Entwurf | jede Kapiteldatei hat ihre Überschriften mit Kernaussage als Kommentar |
| 3 Umfang | Summe der Anteile 100 %, Seiten passen in `arbeit.seiten` |
| 4 Begriffe | Kernbegriffe mit „fest“ in begriffe.md |
| 5 Zustand | `zustand.mjs zeige` listet alle Kapitel, plan.md hat Meilensteine je Hauptkapitel |
| 6 Freigabe | Meilenstein `gliederung` erledigt |

## Schritte

1. **Modell wählen:** aus `.claude/kit/leitfaeden/fachprofile/<fachprofil>.md` und
   `.claude/kit/leitfaeden/struktur/kapitelmodelle.md` zwei passende Modelle per Interview anbieten
   (mit Beispiel-Gliederung in der Beschreibung). Frage nach einer Beispielarbeit der
   Arbeitsgruppe: wenn ja, deren Aufbau übernehmen.
2. **Entwurf:** Gliederung aus Exposé, Forschungsstand und Unterfragen ableiten. Jede
   Unterfrage muss einem Ergebnis- und einem Diskussionsabschnitt zugeordnet sein.
   Regeln aus `.claude/kit/leitfaeden/struktur/subkapitel-regeln.md` (mindestens zwei Unterkapitel
   pro Ebene, aussagekräftige Titel) und `gewichtung.md`. Die Tiefe bestimmt die Person (und ihre
   Betreuung), nicht das Kit. Per Interview fragen, wie fein sie es vorab haben will.
   **Schnitt in Dateien:** Standard ist eine Datei je Hauptkapitel. Eigene Dateien je
   Unterkapitel nur für große Hauptkapitel (etwa ab 15 Seiten Ziel) oder wenn die Person es will.
   Später geht beides: `zustand.mjs aufteilen <nr>` bzw. `zusammenfuehren <nr>`.
3. **Umfang:** Der Seitenbereich `arbeit.seiten` wird über Anteile auf die Kapitel verteilt.
   Das Kit bringt Standardanteile je Kapiteltyp mit (Richtwerte in `gewichtung.md`). Nur wo
   Fachprofil oder Eigenleistung es verlangen, abweichende Anteile per Interview festlegen.
   Die Seitenziele sind verbindlich (±10 %). Ändert sich später der Seitenbereich, wachsen
   oder schrumpfen alle Ziele mit.
4. **Begriffe sperren:** Kernbegriffe und Abkürzungen per Interview festlegen, besonders
   bei konkurrierenden Bezeichnungen („Modell“ oder „Model“, „Vorhersage“ oder „Prognose“,
   deutsche oder englische Fachbegriffe). In begriffe.md mit „fest: ja“.
5. **Challenge:** roter Faden (`.claude/kit/leitfaeden/struktur/roter-faden.md`), Devil's Advocate:
   Welches Kapitel könnte man streichen, ohne dass die Frage unbeantwortet bleibt? Welches
   fehlt? Ist die Gewichtung auf die Eigenleistung ausgerichtet?
6. **Zustand und Dateien anlegen:** je Schreibeinheit
   `node .claude/kit/werkzeuge/zustand.mjs anlegen <nr> --titel "<Titel>"` (legt den Eintrag und die
   Datei mit Kopfüberschrift an, z. B. `kapitel/03-experimenteller-teil.md` mit `# Experimenteller Teil`).
   Danach in jede Datei die geplanten Überschriften der nächsten Ebenen mit Kommentar schreiben
   (Aufbau: `.claude/rules/latex.md`). Für viele Einheiten auf einmal geht auch
   `zustand.mjs kapitel-setzen -` (JSON-Liste auf stdin, dann die Dateien selbst anlegen).
   Ist ein Hauptkapitel nur in Unterkapitel-Dateien aufgeteilt, seinen Titel mit
   `zustand.mjs hauptkapitel -` setzen (`[{"nr": "3", "titel": "…"}]`, geht auf jeder Ebene).
   Anteile nur dort, wo sie vom Standard abweichen (`--anteil`). Nie `.arbeit/zustand.json` von Hand schreiben.
7. **Meilensteine:** je Hauptkapitel eine Zeile in `.arbeit/plan.md`, z. B.
   `- 2026-12-01 · Methodik Entwurf · kapitel: 3 · status: entwurf`, Daten zwischen heute
   und der Rohfassung verteilt, in der empfohlenen Schreibreihenfolge
   (`.claude/kit/ablauf/schreiben.md`). Per Interview bestätigen lassen.

## Fertig, wenn

Gliederung freigegeben. Danach ist sie gesperrt: Änderungen nur bewusst per Interview mit
Hinweis auf die Folgen für geschriebene Kapitel (Seitenziele, Begriffe, Querbezüge).
Neue Unterabschnitte innerhalb einer Datei sind keine Gliederungsänderung, die darf die Person
jederzeit ergänzen.
Nächste Phase: `schreiben`.
