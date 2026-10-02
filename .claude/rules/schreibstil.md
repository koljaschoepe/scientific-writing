---
paths:
  - "kapitel/**"
  - ".arbeit/expose/**"
  - ".arbeit/thema/**"
---

# Schreibstil für Arbeitstexte

Gilt für alles, was in die Arbeit eingeht. Sprache: `arbeit.sprache` in `.arbeit/einstellungen.md`.

- Vor dem Schreiben: `.arbeit/einstellungen.md` (Abschnitt Stil), `.arbeit/stil.md`,
  `.arbeit/begriffe.md`, `.claude/kit/leitfaeden/schreiben/stilregeln.md`, Fachprofil
  `.claude/kit/leitfaeden/fachprofile/<arbeit.fachprofil>.md`. Englisch zusätzlich
  `.claude/kit/leitfaeden/englisch/grundregeln.md`.
- Schwellen und Schalter nur aus `stilregeln.md` und den Einstellungen. Nach dem Schreiben
  `node .claude/kit/werkzeuge/stil.mjs <datei>` laufen lassen statt selbst zu zählen.
- Eigene Messungen und Ergebnisse aus `daten/` belegen sich über Abbildung, Tabelle oder
  Methodenteil, fremde Aussagen mit `[@bibkey]`.
- Umfang in Seiten laut Kapitelziel (`zustand.mjs zeige`), Abweichung über 10 % melden.
