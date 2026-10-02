---
name: pruefen
description: Prüft ein Kapitel oder die Arbeit wie eine Gutachterin (Zitattreue, Argumentation mit Note, Sprache, Fach, Umfang). Ändert erst nach Zustimmung.
when_to_use: „Prüf 2.1“, „welche Note wäre das?“, „stimmen meine Zitate?“, nach einem Hauptkapitel, vor der Abgabe. Nicht für direkte Verbesserungen (schreiben).
argument-hint: "[nr | hauptkapitel | alles | final]"
gruppe: arbeit
---

# /pruefen: Qualität sichern

**Wichtig:** Prüfer vergleichen mit dem Original, nie mit der Paraphrase. Jeder Prüfer schreibt
seine Fundliste selbst und gibt nur eine Zeile zurück. Kapiteltext und Fundtabellen liest das
Hauptgespräch nicht. Status: nach der Prüfung `geprueft`, `final` nur danach und nur mit
Zustimmung der Person. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`: Kapitelnummer (`2.1`), Hauptkapitel (`2`), `alles` oder `final`.
Bei `final`: `pruefen/final.md` lesen und befolgen, hier aufhören.

## Kontext laden

`node .claude/kit/werkzeuge/zustand.mjs zeige` (Kapitel, Status, Seiten Ist/Ziel),
`.arbeit/einstellungen.md` (Fachprofil, `technik.abo`). Prüfbar sind Kapitel ab `entwurf`.

## Umfang und Prüfer wählen

Ohne Argument Interview „Was soll ich prüfen?“ header „Umfang“: „<letztes Kapitel im Status
entwurf> (Empfohlen)“, „Ganzes Hauptkapitel <n>“, „Die ganze Arbeit“ (teuer, Kapitel einzeln
ist sparsamer), „Abgabe-Check“ (final).

Dann „Welche Prüfungen?“ header „Prüfer“, multiSelect. Empfohlen sind Zitattreue,
Argumentation und Sprache, Fachliches nur bei Fachprofil Naturwissenschaft oder Technik in
Methoden-, Ergebnis- und Diskussionskapiteln:
„Zitattreue (Empfohlen)“, „Argumentation und Note (Empfohlen)“, „Sprache (Empfohlen)“,
„Fachliches“ (dort mit „(Empfohlen)“, wo es passt).

## Prüfen

Je Kapitel die gewählten Subagents `pruefer-zitate`, `pruefer-argumentation`,
`pruefer-sprache`, `pruefer-fach`. Auftrag: Kapitelnummer, Dateipfad, Seiten Ist/Ziel. Bei
`technik.abo: pro` höchstens zwei gleichzeitig. Jeder schreibt
`.arbeit/pruefung/pruefung-<nr>-<zitate|argumentation|sprache|fach>.md` und antwortet mit
einer Zeile.

Aus den Zeilen die Sammeldatei `.arbeit/pruefung/pruefung-<nr>.md` schreiben, ohne die
Einzeldateien zu lesen:

```markdown
# Prüfung <nr> · <YYYY-MM-DD>

Notenschätzung: <Argumentation> · Sprache <x> · Fach <y>
Funde: hoch <a>, mittel <b>, niedrig <c>
Umfang: <Ist> von <Ziel> Seiten (<+/-%>)

## Die drei wichtigsten Punkte
1. ...

## Einzelberichte
- [Zitate](pruefung-<nr>-zitate.md) · [Argumentation](...) · [Sprache](...) · [Fach](...)
```

`node .claude/kit/werkzeuge/zustand.mjs kapitel <nr> geprueft --note <x> --offen <n>`

## Umfang und Kürzen

Mehr als 10 % über dem Seitenziel: Kürzungsplan in die Sammeldatei (je Absatz streichen,
zusammenfassen, Anhang, behalten, mit Ersparnis in Seiten), Redundanzen zwischen Kapiteln
zuerst. Mehr als 10 % darunter: Stellen nennen, die Tiefe brauchen.

## Ergebnis besprechen

Endausgabe laut `AGENTS.md`: Satz mit Note und Fundzahl, die drei wichtigsten Punkte,
`Geändert:` mit Link zur Sammeldatei. Interview „Was soll ich umsetzen?“ header „Korrekturen“:
„Alle hohen und mittleren (Empfohlen)“, „Nur hohe“, „Einzeln durchgehen“, „Nichts, nur merken“.

Umsetzen mit Subagent `autor` (Modus `ueberarbeiten` bzw. `kuerzen`, Pfade der Prüfdateien im
Auftrag). Danach denselben Prüfer nur die betroffenen Funde nachkontrollieren lassen. Dann
Interview „<nr> jetzt final?“: „Final (Empfohlen)“ → `zustand.mjs freigeben <nr>`,
„Noch überarbeiten“, „Später“ (bleibt `geprueft`).

## Protokoll

`node .claude/kit/werkzeuge/zustand.mjs verlauf "Prüfung <nr>: Note ~<x>, <n> Funde umgesetzt"`,
`.arbeit/hilfsmittel.md`: „Prüfung und Überarbeitung mit Claude Code“.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“: nächster Schritt (Empfohlen), „Entwurfs-PDF ansehen“,
„Mit Betreuung besprechen“ (Prüfbericht als Grundlage, gern als Word: `/pdf docx`),
„Pause und sichern“.
