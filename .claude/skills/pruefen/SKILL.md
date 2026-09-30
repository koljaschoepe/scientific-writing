---
name: pruefen
description: Prüft Kapitel oder Arbeit auf Sprache, Zitattreue, Argumentation mit Notenschätzung und Fachliches, Final-Gate.
when_to_use: Kapitel prüfen, bewerten, gegenlesen, nach einem Hauptkapitel, vor der Abgabe.
argument-hint: "[nr | hauptkapitel | alles | final]"
gruppe: arbeit
---

# /pruefen: Qualität sichern

**Wichtig:** Prüfer vergleichen mit dem Original, nie mit der Paraphrase. Umfang ±10 %.
Nach umgesetzten Korrekturen Status `geprueft` bleibt, `final` erst nach Freigabe der Person
hier. Bei Claude Pro höchstens zwei Prüfer gleichzeitig. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`: Kapitelnummer (`2.1`), Hauptkapitel (`2`), `alles` oder `final`.

## Kontext laden

- `arbeit/zustand.json` (Kapitel, Status, `woerter_ziel`), Wortstand über
  `node kit/werkzeuge/stand.mjs`
- Die Kapiteldateien aus `kapitel[].datei` liest nur der jeweilige Prüfer, nicht das Hauptgespräch.

## Umfang wählen

Ohne Argument Interview „Was soll ich prüfen?“ header „Umfang“: „<letztes Kapitel im
Status entwurf oder geprueft> (Empfohlen)“, „Ganzes Hauptkapitel <n>“, „Die ganze Arbeit“
(bei Claude Pro teuer, Kapitel einzeln ist sparsamer), „Final-Gate vor der Abgabe“.
Dann „Welche Prüfungen?“ header „Prüfer“, multiSelect: „Alle vier (Empfohlen)“, „Sprache“,
„Zitattreue“, „Argumentation und Note“.

## Prüfen

Je Kapitel die gewählten Subagents `pruefer-sprache`, `pruefer-zitate`,
`pruefer-argumentation`, `pruefer-fach`. Im Auftrag mitgeben: Kapitelnummer, Dateipfad,
Sprache, Fachprofil, Zitierstil. Ergebnisse nach `arbeit/pruefung/pruefung-<nr>.md`:

```markdown
# Prüfung <nr> · <YYYY-MM-DD>

Notenschätzung: <Argumentation> · Sprache <x> · Fach <y>
Funde: hoch <a>, mittel <b>, niedrig <c>
Umfang: <Ist> von <Soll> Wörtern (<+/-%>)

## Die drei wichtigsten Punkte
1. ...

## Sprache | Zitate | Argumentation | Fach
<Tabellen der Prüfer>
```

`node kit/werkzeuge/zustand.mjs kapitel <nr> <status> --note <x> --offen <n>` (Status bleibt).

## Umfang und Kürzen

Über 10 % über Budget: Kürzungsplan in die Prüfdatei (je Absatz streichen, zusammenfassen,
Anhang, behalten, mit Ersparnis). Redundanzen zwischen Kapiteln zuerst. Über 10 % darunter:
Stellen nennen, die Tiefe brauchen.

## Ergebnis besprechen

Endausgabe laut `AGENTS.md`: Satz mit Note und Fundzahl, die drei wichtigsten Punkte als
Stichpunkte, `Geändert:` mit Link zur Prüfdatei. Keine Fundtabellen im Chat, die stehen in
der Datei. Interview „Was soll ich umsetzen?“ header „Korrekturen“: „Alle hohen und
mittleren (Empfohlen)“, „Nur hohe“, „Einzeln durchgehen“, „Nichts, nur merken“.

Umsetzen mit Subagent `autor` (Modus `ueberarbeiten` bzw. `kuerzen`), geänderte Stellen vom
jeweiligen Prüfer nachkontrollieren lassen (nur die Funde). Dann Freigabe-Interview
„<nr> jetzt final?“: „Final (Empfohlen)“ → `zustand.mjs freigeben <nr>`, „Noch
überarbeiten“, „Später“ (bleibt `geprueft`).

## Final-Gate (`final`)

- Kein `[BELEG FEHLT]`, kein `TODO`, keine leeren Kapitel.
- Jede Behauptung belegt oder eigenes Ergebnis, jede Abbildung und Tabelle im Text erwähnt.
- Zahlen im Text stimmen mit Tabellen und Daten, Zählwörter stimmen.
- Forschungsfrage im Fazit ausdrücklich beantwortet.
- Umfang ±10 %, alle Kapitel `final`.
- `node kit/werkzeuge/bib.mjs check` fehlerfrei, jede zitierte Quelle in der bib.
- Begriffe einheitlich, Abkürzungen in `arbeit/begriffe.md`, Hilfsmittelprotokoll vollständig.
Ampel je Punkt nach `arbeit/pruefung/final.md`. Rot blockiert die Empfehlung zur Abgabe.

## Protokoll

`node kit/werkzeuge/zustand.mjs verlauf "Prüfung <nr>: Note ~<x>, <n> Funde umgesetzt"`,
`arbeit/hilfsmittel.md`: „Prüfung und Überarbeitung mit Claude Code“.

## Abschluss-Interview

„Wie weiter?“ header „Weiter“: nächster Schritt (Empfohlen), „Entwurfs-PDF ansehen“,
„Mit Betreuung besprechen“ (Prüfbericht als Grundlage, gern als Word: `/pdf docx`),
„Pause und sichern“.
