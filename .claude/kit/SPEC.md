# Spezifikation Scientific Writing Kit v3

> Interne Bauanleitung. Verbindlich für alle, die am Kit bauen (Mensch oder Agent).
> Stand: 2026-10-02
> Schemata stehen in ihren Quellen, nicht hier: Einstellungen und Plan in
> `.claude/kit/vorlagen/arbeit/`, Server und Oberfläche in `.claude/kit/dashboard/API.md`,
> Werkzeuge im Kopfkommentar jeder `.mjs`-Datei, Befehle in der Frontmatter der Skills.

## Zielbild

Ein Claude-Code-Template, mit dem eine nicht technische Person ihre gesamte wissenschaftliche
Arbeit entwickelt: Themenfindung, Recherche, Exposé, Gliederung, Schreiben (inklusive Daten
und Code), Prüfung, PDF. Erste Nutzerin: Chemie-Diplomandin, Windows, Claude Pro, erstmals
Claude Code, VS Code mit Claude-Extension. Das Kit bleibt ein allgemeines Template für jede
Person und jede Hochschule. Hochschulspezifisches steht nur in `.arbeit/einstellungen.md`.

## Nicht verhandelbare Prinzipien

1. **Windows und macOS gleichwertig.** Werkzeuge und Hooks sind Node-Skripte (`.mjs`, nur
   Built-ins, Node 20 oder neuer). Kein bash, python3 oder jq in Hooks. Pfade über `path.join`.
   Prozesse mit `spawn` ohne Shell, wo möglich, `.cmd`-Programme unter Windows über `cmd /c`.
2. **Drei Bereiche, die nie ineinandergreifen** (siehe unten). `/update` fasst nur das Kit an.
3. **Dateien sind die Wahrheit, das Dashboard ist eine Ansicht.** Kein Fakt wird doppelt
   gepflegt. Gerätelokales liegt in `.lokal/`, nie in synchronisierten Dateien.
4. **Interviews mit Maß.** Rückfragen nur über das Rückfrage-Tool (1 bis 4 Fragen, je 2 bis 4
   Optionen, Empfehlung zuerst). Interviews laufen im Hauptgespräch, Subagents fragen nie.
   Details: `.claude/kit/leitfaeden/interview.md`.
5. **Challenge, freundlich.** Ermutigend im Ton, hart in der Sache, Schwachstelle zuerst.
   Das volle Protokoll (`challenge.md`) nur an echten Weichen.
6. **Zählbares zählt ein Skript.** Seiten, Stilschwellen, `[BELEG FEHLT]`, DOIs, Status:
   Werkzeuge liefern Ergebnisse, kein Modell zählt nach.
7. **Eine Quelle je Regel.** Stilschalter in `.arbeit/einstellungen.md` (Standard aus der
   Vorlage), Schwellen und ihre Bedeutung in `.claude/kit/leitfaeden/schreiben/stilregeln.md`.
   Agents und Rules verweisen dorthin, statt Regeln zu kopieren.
8. **Kontext ist knapp.** `AGENTS.md` + `.claude/CLAUDE.md` ohne HTML-Kommentare unter
   4.500 Zeichen. Erklärungen für Menschen als HTML-Kommentar. Wichtiges oben in jede
   SKILL.md (nach einer Kompaktierung bleiben nur die ersten 5.000 Tokens), Seltenes in
   Zusatzdateien im Skill-Ordner. Große Dateien (`app.js`, `literatur.bib`,
   `kandidaten.json`, `stand.mjs`-Ausgabe) liest kein Skill ganz.
9. **Prüfer schreiben selbst.** Subagents legen ihre Ergebnisse in Dateien ab und geben eine
   Zeile zurück. Das Hauptgespräch reicht Pfade weiter, keine Inhalte.
10. **Codex-kompatibel.** `AGENTS.md` im Root ist die werkzeugneutrale Hauptdatei,
    `.claude/CLAUDE.md` importiert sie (`@../AGENTS.md`) und ergänzt nur Claude-Spezifika.
    Kein Output-Style.
11. **Endausgabe.** Ergebnis in einem Satz, 1 bis 3 Stichpunkte, `Geändert:` mit relativen
    Links je Datei, dann gegebenenfalls Interview. Verankert in `AGENTS.md`.

## Drei Bereiche

```
Kit (.claude/ komplett, plus Pflichtdateien im Root, /update ersetzt genau das)
  AGENTS.md  README.md  .mcp.json  .gitignore  .gitattributes  .vscode/
  .claude/CLAUDE.md  settings.json  skills/  agents/  rules/  hooks/
  .claude/kit/       VERSION  CHANGELOG.md  manifest.json  SPEC.md  LICENSE (im Projekt)
                     ablauf/  leitfaeden/  vorlagen/  werkzeuge/  dashboard/  latex/  docs/  install/

Ihre Arbeit (sichtbar, /update fasst sie nie an)
  kapitel/           <nr>-<slug>.md je Schreibeinheit (beliebige Ebene: 1, 3.2, 3.2.1), .versionen/ (Kopien vor
                     Überarbeitung, Aufteilen, Zusammenführen). Abschnitte = Überschriften in der Datei
  quellen/           literatur.bib, pdfs/<bibkey>.pdf, notizen/<bibkey>.md, eingang/
  daten/  abbildungen/  code/ (bei Bedarf)  Arbeit.pdf  Arbeit.docx

Ihr Stand und ihre Einstellungen (versteckt, per /sync gesichert, /update fasst ihn nie an)
  .arbeit/           einstellungen.md  plan.md  zustand.json  kandidaten.json  stil.md
                     begriffe.md  hilfsmittel.md  tagebuch.md  dashboard-anpassungen.*
                     thema/  expose/  gliederung/  plaene/  pruefung/  betreuung/

Gerätelokal (gitignored)
  .lokal/            journal.jsonl  aenderungen.json  schnappschuss/  sync.json
                     build/  kapitel/  build-expose/   (LaTeX-Bau, zwei Ebenen tief wegen ../../abbildungen)
                     letzter-bau.toc  letzter-bau.json (echte Seiten je Einheit)
```

Nur im Template-Repo, vom Installer im neuen Projekt entfernt: `.github/`, `CONTRIBUTING.md`.
`LICENSE` zieht nach `.claude/kit/LICENSE`. Eigene Skills (nicht im Manifest) und
`.claude/settings.local.json` bleiben bei `/update` stehen.

`.vscode/settings.json` blendet im Explorer alles Technische aus (`files.exclude`). Sichtbar
bleiben `kapitel/`, `quellen/`, `daten/`, `abbildungen/`, `Arbeit.pdf`, `README.md`.

## Datenquellen

| Datei | Inhalt | Schreibt | Liest |
| --- | --- | --- | --- |
| `.arbeit/einstellungen.md` | alle Einstellungen, Zeilen `- schluessel: wert` unter `## Abschnitt` (Arbeit, Person, Hochschule, Zitieren, Stil, Layout, Technik) | `/start`, Person, `zustand.mjs einstellung`, `setzeEinstellung()` | `leseEinstellungen()` in `lib.mjs` (Form wie das alte projekt.json) |
| `.arbeit/plan.md` | `## Meilensteine` (`- Datum · Text · kapitel: … · status: …`), `## Termine` (`- Datum Zeit · Text [· erledigt]`) | `/start`, Gliederung, Dashboard | `lesePlan()` |
| `.arbeit/zustand.json` | Phase, Kapitel (Status, Anteil, Note, offene Punkte), Hauptkapitel, nächster Schritt, Verlauf | nur `zustand.mjs` | alle |
| `.arbeit/kandidaten.json` | Quellen-Board (Vorschläge und Entscheidungen) | nur `kandidaten.mjs` und Dashboard | `kandidaten.mjs list --kurz` |
| `.arbeit/stil.md` | freie Vorlieben, Vorgaben der Betreuung, „So arbeite ich“ | Person, Claude still | jeder schreibende und prüfende Agent, Start-Hook |
| `quellen/notizen/<bibkey>.md` | `## Kernaussage`, Blöcke `## Z1` mit `seite` (gedruckt), optional `seite_pdf`, `typ`, `kapitel`, `original`, `paraphrase`, `kontext` | `quellen-auswerter`, Dashboard | Autor, Prüfer, Dashboard |
| `.arbeit/pruefung/` | `pruefung-<nr>-<art>.md` je Prüfer, `pruefung-<nr>.md` Sammeldatei, `gesamt.md`, `final.md` | Prüfer-Agents, `/pruefen` | Person, Dashboard |

Fehlt eine Datei, gelten die Vorlagen aus `.claude/kit/vorlagen/arbeit/`. Eine unlesbare
JSON-Datei wird nie durch eine Vorlage ersetzt, vor jedem Überschreiben entsteht `<datei>.bak`.
Reparatur: `check.mjs --reparieren`.

## Kapitelstatus und Umfang

- `offen → geplant → entwurf → geprueft → final`. Rückwärts jederzeit, vorwärts nur einen
  Schritt (`--erzwingen` für größere Schritte, nie bis `final`). `final` nur aus `geprueft`.
  `zustand.mjs`, Server und Oberfläche erzwingen das. Undo entfernt den passenden
  Verlaufseintrag.
- Wer setzt: `/schreiben` bis `entwurf`, `/pruefen` nach der Prüfung `geprueft`, die Person
  danach `final` (`zustand.mjs freigeben`).
- Umfang in Seiten: `arbeit.seiten` (Bereich), verteilt über Anteile je Kapitel
  (`zustand.json kapitel[].anteil`, sonst Standard je Kapiteltyp in `seiten.mjs`). Schätzung
  Wörter/300 + 0,5 je Abbildung + 0,3 je Tabelle + 0,1 je abgesetzter Formel. Nach einem
  PDF-Bau zählen die echten Seiten aus `.lokal/build/*.toc`, solange das Kapitel seither
  unverändert ist. Wörter erscheinen nur klein daneben.

## Skills

Frontmatter: `name`, `description` (was der Skill für die Person tut, in ihren Worten),
`when_to_use` (Auslösesätze und ausdrücklich, was nicht dazugehört), `argument-hint`,
`gruppe: arbeit|quellen|technik` (Werkzeugkasten im Dashboard, eigene Skills `eigene`).
Nur Slash (`disable-model-invocation: true`): `start`, `sync`, `update`, `dashboard`. Alle
anderen startet Claude auch selbst, `weiter` ausdrücklich auch bei „mach weiter“. Die
Frontmatter ist die einzige Quelle für Befehlsbeschreibungen, das Dashboard liest sie.

Zusatzdateien im Skill-Ordner, nur bei Bedarf geladen: `start/runden/*.md`,
`pruefen/final.md`, `pdf/installieren.md`, `pdf/vorlage.md`, `sync/sonderfaelle.md`,
`dashboard/anpassen.md`, `dashboard/skill-anlegen.md`.

## Agents

| Agent | Modell | effort | Tools | Ergebnis |
| --- | --- | --- | --- | --- |
| `autor` | inherit | Standard | Read, Write, Edit, Glob, Grep, Bash | Kapiteldatei, prüft selbst mit `stil.mjs`, 5 Zeilen zurück |
| `kapitel-planer` | sonnet | Standard | Read, Write, Glob, Grep | `.arbeit/plaene/plan-<nr>.md`, 5 Zeilen zurück |
| `pruefer-zitate` | inherit | Standard | Read, Write, Glob, Grep | `pruefung-<nr>-zitate.md`, eine Zeile zurück |
| `pruefer-argumentation` | inherit | Standard | Read, Write, Glob, Grep | `pruefung-<nr>-argumentation.md`, eine Zeile zurück |
| `pruefer-sprache` | sonnet | low | Read, Write, Glob, Grep, Bash | ruft `stil.mjs`, kurzer Grammatikdurchgang, eine Zeile zurück |
| `pruefer-fach` | sonnet | Standard | Read, Write, Glob, Grep, Bash | nur Naturwissenschaft/Technik, Methoden bis Diskussion |
| `quellen-auswerter` | sonnet | Standard | Read, Write, Edit, Glob, Grep, Bash | `quellen/notizen/<bibkey>.md`, 4 Zeilen zurück |
| `rechercheur` | sonnet | low | Read, Grep, Glob, Bash, WebFetch | trägt selbst über `kandidaten.mjs add -` ein, 5 Zeilen zurück |

Alle außer `autor` laufen mit `omitClaudeMd: true` und tragen das Nötige selbst. Jeder
schreibende oder prüfende Agent liest `.arbeit/einstellungen.md` und `.arbeit/stil.md`.
Parallelität nach `technik.abo` (`pro`: höchstens zwei Agents gleichzeitig).

## Rules

Pfadgebunden (`paths:`), laden erst beim Lesen passender Dateien: `schreibstil.md` und
`latex.md` für `kapitel/**` und Exposé, `zitate.md` zusätzlich für `quellen/notizen/**`,
`code.md` für `code/**` und `daten/**`.

## Dashboard

`node .claude/kit/dashboard/server.mjs` auf `http://127.0.0.1:<technik.dashboard_port>/`, nur
localhost, startet per VS-Code-Task und SessionStart-Hook. Verbindlicher Vertrag zwischen
Server und Oberfläche: `.claude/kit/dashboard/API.md`. Fünf Reiter: Übersicht, Quellen,
Kapitel, Plan, Hilfe. Ruhig und lesbar: System-UI für die Oberfläche, Serif für den Text der
Person, Monospace nur für Zahlen und Pfade, feste Abstands- und Typoskala, sanfte Animationen,
`prefers-reduced-motion`. Klick auf Datei- oder Absatznamen öffnet VS Code an der Zeile.
Aktionen per Slash über Prompt-Feld und Befehlsauswahl, Rückgängig für jede Schreibaktion.
Jede Schreibaktion landet im Journal `.lokal/journal.jsonl`, der UserPromptSubmit-Hook gibt
es an Claude weiter. Anpassungen der Person: `.arbeit/dashboard-anpassungen.css|js`.

## Hooks

Exec-Form (`"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>.mjs"]`),
fail-open, immer exit 0.
- `SessionStart` → `start.mjs`: startet das Dashboard, gibt als `additionalContext` Phase,
  nächsten Schritt, Frist, Umfang, offene Quellen, Sync-Erinnerung und „So arbeite ich“
  (höchstens 1.200 Zeichen). Kein `systemMessage`.
- `UserPromptSubmit` → `prompt.mjs`: Journal-Zeilen als Kontext, danach geleert.
- Kein Stop-Hook.

## Werkzeuge (`node .claude/kit/werkzeuge/<name>.mjs`)

`lib` (Helfer, `leseEinstellungen`, `setzeEinstellung`, `lesePlan`, Termine), `zustand`
(einzige Schreibstelle für den Zustand, `zeige`, `einstellung`), `seiten` (Seitenschätzung),
`stil` (Stilprüfung nach den Schaltern), `stand` (Aggregat für Dashboard und Hook),
`kandidaten` (Board), `bib`, `pdf`, `check`, `sync`, `git-lage`, `update`, `playwright-mcp`.
Aufrufe und Exit-Codes stehen im Kopfkommentar der jeweiligen Datei.

## Rechte

`.claude/settings.json`: `defaultMode: acceptEdits`, breite Allow-Liste, Deny gegen
Unumkehrbares (Force-Push, `reset --hard`, `clean`, Repo löschen, Formatieren). Maßgeblich ist
die Datei. Eigene Ausnahmen in `.claude/settings.local.json`.
