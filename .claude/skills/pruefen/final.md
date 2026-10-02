# Abgabe-Check (`/pruefen final`)

Wird nur bei `/pruefen final` geladen. Ergebnis: Ampel je Punkt in `.arbeit/pruefung/final.md`.
Rot blockiert die Empfehlung zur Abgabe.

## Per Werkzeug (zuerst, kein Modell zählt nach)

- `node .claude/kit/werkzeuge/stil.mjs --alle`: kein `[BELEG FEHLT]`, kein TODO in keinem Kapitel.
- `node .claude/kit/werkzeuge/zustand.mjs zeige`: alle Kapitel `final`, keine leeren Kapitel,
  Umfang im Seitenbereich (`arbeit.seiten`), nach dem PDF-Bau mit echten Seiten.
- `node .claude/kit/werkzeuge/bib.mjs check` fehlerfrei, jede zitierte Quelle in der bib.
- `node .claude/kit/werkzeuge/pdf.mjs --json` ohne Fehler und ohne undefinierte Verweise.

## Per Prüfer (nur, was das Werkzeug nicht kann)

- Jede Behauptung belegt oder eigenes Ergebnis, jede Abbildung und Tabelle im Text erwähnt.
- Zahlen im Text stimmen mit Tabellen und Daten.
- Forschungsfrage im Fazit ausdrücklich beantwortet (`pruefer-argumentation`, Auftrag `alles`).
- Begriffe einheitlich, Abkürzungen in `.arbeit/begriffe.md`, Hilfsmittelprotokoll vollständig.

## Datei

```markdown
# Abgabe-Check · <YYYY-MM-DD>

| Punkt | Ampel | Befund |
```

Danach Endausgabe laut `AGENTS.md` und Interview „Wie weiter?“: „Rote Punkte beheben
(Empfohlen)“, „Abgabe vorbereiten“ (Phase abgabe), „Später“.
