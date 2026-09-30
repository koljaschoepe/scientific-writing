# Spezifikation Scientific Writing Kit v2.1

> Interne Bauanleitung. Verbindlich für alle, die am Kit bauen (Mensch oder Agent).
> Stand: 2026-09-30

## Zielbild

Ein Claude-Code-Template, mit dem eine nicht technische Person ihre gesamte
wissenschaftliche Arbeit entwickelt: Themenfindung, Recherche, Exposé, Gliederung,
Schreiben (inklusive Daten- und Code-Teil), Prüfung, PDF. Erste Nutzerin: Chemie-Diplomandin
an der TU Dresden, Windows, Claude Pro, erstmals Claude Code, VS Code mit Claude-Extension.
Das Kit bleibt ein allgemeines Template für jede Person und jede Hochschule.

## Nicht verhandelbare Prinzipien

1. **Windows und macOS gleichwertig.** Kein bash, kein python3, kein jq in Hooks oder
   Werkzeugen. Alle Werkzeuge sind Node-Skripte (`.mjs`, nur Node-Built-ins, keine
   npm-Abhängigkeiten, Node >= 20). Pfade immer über `path.join`, nie `/` hart
   zusammenbauen. Prozesse mit `spawn` ohne Shell, wo möglich. Auf Windows `.cmd`-Programme
   (npx, code) über `shell: true` oder `cmd /c`.
2. **Interviews mit Maß.** Jede Rückfrage läuft über das Rückfrage-Tool (Claude Code:
   `AskUserQuestion`, 1 bis 4 Fragen, je 2 bis 4 Optionen, Empfehlung zuerst mit
   „(Empfohlen)“, „Später klären“ wo sinnvoll). Interviews bei Entscheidungen, Freigaben,
   Meilensteinen und nach jeder Aufgabe, die Dateien geändert hat. Nicht nach reinen
   Sachfragen oder Erklärungen. Subagents können nicht fragen, Interviews laufen im
   Hauptgespräch. Details: `kit/leitfaeden/interview.md`.
3. **Challenge, freundlich.** Ermutigend im Ton, hart in der Sache, Schwachstelle zuerst.
   Das volle Protokoll (`kit/leitfaeden/challenge.md`) nur an echten Weichen: Thema,
   Forschungsfrage, Methodik, Gliederung, Freigabe. Kein Regler.
4. **Dateien sind die Wahrheit, das Dashboard ist eine Ansicht.** Kein Fakt wird doppelt
   gepflegt. Das Dashboard rendert bei jedem Aufruf frisch. `dashboard.html` im Root ist eine
   generierte statische Kopie und wird nie von Hand oder von Claude editiert. Gerätelokale
   Laufzeitdaten liegen in `.lokal/` (gitignored), nie in synchronisierten Dateien.
5. **Eigentumszonen.** Kit-Dateien stehen in `kit/manifest.json` (generiert mit
   `node kit/werkzeuge/update.mjs manifest`). `/update` ersetzt oder entfernt nur Dateien aus
   dem alten und dem neuen Manifest. Alles andere gehört der Person: `arbeit/`, `quellen/`,
   `code/`, `daten/`, `abbildungen/`, `latex/eigene-*.tex`, eigene Skills unter
   `.claude/skills/`, `.claude/settings.local.json`, `.lokal/`. Generiert und nie von Hand
   bearbeitet: `latex/kapitel/`, `latex/build/`, `dashboard.html`.
6. **JSON-Schutz.** Eine unlesbare JSON-Datei (Parse-Fehler, Konfliktmarken) wird nie durch
   eine Vorlage ersetzt: Werkzeuge brechen mit klarer Meldung ab, vor jedem Überschreiben
   entsteht `<datei>.bak`. Reparatur: `node kit/werkzeuge/check.mjs --reparieren` bzw. `/hilfe`.
7. **Claude schreibt standardmäßig**, überarbeitet auch Texte der Person. Schreibmodus in
   `arbeit/projekt.json → schreibmodus`: `claude-schreibt` (Standard), `gemeinsam`, `coach`.
   Jede KI-Nutzung wird automatisch in `arbeit/hilfsmittel.md` protokolliert.
8. **Sprache der Bedienung Deutsch**, Arbeitstext Deutsch oder Englisch
   (`arbeit/projekt.json → arbeit.sprache`). Keine Emojis im Kit-Text, keine Gedankenstriche
   in generiertem Arbeitstext.
9. **Sparsam für Claude Pro.** Subagents mit `model: sonnet`, außer Autor und
   Argumentationsprüfer (`model: inherit`). Prüfer, Rechercheur, Quellen-Auswerter und
   Kapitel-Planer laufen mit `omitClaudeMd: true` (ihre harten Regeln stehen im Agent-Text),
   `effort: low` für Sprachprüfer, Rechercheur, Quellen-Auswerter. Immer geladener Kontext
   (`AGENTS.md` + `CLAUDE.md`) unter 6.500 Zeichen. Skills lesen nie ganze
   `literatur.bib`/`kandidaten.json`, sondern nutzen `bib.mjs` und `kandidaten.mjs`. Die
   wichtigsten Regeln stehen oben in jeder SKILL.md (nach einer Kompaktierung bleiben nur die
   ersten 5.000 Tokens). Parallelität nur, wo sie echten Nutzen bringt.
10. **Codex-kompatibel.** `AGENTS.md` ist die werkzeugneutrale Hauptdatei, `CLAUDE.md`
    importiert sie (`@AGENTS.md`) und ergänzt nur Claude-Code-Spezifika. Das Rückfrage-Tool
    wird neutral benannt. Kein Output Style.
11. **Endausgabe.** Ergebnis in einem Satz, 1 bis 3 Stichpunkte, `Geändert:` mit relativen
    Markdown-Links je Datei, dann gegebenenfalls Interview. Höchstens etwa 8 Zeilen davor,
    Tabellen nur auf Wunsch. Verankert in `AGENTS.md`, jeder Skill verweist darauf.

## Ordnerstruktur

```
AGENTS.md                 Hauptdatei für Agenten (werkzeugneutral), gehört zum Kit
CLAUDE.md                 @AGENTS.md plus Claude-Code-Spezifika
README.md                 GitHub-Startseite
dashboard.html            generiert, gitignored
Arbeit.pdf, Vorschau.pdf  gebaute PDFs im Root, gehören der Person (werden mit /sync gesichert)
.mcp.json                 Playwright (plattformneutral, siehe unten)
.lokal/                   gerätelokale Laufzeitdaten, gitignored (siehe unten)
.claude/
  settings.json           Rechte, Hooks
  skills/<name>/SKILL.md  die 11 Commands, plus eigene Skills der Person
  agents/*.md             Subagents mit Frontmatter
  rules/*.md              Pfad-Regeln, Frontmatter `paths:`, laden automatisch
  hooks/*.mjs             Node-Hooks (start.mjs, prompt.mjs)
.vscode/                  extensions.json, settings.json, tasks.json
install/                  install-windows.ps1, install-mac.sh
docs/                     Anleitungen für Menschen
kit/
  SPEC.md                 diese Datei
  VERSION                 z. B. 2.1.0
  CHANGELOG.md            Abschnitte `## x.y.z (YYYY-MM-DD)`, von /update gezeigt
  manifest.json           Liste aller Kit-Dateien, generiert
  ablauf/<phase>.md       Vorgehen je Phase (von /weiter geladen)
  leitfaeden/             Schreib-, Struktur-, Zitier-, Fach-, Interview-, Challenge-Leitfäden
  vorlagen/               Markdown- und JSON-Vorlagen (Kapitel, Exposé, Zitate, arbeit/*.json)
  dashboard/              server.mjs, server/*.mjs, render.mjs, app.js, style.css, ui/, vendor/ (pdf.js), API.md
  werkzeuge/              siehe Abschnitt Werkzeuge
arbeit/
  projekt.json            Konfiguration (von /start)
  zustand.json            einzige Zustandsquelle für Phase und Kapitel
  plan.json               Termine, Fristen, Tagesziel
  stil.md                 Schreibstil + Abschnitt „So arbeite ich“ (Claude pflegt still)
  begriffe.md             Fachbegriffe und Abkürzungen (gesperrt nach Gliederung)
  hilfsmittel.md          KI-Protokoll, speist das Hilfsmittelverzeichnis
  tagebuch.md             Forschungstagebuch (Datum, was, Entscheidungen)
  dashboard-anpassungen.css|js|md  eigene Dashboard-Anpassungen (optional)
  thema/                  thema.md, suchstrategie.md, forschungsstand.md
  expose/                 expose.md, expose.pdf
  gliederung/             gliederung.md
  kapitel/                <nr>-<slug>.md je Unterkapitel, .versionen/ (Kopien vor Überarbeitung)
  anhang/                 je Anhang eine Datei
  plaene/                 Kapitelpläne plan-<nr>.md
  pruefung/               Prüfberichte pruefung-<nr>.md, gesamt.md, final.md
  betreuung/              Gesprächsnotizen YYYY-MM-DD.md, offene-fragen.md, bewertung.md (wenn bekannt)
quellen/
  literatur.bib           Metadaten aller genommenen Quellen (Wahrheit für Zitate)
  kandidaten.json         Triage-Board
  zitate/<bibkey>.md      extrahierte Zitate je Quelle
  pdfs/<bibkey>.pdf       Volltexte
  eingang/                Upload-Ordner (Dashboard, Explorer), Claude sortiert per /quellen
code/                     uv-Projekt (pyproject.toml), Skripte, Notebooks
daten/                    roh/, ergebnisse/
abbildungen/              Plots, Grafiken, Logo (logo.png)
latex/
  vorlage/                Kit: main.tex, praeambel.tex, deckblatt.tex, csl/ ...
  eigene-praeambel.tex    optional, gehört der Person
  eigene-erklaerung.tex   optional, gehört der Person
  kapitel/                generiert aus arbeit/kapitel/*.md (Pandoc), gitignored
  build/, build-expose/   gitignored
```

### Laufzeitdaten `.lokal/` (gitignored, je Gerät)

| Datei | Inhalt | Schreibt |
| --- | --- | --- |
| `journal.jsonl` | Dashboard-Aktionen `{zeit, aktion, text}` | Dashboard-Server, geleert vom Prompt-Hook |
| `aenderungen.json` | zuletzt geänderte Absätze je Datei | Dashboard-Server (fs.watch) |
| `schnappschuss/<rel>.md` | letzter bekannter Stand je Markdown-Datei | Dashboard-Server |
| `aktivitaet.json` | `{tage: {"YYYY-MM-DD": {woerter, quellen, aenderungen}}}` | `notiereAktivitaet()` in `lib.mjs` |
| `sync.json` | letzter erfolgreicher Sync | `sync.mjs` |

Ein synchronisierter Zeitstempel oder Zähler würde bei zwei Geräten jeden Sync in einen
Konflikt verwandeln. Deshalb liegt all das hier und nicht in `arbeit/`.

## Datenmodell

Alle JSON-Dateien UTF-8, 2 Leerzeichen Einrückung, Feld `schema: 1`.

### arbeit/projekt.json
```json
{
  "schema": 1,
  "eingerichtet": false,
  "arbeit": {
    "titel": "", "untertitel": "",
    "typ": "diplomarbeit",
    "sprache": "de",
    "fachprofil": "naturwissenschaft",
    "fachgebiet": "",
    "methodik": "",
    "seiten": { "min": 0, "max": 0 },
    "woerter_ziel": 0
  },
  "autor": { "name": "", "matrikel": "", "email": "" },
  "hochschule": { "name": "", "fakultaet": "", "institut": "", "studiengang": "", "ort": "" },
  "betreuung": { "betreuer": "", "erstgutachter": "", "zweitgutachter": "" },
  "abgabe": { "beginn": "", "datum": "" },
  "ki_regeln": { "status": "unbekannt", "quelle": "", "notiz": "" },
  "schreibmodus": "claude-schreibt",
  "zitation": { "stil": "chem-acs" },
  "latex": {
    "vorlage": "koma",
    "schrift": "",
    "schriftgroesse": 11,
    "zeilenabstand": 1.5,
    "raender_cm": { "oben": 2.5, "unten": 2.5, "innen": 3, "aussen": 2.5 },
    "zweiseitig": false,
    "logo": "",
    "verzeichnisse": {
      "abbildungen": true, "tabellen": true, "abkuerzungen": true,
      "formelzeichen": false, "hilfsmittel": true, "abstract": true,
      "zusammenfassung": true, "erklaerung": true, "sperrvermerk": false, "danksagung": false
    }
  },
  "werkzeuge": { "python": "uv", "zotero": false, "playwright": true },
  "abo": "pro",
  "dashboard": { "port": 4711 }
}
```
Werte: `typ` ∈ seminararbeit, hausarbeit, projektarbeit, bachelorarbeit, masterarbeit,
diplomarbeit, dissertation. `fachprofil` ∈ naturwissenschaft, technik-informatik,
wirtschaft-sozial, geistes. `methodik` ∈ experimentell, computational, literatur,
empirisch-qualitativ, empirisch-quantitativ, gemischt. `ki_regeln.status` ∈ unbekannt,
erlaubt-mit-deklaration, eingeschraenkt, verboten. `zitation.stil` ist ein biblatex-Stil
(chem-acs, chem-rsc, chem-angew, ieee, apa, authoryear, numeric) plus `harvard-de`
(authoryear mit „vgl.“).

### arbeit/zustand.json
```json
{
  "schema": 1,
  "phase": "einrichtung",
  "meilensteine": {
    "einrichtung": { "status": "aktiv", "datum": null },
    "thema":       { "status": "offen", "datum": null },
    "recherche":   { "status": "offen", "datum": null },
    "expose":      { "status": "offen", "datum": null },
    "gliederung":  { "status": "offen", "datum": null },
    "schreiben":   { "status": "offen", "datum": null },
    "pruefen":     { "status": "offen", "datum": null },
    "abgabe":      { "status": "offen", "datum": null }
  },
  "hauptkapitel": [],
  "kapitel": [],
  "naechster_schritt": "Richte dein Projekt mit /start ein.",
  "verlauf": []
}
```
- Phasen in fester Reihenfolge: einrichtung, thema, recherche, expose, gliederung,
  schreiben, pruefen, abgabe. `status` ∈ offen, aktiv, erledigt. Genau eine aktiv.
- `hauptkapitel[]`: `{ "nr": "2", "titel": "Theoretische Grundlagen" }`, gesetzt mit
  `zustand.mjs hauptkapitel`, liefert Überschriften für PDF und Gruppierung im Dashboard.
- `kapitel[]`: `{ "nr": "2.1", "titel": "", "hauptkapitel": "2", "datei": "arbeit/kapitel/2-1-slug.md", "status": "offen|geplant|entwurf|geprueft|final", "woerter_ziel": 0, "note_schaetzung": null, "offene_punkte": 0 }`.
  Wörter werden nie gespeichert, sondern aus der Datei gezählt.
- `status`: `geprueft` setzt die Freigabe in `/schreiben`, `final` erst die Freigabe nach `/pruefen`.
- `naechster_schritt` nur über `zustand.mjs naechster "<text>"`.
- Aktivität, Serie, Heatmap und Abzeichen werden nicht gespeichert, sondern von `ladeStand()`
  beim Lesen abgeleitet: aus `.lokal/aktivitaet.json`, `git log --format=%cs` und dem
  Kapitelzustand. Ältere Dateien können noch `aktivitaet` und `abzeichen` enthalten, sie
  werden ignoriert.
- Der letzte Sync ist gerätelokal (`.lokal/sync.json`, gelesen über `git-lage.mjs`).
- `verlauf[]`: letzte 50 Einträge `{ "datum": "ISO", "was": "Kapitel 2.1 freigegeben" }`.

### arbeit/plan.json
```json
{
  "schema": 1,
  "termine": [
    { "id": "t1", "datum": "YYYY-MM-DD", "zeit": "", "titel": "", "art": "betreuung|frist|labor|sonstiges", "notiz": "", "erledigt": false }
  ],
  "tagesziel": { "arbeitstage": ["mo", "di", "mi", "do", "fr"], "woerter_manuell": null }
}
```
Tagesziel wird berechnet: (Wörterziel minus geschrieben) / verbleibende Arbeitstage bis
7 Tage vor Abgabe. `woerter_manuell` überschreibt.

### quellen/kandidaten.json (Triage-Board)
```json
{
  "schema": 1,
  "quellen": [
    {
      "id": "10.1021/acs.jcim.0c00001",
      "bibkey": "",
      "titel": "", "autoren": ["Nachname, Vorname"], "jahr": 2024,
      "venue": "", "doi": "", "url": "",
      "kurz": "2 Sätze Inhalt",
      "warum": "Begründung von Claude, warum relevant",
      "kapitel": ["2.1"],
      "relevanz": 4,
      "status": "vorschlag",
      "stern": 0,
      "notiz": "",
      "markierungen": [],
      "pdf": null,
      "open_access": null,
      "ausgewertet": false,
      "zitate": 0,
      "herkunft": "crossref",
      "hinzugefuegt": "YYYY-MM-DD",
      "entschieden": null
    }
  ]
}
```
- `status` ∈ vorschlag, genommen, verworfen, spaeter. Die Person entscheidet im Dashboard,
  Claude darf nur `vorschlag` anlegen (Ausnahme: Uploads und manuell genannte Quellen
  starten als `genommen`).
- `markierungen` aus festem Vokabular: kernquelle, methodik, daten, review, kritisch,
  definition, gegenposition. Beide Seiten dürfen setzen.
- `relevanz` 1 bis 5 von Claude, `stern` 0 bis 3 von der Person.
- `herkunft` ∈ crossref, semantic-scholar, openalex, slub, scholar, web, manuell, upload, zotero.
- Genommene Quellen landen per `/quellen` in `literatur.bib` (bibkey = nachnameJahrWort,
  z. B. `schwaller2019molecular`), PDF nach `quellen/pdfs/<bibkey>.pdf`, Zitate nach
  `quellen/zitate/<bibkey>.md`.

### quellen/zitate/<bibkey>.md
```markdown
# <bibkey>: <Kurztitel>

> Quelle: quellen/pdfs/<bibkey>.pdf · ausgewertet YYYY-MM-DD · Sprache: en

## Z1
- seite: 4
- typ: befund | definition | methode | daten | aussage | gegenposition
- kapitel: 2.1
- original: "Wörtlicher Originaltext in Originalsprache."
- paraphrase: "Sinngemäße Wiedergabe in Arbeitssprache."
- kontext: Worauf sich die Aussage bezieht, Einschränkungen.
```
Regel aus der Bachelorarbeit: Übersetzte Zitate sind nie direkte Zitate. Prüfung der
Zitattreue immer gegen `original` bzw. das PDF, nie gegen die Paraphrase.

### Kapiteltexte arbeit/kapitel/*.md
Pandoc-Markdown. Erste Zeile `## 2.1 Titel` (Hauptkapitel-Überschriften erzeugt
`pdf.mjs` aus `zustand.json`). Zitate `[@bibkey]`, `[@bibkey, S. 4]`, mehrere
`[@a; @b]`. Formeln `$...$`, `$$...$$`. Chemie `\ce{H2O}` und Einheiten `\qty{5}{\milli\litre}`
(siunitx v3, nie das veraltete `\SI`) direkt als LaTeX (Pandoc reicht Raw-LaTeX durch). Abbildungen
`![Beschriftung](abbildungen/datei.png){#fig:name width=80%}`, Querverweise `\cref{fig:name}`.
Tabellen als Pipe-Tabellen mit `: Beschriftung {#tbl:name}`. Kein Zeilenumbruch mitten im Satz nötig.

## Commands (Skills)

Frontmatter je Skill: `name`, `description`, bei selbst aufrufbaren `when_to_use` (knapp,
Beschreibung und `when_to_use` zusammen weit unter 1.536 Zeichen), `argument-hint`,
`gruppe: arbeit|quellen|technik` (Werkzeugkasten im Dashboard, eigene Skills `eigene`).
Claude Code ignoriert unbekannte Felder wie `gruppe`, der Dashboard-Server liest sie.

| Command | Aufruf | Zweck |
| --- | --- | --- |
| `/start [bereich]` | nur Slash | Einrichtung per Interview, später Einstellungen ändern |
| `/weiter [phase]` | nur Slash | Nächster Schritt je Phase, lädt `kit/ablauf/<phase>.md`, Freigabe-Interview |
| `/recherche [thema\|nr]` | auch Claude | Literatursuche, Vorschläge per `kandidaten.mjs add` ins Board |
| `/quellen [bibkey\|doi\|pfad]` | auch Claude | Entscheidungen, Uploads, Zotero-Import, Dashboard-Zitate verarbeiten |
| `/schreiben [nr\|datei]` | auch Claude | Unterkapitel planen und schreiben oder überarbeiten, Freigabe → `geprueft` |
| `/pruefen [nr\|hauptkapitel\|alles\|final]` | auch Claude | vier Prüfer, Kürzungsplan, Freigabe → `final`, Final-Gate |
| `/pdf [entwurf\|expose\|docx\|check]` | auch Claude | PDF, Entwurf, Exposé, Word-Datei, Werkzeugcheck |
| `/sync` | nur Slash | Sichern und mit GitHub abgleichen, direkt auf main |
| `/update` | nur Slash | Neue Kit-Version, nur Dateien laut Manifest |
| `/hilfe [frage]` | auch Claude | Lage, Systemcheck mit `check --reparieren`, Rückgängig erklären |
| `/dashboard [anpassen <wunsch>\|skill <name>]` | nur Slash | Dashboard starten, umbauen, eigenen Skill anlegen |

„Nur Slash“ = `disable-model-invocation: true`. Soll ein Ablauf in einen solchen Skill
übergehen, liest Claude dessen SKILL.md und befolgt sie.

## Dashboard

- `node kit/dashboard/server.mjs` auf `http://127.0.0.1:<port>/` (Standard 4711), nur
  localhost. Startet per VS-Code-Task beim Öffnen des Ordners und per SessionStart-Hook,
  falls nicht schon laufend (`/api/ping`). `--starten [--oeffnen]`, `--stoppen`, `--statisch`.
- **Verbindlicher Vertrag zwischen Server und Oberfläche: `kit/dashboard/API.md`.** Dort
  stehen alle Endpunkte, Fehlercodes, SSE-Ereignisse und die Felder von `stand`.
- Reiter: Übersicht, Quellen, Kapitel, Plan, Hilfe. Oben der Prompt-Konfigurator: Absenden
  öffnet `vscode://anthropic.claude-code/open?prompt=<urlencoded>`, zusätzlich „Kopieren“.
- **Panel rechts** für Leseansichten, mobil Vollbild:
  - PDF-Viewer (pdf.js aus `kit/dashboard/vendor/`, offline) für `Arbeit.pdf`, Entwurf und
    Quell-PDFs. Markierte Textstelle → „Als Zitat speichern“ (`POST /api/zitat`, landet in
    `quellen/zitate/<bibkey>.md`, `/quellen` ergänzt Paraphrase und Kapitel).
  - Kapitel-Leseansicht: zuletzt geänderte Absätze markiert, Absatz direkt korrigieren
    (`PUT /api/text`, mit Hash-Prüfung gegen Konflikte) oder „an Claude“ schicken.
  - Skill-Ansicht aus dem Werkzeugkasten.
- **Zuletzt geändert:** Der Server erkennt Änderungen an `arbeit/**/*.md` selbst (fs.watch,
  Absatz-Vergleich mit `.lokal/schnappschuss/`), egal ob von Claude, Subagent oder Person.
- **PDF aktualisieren:** baut den Entwurf im Hintergrund (`POST /api/pdf/bauen`), zeigt ihn im
  Panel und „n Änderungen seither“.
- **Werkzeugkasten:** alle Skills gruppiert nach `gruppe`, Inhalt lesen, in VS Code öffnen,
  „Neu“ und „Ändern“ schicken einen Auftrag an Claude (`/dashboard skill <name>`).
- **Suche** mit Strg/Cmd+K über Kapitel, Quellen, Termine und Befehle.
- **Rückgängig** für jede Schreibaktion: Toast mit „Rückgängig“, gestapelt. Keine
  Fassungs-Schnappschüsse, kein Auto-Commit.
- **Journal:** Jede Schreibaktion hängt eine Zeile an `.lokal/journal.jsonl`. Der
  UserPromptSubmit-Hook gibt sie still an Claude weiter und leert die Datei.
- Schreibende Endpunkte ändern nur `quellen/kandidaten.json`, `quellen/eingang/`,
  `quellen/zitate/`, `arbeit/plan.json`, `arbeit/zustand.json` (Kapitelstatus) und einzelne
  Absätze in `arbeit/**/*.md`, immer atomar mit `.bak`, nie bei kaputter JSON (409 `kaputt`).
- `dashboard.html` (statisch, ohne Schreibknöpfe) schreibt der Server bei Änderungen neu.
- Stil: warmes Cockpit, Reiter oben, keine Seitenleiste, Systemschrift für Text, Mono für
  Metadaten, eine Akzentfarbe, Rot nur für Überfälliges, Hell/Dunkel über
  `prefers-color-scheme`, einheitliche Tokens, sanfte Animationen, nichts springt.
- Anpassungen der Person: `arbeit/dashboard-anpassungen.css|js` (überstehen `/update`).

## Hooks (alle in Exec-Form, plattformneutral)

```json
{ "type": "command", "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/start.mjs"] }
```
- `SessionStart` → `start.mjs`: startet Dashboard falls nötig, gibt als `additionalContext`
  die Kernfelder (Phase, nächster Schritt, Tage bis Abgabe, Wortstand, offene Quellen,
  Sync-Erinnerung ab 2 Tagen) und den Abschnitt „So arbeite ich“ aus `arbeit/stil.md`,
  dazu `systemMessage` mit Dashboard-Link. Deshalb muss Claude diese Dateien nicht bei jedem
  Sessionstart lesen.
- `UserPromptSubmit` → `prompt.mjs`: gibt die Zeilen aus `.lokal/journal.jsonl` als Kontext
  weiter, wenn es welche gibt, und leert die Datei. Sonst still.
- Kein Stop-Hook (seit 2.1). Aktivität und Abzeichen werden beim Lesen abgeleitet.
- Fail-open: Fehler nie an Claude melden, immer exit 0.

## Werkzeuge (kit/werkzeuge, CLI `node kit/werkzeuge/<name>.mjs <befehl>`)

| Werkzeug | Befehle und Zweck |
| --- | --- |
| `lib.mjs` | gemeinsame Helfer: `leseJson` (wirft `JsonKaputt`), `schreibeJson` (atomar, `.bak`), `lokal()`, `notiereAktivitaet()`, `journal()`, `absaetze()`, `absatzHash()`, Phasen, Kapitelstatus |
| `stand.mjs` | `ladeStand(root)`: aggregiert alles fürs Dashboard und den Start-Hook (Wörter, bib, Tagesziel, Serie, Abzeichen abgeleitet). CLI gibt JSON aus |
| `zustand.mjs` | einzige Schreibstelle für `arbeit/zustand.json`: `init`, `zeige`, `phase <id>`, `abschliessen`, `kapitel <nr> <status> [--titel --datei --ziel --note --offen]`, `kapitel-setzen`, `hauptkapitel`, `freigeben <nr>`, `naechster "<text>"`, `verlauf "<text>"`, `status <nr> <status>`, `aktivitaet` und `pruefe-abzeichen` (nur lesen) |
| `kandidaten.mjs` | Triage-Board ohne Volllesen: `list [--status s] [--kurz]`, `add <json-datei\|->`, `set <id> feld=wert …`, `neu [--quittieren] [--json]` (Entscheidungen seit der letzten Verarbeitung, genommene ohne bib-Eintrag, Eingang) |
| `bib.mjs` | `add <doi> [--key k]`, `add-json <datei>`, `import <datei.bib>` (z. B. Zotero-Export), `check` (DOIs gegen Crossref), `list [--json]`, `keys` |
| `pdf.mjs` | `[entwurf\|expose\|docx\|check] [--json] [--nur-tex] [--oeffnen]`: Pandoc nach `latex/kapitel/`, LuaLaTeX und Biber, Fehler verdichtet, Ergebnis `Arbeit.pdf`. `docx` erzeugt `Arbeit.docx` per Pandoc mit citeproc (CSL aus `latex/vorlage/csl/`) |
| `check.mjs` | Systemcheck `[--json]`, `--reparieren` (beschädigte JSON-Dateien aus einer gültigen `.bak` wiederherstellen, Exit 5 wenn danach noch etwas kaputt ist) |
| `sync.mjs` | siehe `/sync`: `[--merge\|--abschliessen\|--abbrechen\|--status] [--json]`, schreibt `.lokal/sync.json` |
| `git-lage.mjs` | letzter Sync, ungesicherte Änderungen, Repo-Lage (gelesen von stand und check) |
| `update.mjs` | siehe `/update`: `--check`, übernehmen, `manifest` (erzeugt `kit/manifest.json`), `--von <url>` |
| `playwright-mcp.mjs` | startet den Playwright-MCP-Server plattformneutral mit Browserprofil außerhalb des Repos (`~/.scientific-writing/browser-profil`) |

## Rechte (.claude/settings.json)

`defaultMode: acceptEdits`, allow: Bash, PowerShell, Read, Edit, Write, WebFetch, WebSearch,
`mcp__playwright`. deny (maßgeblich ist die Datei): `git push --force`, `git push -f` (auch
mit Argumenten davor), `git reset --hard`, `git clean`, `git filter-branch`, `rm -rf /`,
`rm -rf ~`, `gh repo delete`, unter PowerShell zusätzlich `Remove-Item * C:\`,
`Format-Volume`, sowie `mcp__playwright__browser_run_code_unsafe`. Kommentare als
`"//"`-Schlüssel. Eigene Ausnahmen in `.claude/settings.local.json`.
