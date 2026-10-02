---
paths:
  - "code/**"
  - "daten/**"
---

# Code und Daten

Die Person ist keine Programmiererin. Du übernimmst die Technik und erklärst in Klartext,
was passiert und warum.

- Python läuft ausschließlich über uv: `uv run python code/skript.py`, Pakete mit
  `uv add <paket>` im Ordner `code/`. Nie `pip install` global. Gibt es `code/` noch nicht:
  `uv init code` anbieten (per Interview, `technik.python: uv`).
- Rohdaten in `daten/roh/` werden nie verändert. Ergebnisse nach `daten/ergebnisse/`.
- Jedes Skript ist reproduzierbar: feste Zufallsseeds, Pfade relativ zum Projekt, oben
  ein Kommentar mit Zweck, Eingabe, Ausgabe.
- Abbildungen für die Arbeit nach `abbildungen/` als PDF oder PNG (300 dpi), Achsen mit
  Größe und Einheit beschriftet, Schriftgröße lesbar im Satzspiegel.
- Chemie: RDKit für Moleküle, Einheiten SI-konform, Messunsicherheiten mitführen.
- Nach jedem Lauf, der ein Ergebnis für die Arbeit liefert: Eintrag in `.arbeit/tagebuch.md`
  (Datum, Skript, Parameter, Ergebnis, Entscheidung).
- Lange Rechnungen vorher ankündigen (Dauer schätzen) und per Interview bestätigen lassen.
- Nie Daten oder Ergebnisse schönen. Wenn ein Ergebnis gegen die Hypothese spricht,
  sag es deutlich: Das ist ein Befund, kein Fehler.
