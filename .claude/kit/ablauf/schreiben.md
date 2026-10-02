# Phase: Schreiben

> Geladen von `/weiter`, wenn `phase` = `schreiben`.
> Ziel: alle Unterkapitel als geprüfte Entwürfe, im Seitenziel, belegt.

## Prinzip

Verschränkt arbeiten: ein Unterkapitel planen, direkt schreiben, freigeben, das nächste.
Kein wochenlanges Vorausplanen ohne Text. Jedes Hauptkapitel nach Fertigstellung prüfen
(`/pruefen <hauptkapitel>`), nicht erst am Ende alles.

## Woran du erkennst, was schon erledigt ist

Kapitelstatus (`zustand.mjs zeige`): offen → geplant → entwurf → geprueft → final. Vorwärts
immer nur einen Schritt. `entwurf` setzt `/schreiben`, `geprueft` setzt `/pruefen` nach der
Prüfung, `final` gibt die Person danach frei.
Der nächste Schritt ist das erste Kapitel in empfohlener Reihenfolge, das nicht mindestens
`entwurf` ist, oder ein Hauptkapitel, dessen Unterkapitel alle `entwurf` sind (dann prüfen).

## Empfohlene Reihenfolge (Naturwissenschaft und Technik)

1. Methoden bzw. Experimenteller Teil (was gemacht wurde, sobald es feststeht)
2. Ergebnisse (sobald Daten vorliegen, Abbildungen zuerst erzeugen)
3. Grundlagen (jetzt ist klar, was wirklich gebraucht wird)
4. Diskussion
5. Einleitung, Zusammenfassung und Ausblick, Abstract zuletzt

Andere Fachprofile: Grundlagen, Hauptteil, Diskussion, Einleitung und Fazit zuletzt.
Die Person kann jederzeit anders wählen (Interview in `/schreiben`).

## Ablauf je Schritt

`/schreiben <nr>` ausführen. Dort stehen Planung, Schreibmodus, Freigabe.

## Daten und Code

- Ergebniskapitel entstehen aus `daten/ergebnisse/`, `abbildungen/`, `.arbeit/tagebuch.md`.
  Fehlen Auswertungen, zuerst diese mit der Person erledigen (Regel `code.md`), dann schreiben.
- Wenn die Arbeit noch Experimente oder Implementierung braucht, ist das normal: Schreiben
  und Forschen laufen parallel. Methodenteil früh schreiben, Ergebnisse nachziehen.

## Laufende Kontrolle

- Nach jedem Kapitel: Meilensteine in `.arbeit/plan.md` gegen den Kapitelstatus. Ist einer
  mehr als eine Woche überfällig, per Interview den Plan anpassen (neue Daten, Seitenbereich,
  Prioritäten, Termin mit Betreuung).
- Nach jedem Hauptkapitel: `/pruefen <hauptkapitel>`.
- Alle 2 bis 3 Kapitel: Entwurfs-PDF anbieten (`/pdf entwurf`), damit die Person sieht,
  wie es aussieht. Das motiviert.
- Betreuung: nach Ergebnissen oder vor großen Entscheidungen ein Gespräch anregen.

## Fertig, wenn

Alle Kapitel mindestens `entwurf`, jedes Hauptkapitel einmal geprüft, Abstract und
Zusammenfassung geschrieben (wenn in `layout.verzeichnisse`). Nächste Phase: `pruefen`.
