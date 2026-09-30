# Spezifikation Scientific Writing Kit v2

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
2. **Interview-Tool bei jeder Interaktion.** Jede Rückfrage, jede Entscheidung, jede Freigabe
   läuft über `AskUserQuestion` (1 bis 4 Fragen, je 2 bis 4 Optionen, empfohlene Option
   zuerst mit „(Empfohlen)“, Freitext kommt automatisch dazu, „Später klären“ als Option wo
   sinnvoll). Ausnahme nur die allererste Antwort auf den Start-Prompt einer Session, wenn
   die Aufgabe eindeutig ist. Nach jeder abgeschlossenen Aufgabe endet Claude mit einem
   Interview (nächster Schritt, Freigabe, Überarbeitung). AskUserQuestion geht nicht in
   Subagents: Interviews laufen immer im Hauptgespräch.
3. **Challenge, freundlich.** Ermutigend im Ton, hart in der Sache: Schwachstellen zuerst,
   Gegenargument zu jeder Entscheidung, Devil's Advocate bei Forschungsfrage und Gliederung,
   eigene Recherche nachschieben, wenn die Person unsicher ist. Kein Regler.
4. **Dateien sind die Wahrheit, das Dashboard ist eine Ansicht.** Kein Fakt wird doppelt
   gepflegt. Das Dashboard rendert bei jedem Aufruf frisch. `dashboard.html` im Root ist eine
   generierte statische Kopie und wird nie von Hand oder von Claude editiert.
5. **Eigentumszonen.** Herstellerdateien (`kit/`, `.claude/`, `latex/vorlage/`, `.vscode/`,
   `install/`, `docs/`, `CLAUDE.md`, `.mcp.json`) kommen per `/update` aus dem Template.
   Nutzerdateien (`arbeit/`, `quellen/`, `code/`, `daten/`, `abbildungen/`, `latex/kapitel/`,
   `.claude/settings.local.json`) werden von `/update` nie angefasst.
6. **Claude schreibt standardmäßig**, überarbeitet auch Texte der Person. Schreibmodus in
   `arbeit/projekt.json → schreibmodus`: `claude-schreibt` (Standard), `gemeinsam`, `coach`.
   Jede KI-Nutzung wird automatisch in `arbeit/hilfsmittel.md` protokolliert.
7. **Sprache der Bedienung Deutsch**, Arbeitstext Deutsch oder Englisch
   (`arbeit/projekt.json → arbeit.sprache`). Keine Emojis im Kit-Text, keine Gedankenstriche
   in generiertem Arbeitstext.
8. **Sparsam für Claude Pro.** Subagents mit `model: sonnet`, außer Autor und
   Argumentationsprüfer (`model: inherit`). Parallelität nur, wo sie echten Nutzen bringt.

## Ordnerstruktur

```
CLAUDE.md                 Router, unter 120 Zeilen
README.md                 GitHub-Startseite
dashboard.html            generiert, gitignored
.mcp.json                 Playwright (plattformneutral, siehe unten)
.claude/
  settings.json           Rechte, Hooks
  skills/<name>/SKILL.md  die 11 Commands
  agents/*.md             Subagents mit Frontmatter
  rules/*.md              Regeln, Frontmatter `paths:`
  hooks/*.mjs             Node-Hooks
.vscode/                  extensions.json, settings.json, tasks.json
install/                  install-windows.ps1, install-mac.sh
docs/                     Anleitungen für Menschen
kit/
  SPEC.md                 diese Datei
  VERSION                 z. B. 2.0.0
  ablauf/<phase>.md       Vorgehen je Phase (von /weiter geladen)
  leitfaeden/             Schreib-, Struktur-, Zitier-, Fachleitfäden
  vorlagen/               Markdown-Vorlagen (Kapitel, Exposé, Zitate ...)
  dashboard/              server.mjs, render.mjs, app.js, style.css
  werkzeuge/              stand.mjs, zustand.mjs, sync.mjs, update.mjs, pdf.mjs, check.mjs, bib.mjs
arbeit/
  projekt.json            Konfiguration (von /start)
  zustand.json            einzige Zustandsquelle für Phase, Kapitel, Aktivität
  plan.json               Termine, Fristen, Tagesziel
  stil.md                 Schreibstil + Abschnitt „So arbeite ich“ (Claude pflegt still)
  begriffe.md             Fachbegriffe und Abkürzungen (gesperrt nach Gliederung)
  hilfsmittel.md          KI-Protokoll, speist das Hilfsmittelverzeichnis
  tagebuch.md             Forschungstagebuch (Datum, was, Entscheidungen)
  thema/                  thema.md (Forschungsfrage, Abgrenzung, Varianten)
  expose/                 expose.md
  gliederung/             gliederung.md
  kapitel/                <nr>-<slug>.md je Unterkapitel, z. B. 2-1-grundlagen-ml.md
  plaene/                 Kapitelpläne plan-<nr>.md
  pruefung/               Prüfberichte pruefung-<nr>.md
  betreuung/              Gesprächsnotizen YYYY-MM-DD.md
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
  vorlage/                Herstellerzone: main.tex, praeambel.tex, deckblatt.tex, ...
  kapitel/                generiert aus arbeit/kapitel/*.md (Pandoc), gitignored
  build/                  gitignored
Arbeit.pdf                fertiges PDF im Root (gitignored? nein, committet)
```

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
  "aktivitaet": { "tage": {} },
  "abzeichen": [],
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
- `aktivitaet.tage["YYYY-MM-DD"] = { "woerter": n, "quellen": n, "sessions": n }`. Wörter
  des Tages = Differenz der Gesamtwortzahl, geschrieben vom Stop-Hook.
- `abzeichen[]`: `{ "id": "erste-quelle", "datum": "YYYY-MM-DD" }`. Katalog in
  `kit/werkzeuge/zustand.mjs` (ABZEICHEN), vergeben durch `zustand.mjs pruefe-abzeichen`.
- Der letzte Sync ist gerätelokal (`.git/scientific-writing-sync`), gelesen über
  `kit/werkzeuge/git-lage.mjs`. Er steht bewusst nicht in `zustand.json`, weil ein
  synchronisierter Zeitstempel bei zwei Geräten jeden Sync in einen Konflikt verwandelt.
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
`[@a; @b]`. Formeln `$...$`, `$$...$$`. Chemie `\ce{H2O}` und Einheiten `\SI{5}{\milli\litre}`
bzw. `\qty{5}{\milli\litre}` direkt als LaTeX (Pandoc reicht Raw-LaTeX durch). Abbildungen
`![Beschriftung](abbildungen/datei.png){#fig:name width=80%}`, Querverweise `\cref{fig:name}`.
Tabellen als Pipe-Tabellen mit `: Beschriftung {#tbl:name}`. Kein Zeilenumbruch mitten im Satz nötig.

## Commands (Skills, alle `disable-model-invocation: true` außer wo vermerkt)

| Command | Zweck |
| --- | --- |
| `/start` | Einrichtung per Interview (Person, Arbeit, Hochschule, KI-Regeln, Fristen, Format), Systemcheck. Bei bestehender Einrichtung: Einstellungen ändern |
| `/weiter` | Nächster sinnvoller Schritt je Phase. Lädt `kit/ablauf/<phase>.md`. Schließt jede Aufgabe mit Freigabe-Interview ab |
| `/recherche [thema]` | Literatursuche (Crossref, Semantic Scholar, OpenAlex falls Key, SLUB und Scholar per Playwright, Web), legt Vorschläge im Triage-Board an |
| `/quellen` | Verarbeitet Entscheidungen und Uploads: bib-Eintrag, PDF holen, Zitate extrahieren, Kapitel zuordnen |
| `/schreiben [nr]` | Unterkapitel planen und schreiben oder einen Text der Person überarbeiten |
| `/pruefen [nr\|alles]` | Prüfung: Sprache, Zitattreue, Argumentation mit Notenschätzung, Fachprüfung, Umfang, Kürzungsplan |
| `/pdf [entwurf]` | Kapitel nach LaTeX (Pandoc), PDF bauen, Fehler in Klartext übersetzen |
| `/sync` | Sichern und mit GitHub abgleichen (manuell) |
| `/update` | Neue Kit-Version aus dem Template holen, nur Herstellerzone |
| `/hilfe [frage]` | Wo bin ich, was jetzt, Systemcheck mit Reparatur |
| `/dashboard [anpassen <wunsch>]` | Dashboard starten/öffnen oder umbauen |

## Dashboard

- `node kit/dashboard/server.mjs` auf `http://127.0.0.1:<port>/` (Standard 4711), nur
  localhost. Startet automatisch per VS-Code-Task beim Öffnen des Ordners und zusätzlich
  per SessionStart-Hook, falls nicht schon laufend (Prüfung per HTTP `/api/ping`).
- Reiter: Übersicht, Quellen, Kapitel, Plan, Hilfe. Oben klebend der Prompt-Konfigurator.
- Absenden öffnet `vscode://anthropic.claude-code/open?prompt=<urlencoded>`: neuer Claude-Tab
  mit fertigem Prompt, die Person drückt Enter. Zusätzlich Knopf „Kopieren“.
- Schreibende Endpunkte ändern nur: `quellen/kandidaten.json` (Entscheidungen, Stern, Notiz,
  Markierungen), `quellen/eingang/` (Upload), `arbeit/plan.json` (Termine),
  `arbeit/zustand.json` (nur Kapitel-Freigabe und Termin erledigt). Jede Änderung schreibt
  atomar (tmp + rename).
- Nach jeder Änderung und beim Start wird `dashboard.html` (statisch, Daten eingebettet,
  Schreibknöpfe ausgeblendet mit Hinweis) neu geschrieben.
- Live-Aktualisierung per SSE (`/ereignisse`) mit `fs.watch` auf arbeit/, quellen/,
  entprellt, ohne die Scrollposition zu verlieren.
- Stil: Cockpit-artig, etwas wärmer. Keine Seitenleiste, Reiter oben, Systemschrift für Text,
  Mono für Metadaten, eine Akzentfarbe (Blau #1F5FBF, dunkel #7AA7F0), Rot nur für Überfälliges,
  Hell/Dunkel über `prefers-color-scheme`, Status als grauer Text statt Badges. Prozesspfad als
  Grafik, Abzeichen dezent.

## Hooks (alle in Exec-Form, plattformneutral)

```json
{ "type": "command", "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/start.mjs"] }
```
- `SessionStart` → `start.mjs`: startet Dashboard falls nötig, gibt genau eine Zeile
  `additionalContext` (Phase, nächster Schritt, Tage bis Abgabe, Sync-Erinnerung bei mehr als
  2 Tagen) und `systemMessage` mit Dashboard-Link.
- `Stop` → `stop.mjs`: schreibt Tagesaktivität, prüft Abzeichen, regeneriert `dashboard.html`.
  Fail-open: Fehler nie an Claude melden, immer exit 0.

## Werkzeuge (kit/werkzeuge, CLI `node kit/werkzeuge/<name>.mjs <befehl>`)

- `stand.mjs` exportiert `ladeStand(root)` (aggregiert alles fürs Dashboard, zählt Wörter,
  parst bib, berechnet Tagesziel, Serie, Countdown) und CLI `stand.mjs` gibt JSON aus.
- `zustand.mjs`: `phase <id>` (setzt aktiv, vorige erledigt), `kapitel <nr> <status>`,
  `verlauf "<text>"`, `pruefe-abzeichen`, `aktivitaet`, `init` (legt fehlende Dateien aus
  `kit/vorlagen/arbeit/` an). Alle Skills ändern Zustand nur über dieses Werkzeug.
- `bib.mjs`: `add` (aus JSON/DOI via Crossref), `check` (DOIs gegen Crossref verifizieren),
  `list`.
- `pdf.mjs`: Kapitel sammeln, Pandoc nach `latex/kapitel/`, `lualatex`/`biber`-Lauf,
  Fehlerlog auf die wichtigsten Zeilen verdichten. Kopiert Ergebnis nach `Arbeit.pdf`.
- `sync.mjs`: siehe /sync. `update.mjs`: siehe /update. `check.mjs`: Systemcheck.

## Rechte (.claude/settings.json)

`defaultMode: acceptEdits`, allow: Bash, PowerShell, Edit, Write, Read, WebFetch, WebSearch,
`mcp__playwright`. deny: `git push --force*`, `git push -f*`, `git reset --hard*`,
`git clean*`, `rm -rf /*`, `rm -rf ~*`, `Remove-Item -Recurse * C:\*`, `gh repo delete*`,
`mcp__playwright__browser_run_code_unsafe`. Kommentare als `"//"`-Schlüssel.
