# Dashboard-API (v2.1)

Server: `.claude/kit/dashboard/server.mjs`, nur `127.0.0.1`. Alle Antworten JSON (außer Dateien/SSE).
Schreibende Anfragen: `POST`/`PUT` mit `Content-Type: application/json` (Upload: `application/octet-stream`),
`Origin` muss `http://127.0.0.1:<port>` oder `http://localhost:<port>` sein (nie `null`), `Host` muss
`127.0.0.1:<port>` oder `localhost:<port>` sein. Sonst 403.

Fehlerform immer: `{ "fehler": "<deutscher Satz für die Person>", "code": "<kurz>" }`.
Codes: `kaputt` (JSON-Datei unlesbar, 409), `konflikt` (Datei hat sich geändert, 409), `ungueltig` (400),
`nicht_gefunden` (404), `zu_gross` (413), `verboten` (403), `intern` (500).

Jede erfolgreiche Schreibaktion hängt eine Zeile an das Journal `.lokal/journal.jsonl`
(`{zeit, aktion, text}`; `text` ist ein kurzer deutscher Satz, z. B. „Quelle smith2020deep genommen“).
Der UserPromptSubmit-Hook gibt diese Zeilen beim nächsten Prompt an Claude weiter und leert die Datei.

## Lesen

| Methode | Pfad | Antwort |
| --- | --- | --- |
| GET | `/api/ping` | `{ok, root, pid, port, version}` |
| GET | `/api/stand` | Stand-Objekt aus `ladeStand()` plus `aenderungen` (siehe unten), `skills`, `pdfBau` |
| GET | `/ereignisse` | SSE. Events: `stand` (data: `{version}`), `pdf` (data: pdfBau), `hallo`. Heartbeat-Kommentar alle 20 s |
| GET | `/api/check` | Systemcheck (asynchron gestartet, blockiert den Server nicht) |
| GET | `/api/text?datei=<rel>` | `{datei, titel, version, woerter, absaetze:[{i, text, html, hash, geaendert}], frontmatter}` für `.md` unter `.arbeit/` |
| GET | `/api/skill?name=<name>` | `{name, beschreibung, inhalt, pfad, eigen}` |
| GET | `/datei/<rel>` | Rohdatei aus erlaubten Ordnern (`.arbeit/`, `quellen/`, `abbildungen/`, `Arbeit.pdf`, `Vorschau.pdf`) |
| GET | `/vendor/<rel>` | Dateien aus `.claude/kit/dashboard/vendor/` (pdf.js) |

`version` einer Textdatei = `mtimeMs + ':' + size` als String.
`hash` eines Absatzes = erste 12 Hex-Zeichen von sha1(text).
`html` = sicher escapter Absatz mit einfacher Markdown-Auszeichnung (Überschrift, *kursiv*, **fett**, `[@key]` →
`<span class="zit" data-key="key">(Autor Jahr)</span>` wenn in literatur.bib, sonst `<span class="zit fehlt">`).

`stand.aenderungen`: `[{zeit, datei, titel, absaetze:[i...], woerter_delta}]`, neueste zuerst, max. 30,
gerätelokal aus `.lokal/aenderungen.json`. Der Server erkennt sie selbst per `fs.watch` auf `.arbeit/`
(Markdown) durch Vergleich mit dem letzten Schnappschuss in `.lokal/schnappschuss/`.

`stand.skills`: `[{name, beschreibung, gruppe, slash:true, auto:boolean, eigen:boolean, argument}]`,
aus `.claude/skills/*/SKILL.md` Frontmatter. `gruppe` aus Frontmatter-Feld `gruppe`
(`arbeit` | `quellen` | `technik`), sonst `eigene`. `eigen` = nicht in `.claude/kit/manifest.json`.

`stand.pdfBau`: `{laeuft:boolean, gestartet, fertig, ok, meldung, datei:"Arbeit.pdf", geaendert_seit:int}`.
`geaendert_seit` = Zahl der Kapitel-Änderungen seit dem letzten erfolgreichen Bau.

## Schreiben

| Methode | Pfad | Körper | Wirkung |
| --- | --- | --- | --- |
| POST | `/api/quelle` | `{id, status?, stern?, notiz?, markierungen?, kapitel?}` | wie bisher, antwortet mit `{ok, quelle, vorher}` (`vorher` = Felder vor der Änderung, fürs Undo) |
| POST | `/api/upload?name=` | Bytes | nach `quellen/eingang/`, exklusiv angelegt (`wx`), >300 MB → 413 |
| POST | `/api/termin` | `{datum, zeit?, titel, art?, notiz?}` | neu, `{ok, termin}` |
| POST | `/api/termin/erledigt` | `{id, erledigt}` | `{ok, vorher}` |
| POST | `/api/termin/loeschen` | `{id}` | `{ok, termin}` (vollständiges Objekt fürs Undo) |
| POST | `/api/termin/wiederherstellen` | `{termin}` | legt mit Original-ID wieder an |
| POST | `/api/kapitel/status` | `{nr, status}` | nur bekannte `nr` und Status aus `KAPITEL_STATUS`; `{ok, kapitel, vorher}`. Ersetzt `/api/kapitel/freigeben` (bleibt als Alias: status=final, nur aus `geprueft`) |
| PUT | `/api/text` | `{datei, i, hash, version, text}` | ersetzt Absatz `i`, wenn `hash` passt (sonst 409 `konflikt`). Antwort `{ok, version, absatz}` |
| POST | `/api/zitat` | `{bibkey, seite, text, notiz?}` | hängt ein Zitat an `quellen/notizen/<bibkey>.md` an (Format laut SPEC), `{ok, datei}` |
| POST | `/api/pdf/bauen` | `{}` | startet `node .claude/kit/werkzeuge/pdf.mjs entwurf --json` im Hintergrund; läuft schon → `{ok, laeuft:true}`. Ergebnis per SSE `pdf` |
| POST | `/api/stop` | `{pid}` | beendet den Server, wenn `pid` passt (für `--stoppen`) |

JSON-Dateien unlesbar → nie überschreiben, 409 `kaputt` mit Hinweis „Datei X ist beschädigt. Sag Claude: /hilfe reparieren“.

## Präzisierungen und Ergänzungen (Stand Server v2.1)

Alles hier ist additiv zum Vertrag oben.

### Sicherheit und Fehler

- `Host` wird bei **jeder** Anfrage geprüft (auch GET), sonst 403 `verboten`.
- `Origin` wird bei POST/PUT geprüft, wenn der Header vorhanden ist. Fehlt er (curl, Node-Skripte wie `--stoppen`), ist die Anfrage erlaubt, denn Browser senden bei POST immer `Origin`.
- Falscher `Content-Type` bei JSON-Endpunkten → 403 `verboten`. Upload: `application/octet-stream` schicken. `text/plain`, `multipart/form-data` und `application/x-www-form-urlencoded` werden abgelehnt (403), andere Typen (z. B. `application/pdf` von `fetch(url, {body: file})`) sind erlaubt. Empfehlung ans Frontend: `headers: {'Content-Type': 'application/octet-stream'}` immer explizit setzen.
- Kaputte URL-Kodierung (`/%E0%A4%A`) → 400 `ungueltig`. Unbekannte Methode → 405 `ungueltig`.
- 409 `kaputt` enthält zusätzlich `datei` (relativer Pfad).
- 409 `konflikt` bei `PUT /api/text` enthält zusätzlich `version` (aktuelle Dateiversion).
- `/datei/` folgt keinen Symlinks aus dem jeweiligen Ordner heraus (sonst 404). Erlaubt: `.arbeit/`, `quellen/`, `abbildungen/`, `.claude/kit/docs/`, `Arbeit.pdf`, `Vorschau.pdf`, `Arbeit-neu.pdf` (Ausweichname, wenn Arbeit.pdf beim Bau geöffnet war). `Arbeit.pdf` ist auch direkt unter `/Arbeit.pdf` erreichbar.

### Lesen

- `GET /api/stand` antwortet immer 200. Beschädigte Projektdateien stehen in `stand.kaputt: [rel...]` (aus `ladeStand()`); das Frontend zeigt dann den Hinweis „Datei X ist beschädigt. Sag Claude: /hilfe reparieren“. Wirft eine ältere `ladeStand()` doch, kommt ein Notstand `{schema, root, version, kaputt:[rel], notstand:true}`.
- `stand.standVersion`: dieselbe Version, die per SSE `stand` gesendet wird. Nach `holeStand()` vergleichen spart doppeltes Zeichnen.
- `stand.skills[]` zusätzlich `ordner` (Ordnername unter `.claude/skills/`, für `/api/skill?name=`). `slash` ist false nur bei `user-invocable: false`. `auto` = nicht `disable-model-invocation: true`. `eigen` ist false, solange `.claude/kit/manifest.json` fehlt.
- `stand.pdfBau` zusätzlich `seiten` (Zahl oder null). `datei` ist der Pfad, den `pdf.mjs` gemeldet hat (normal `Arbeit.pdf`, ggf. `Arbeit-neu.pdf`). Ohne Bau in diesem Serverlauf gilt die Änderungszeit von `Arbeit.pdf` als letzter Erfolg für `geaendert_seit`.
- `stand.aenderungen`: Schreibt dieselbe Datei innerhalb von 2 Minuten erneut, wird der oberste Eintrag zusammengefasst (Absätze vereinigt, Wort-Delta addiert, Zeit aktualisiert), damit Autosave die Liste nicht flutet. Gelöschte Absätze erzeugen einen Eintrag mit `absaetze: []` und negativem `woerter_delta`. Änderungen, die bei ausgeschaltetem Server passiert sind, werden beim Start gemeldet; neue Dateien bekommen still einen Schnappschuss.
- `GET /api/text` zusätzlich `zitate_fehlen: [key...]` (Zitierschlüssel, die nicht in `literatur.bib` stehen). `frontmatter` ist ein Objekt (einfaches YAML). `titel`: Frontmatter `titel`/`title`, sonst `nr titel` aus zustand.json, sonst erste Überschrift, sonst Dateiname. Absatzgrenzen wie `absaetze()` in `lib.mjs` (Leerzeilen, Code- und Formelblöcke bleiben ganz).
- `html` im Detail: Überschrift in der ersten Zeile → `<hN>`, Rest des Absatzes dahinter; Codeblock → `<pre><code>`, `$$…$$` → `<pre class="formel">`; `**fett**`, `*kursiv*`, `` `code` ``; Zeilenumbruch → `<br>`. Zitate: jede Quelle einer Gruppe `[@a; @b, S. 4]` wird ein eigenes `<span class="zit" data-key title="Titel">(Autor Jahr, S. 4)</span>`. Autor: Nachname der ersten Person, zwei Personen „A und B“ (Arbeitssprache en: „A and B“), ab drei „A et al.“. Unbekannt: `<span class="zit fehlt" data-key>(key)</span>`.
- `GET /api/skill` zusätzlich `gruppe`. `name` darf Ordner- oder Frontmatter-Name sein.
- `GET /api/check` antwortet `{verfuegbar, ergebnisse, fehler?}`; mehrere gleichzeitige Aufrufe teilen sich einen Lauf.
- SSE `/ereignisse`: beginnt mit `retry: 2000`, dann `hallo` (data: `{version, pid}`) und sofort `stand` (data: `{version}`). Heartbeat `: ping` alle 20 s. `pdf` kommt beim Start eines Baus und beim Ende; danach folgt ein `stand`-Event.
- `window.__MODUS__` zusätzlich `api: 2.1` und `vendor` (`'/vendor/'` live, `null` in der statischen Datei, dort also keine pdf.js-Ansicht anbieten, stattdessen Link auf die Datei).
- `render.mjs` bettet `.claude/kit/dashboard/ui/*.css` (alphabetisch, nach `style.css`) und `.claude/kit/dashboard/ui/*.js` (alphabetisch, **vor** `app.js`) inline ein. Klassische Skripte, kein `import`/`export` (die statische Datei läuft über `file://`). pdf.js wird live per dynamischem `import('/vendor/pdfjs/pdf.min.mjs')` geladen; `.mjs` wird als `text/javascript` ausgeliefert.

### Schreiben

- `POST /api/quelle`: `vorher` enthält genau die geänderten Felder (bei Statuswechsel zusätzlich `entschieden`). Undo = dieselben Felder mit den `vorher`-Werten zurückschicken. Doppelte `id`s im Board werden alle gleich geändert, `anzahl` sagt wie viele. Ohne änderbares Feld → 400.
- `POST /api/upload`: Antwort `{ok, name, pfad, groesse}`. Name wird bereinigt, auf 180 Zeichen gekürzt (Endung bleibt), bei Namensgleichheit `-2`, `-3` … Leere Datei → 400. Über 300 MB → 413, Teildatei wird gelöscht. Undo für Upload gibt es nicht (Datei liegt im Eingang, Claude sortiert).
- `POST /api/termin*`: alle Antworten enthalten `termin`. `erledigt` zusätzlich `vorher: {erledigt}`. `wiederherstellen` mit schon vorhandener ID → 409 `konflikt`.
- `POST /api/kapitel/status`: unbekannte `nr` oder fehlende `nr` → 400. `vorher: {status}`. Undo = `status` zurücksetzen. Alias `/api/kapitel/freigeben`: nicht `geprueft` → 400 mit Erklärung, schon `final` → 400.
- `PUT /api/text`: Antwort `{ok, version, absatz, vorher: {text, hash}, absaetze_anzahl}`. `absatz` ist Absatz `i` nach der Änderung (enthält der neue Text Leerzeilen, entstehen mehrere Absätze, `absatz` ist dann der erste davon; `null`, wenn gelöscht). Leerer `text` löscht den Absatz. Undo = `PUT` mit `i`, `hash: absatz.hash`, `text: vorher.text`. `version` im Körper ist optional, maßgeblich ist `hash`. Zeilenenden (CRLF), BOM und Frontmatter der Datei bleiben erhalten.
- `POST /api/zitat`: Antwort zusätzlich `id` (z. B. `Z3`). Neuer Eintrag hat `seite`, `typ: aussage`, leeres `kapitel`, `original` (Text in Anführungszeichen, innere `"` escapt), `kontext` (= `notiz`, falls da) und `herkunft: dashboard <Datum>`. Fehlt die Datei, wird sie mit Kopfzeilen laut SPEC angelegt.
- `POST /api/pdf/bauen`: Antwort `{ok:true, laeuft:true, schon_gestartet:boolean, pdfBau}`. Läuft höchstens 10 Minuten. Ohne Pandoc/LaTeX endet der Bau mit `ok:false` und einer verständlichen `meldung`.
- `POST /api/stop`: falsche `pid` → 403. `node .claude/kit/dashboard/server.mjs --stoppen` beendet nur einen Server, der auf `/api/ping` mit derselben `pid` und demselben Projekt antwortet; sonst wird nur die veraltete Info-Datei entfernt.
- Journal-Texte (Beispiele): „Quelle smith2020deep genommen“, „Stern für X auf 2 gesetzt“, „Termin „Betreuung“ am 2026-10-12 angelegt“, „Kapitel 2.1 im Dashboard auf „geprüft“ gesetzt (vorher Entwurf)“, „Absatz 3 in kapitel/2-1-x.md im Dashboard korrigiert“ (Absatznummer 1-basiert), „Zitat Z3 aus X (S. 4) im Dashboard gemerkt“, „PDF-Entwurf im Dashboard gebaut (12 Seiten)“ bzw. „PDF-Bau im Dashboard gescheitert: …“. Die Änderungserkennung schreibt kein Journal (Claude kennt seine eigenen Änderungen), nur `aenderungen.json` und Aktivität.

### Umgebung

- `SW_DASHBOARD_ABFRAGE=1` erzwingt die Abfrage alle 2 s statt `fs.watch` (zum Testen des Rückfalls für Linux oder Netzlaufwerke). Ohne die Variable läuft zusätzlich alle 10 s eine Abfrage als Sicherheitsnetz.

## Ergänzungen bei der Integration

- `GET /api/text`: jeder Absatz trägt `zeile` (1-basiert, im Rohtext inklusive Frontmatter) für den Sprung nach VS Code.
- `POST /api/zitat/entfernen` `{bibkey, id}`: entfernt den Block `## <id>` wieder (Rückgängig für `/api/zitat`).

---

# v3 (verbindlich ab Kit 3.0, ersetzt Abweichendes oben)

Alles oben gilt weiter, soweit hier nichts anderes steht. `window.__MODUS__.api` ist `3`, `stand.api` ist `3`.
Ergänzungen kommen nur additiv in diesen Abschnitt (Unterabschnitt „v3 Nachträge“ am Ende).

## v3 Pfade

| Was | Ort |
| --- | --- |
| Kapiteltexte | `kapitel/*.md` |
| Stand, Einstellungen, Plan | `.arbeit/` (`zustand.json`, `einstellungen.md`, `plan.md`, `kandidaten.json`, `stil.md` …) |
| Quellen-Notizen (Kernaussage, Zitate) | `quellen/notizen/<bibkey>.md` |
| Quellen-PDFs, Eingang, Bib | `quellen/pdfs/`, `quellen/eingang/`, `quellen/literatur.bib` |
| LaTeX-Build (nur lesen, für echte Seiten) | `.lokal/build/*.toc` |
| PDF | `Arbeit.pdf` (Ausweich `Arbeit-neu.pdf`) im Root |
| Hilfe-Texte | `.claude/kit/docs/*.md` |

`Vorschau.pdf` entfällt. Die statische Kopie bleibt `dashboard.html` im Root (in VS Code ausgeblendet).

## v3 Entfernt

- `PUT /api/text` (Absatz-Bearbeiten im Browser) samt Konfliktlogik. `PUT` gibt jetzt 405.
- `stand.serie`, `stand.letzte14`, `stand.abzeichen`, `stand.tagesziel`, `stand.plan.tagesziel`, `stand.termine`
  (Termine stehen in `stand.plan`). Der Server schreibt `.lokal/aktivitaet.json` nicht mehr.
- `stand.projekt` (Rohobjekt) entfällt aus Sicht des Frontends. Nur `stand.einstellungen` benutzen.
- Altes Terminformat (`plan.json`, Felder `titel`, `art`, `notiz`). Termine haben jetzt `text`.
- `absaetze[].hash` bleibt zwar in `/api/text`, wird aber für nichts mehr gebraucht.

## v3 VS Code und Pfade

- `stand.vscode` = `"vscode://file"`.
- `stand.root_abs` = Projektordner absolut, immer mit `/` getrennt und mit führendem `/`
  (macOS `/Users/a/arbeit`, Windows `/C:/Users/a/arbeit`).
- Jedes Feld `*_abs` bzw. `pfade.*` hat dieselbe Form. Link bauen:
  `stand.vscode + encodeURI(abs) + ':' + zeile` (ohne Zeile: `+ ':1'`). Beispiel
  `vscode://file/Users/a/arbeit/kapitel/2-1-x.md:14`.
- Für Dateien, die nur relativ bekannt sind: `abs = stand.root_abs + '/' + rel`.

## v3 `GET /api/stand` (Felder, die sich ändern oder neu sind)

```jsonc
{
  "api": 3,
  "vscode": "vscode://file",
  "root_abs": "/Users/a/arbeit",
  "eingerichtet": true,
  "titel": "…",

  "einstellungen": {
    "pfad": ".arbeit/einstellungen.md", "pfad_abs": "/Users/a/arbeit/.arbeit/einstellungen.md", "vorhanden": true,
    "titel": "…", "untertitel": "", "typ": "masterarbeit", "sprache": "de", "fachgebiet": "Chemie",
    "seiten": { "min": 60, "max": 80 },           // null-Werte, wenn nicht gesetzt
    "abgabe": "2027-01-15", "beginn": "2026-09-01",
    "name": "…", "hochschule": "TU Dresden", "betreuer": "Dr. Müller",
    "zitierstil": "chem-acs", "schreibmodus": "gemeinsam",
    "stil": { "ich_form": "nein", "gedankenstriche": "sparsam", "semikolons": "nein", "satz_max_woerter": 30, "kommas_max": 3 },
    "zeilen": { "arbeit.seiten": 12, "arbeit.abgabe": 14, "stil.ich_form": 40 }   // 1-basiert, für den VS-Code-Sprung je Wert
  },

  "umfang": {                                       // das EINE Umfangziel (B6), überall dasselbe zeigen
    "seiten_min": 60, "seiten_max": 80,              // aus einstellungen, null wenn nicht gesetzt
    "seiten": 14.2,                                  // Summe der Kapitel (echt wo gültig, sonst Schätzung), 1 Nachkommastelle
    "woerter": 3900,                                 // Summe der Wörter der Kapitel MIT Gliederungseintrag (B5)
    "woerter_pro_seite": 300,
    "quelle": "schaetzung" | "pdf" | "gemischt",
    "erklaerung": "Geschätzt aus 3.900 Wörtern, 4 Abbildungen und 2 Tabellen. Ziel laut Einstellungen 60 bis 80 Seiten."
  },

  "kapitel": [{
    "nr": "2.1", "titel": "…", "hauptkapitel": "2", "hauptkapitel_titel": "…",
    "datei": "kapitel/2-1-x.md", "pfad_abs": "/Users/a/arbeit/kapitel/2-1-x.md", "vorhanden": true,
    "geaendert": "2026-10-01T20:11:00.000Z",         // mtime der Kapiteldatei oder null
    "status": "entwurf",                             // offen | geplant | entwurf | geprueft | final
    "status_erlaubt": ["offen", "geplant", "entwurf", "geprueft"],  // Ziele, die POST /api/kapitel/status annimmt (B1)
    "woerter": 1830, "abbildungen": 2, "tabellen": 1, "formeln": 3,
    "anteil": 15,                                    // Prozent des Gesamtumfangs
    "seiten": { "schaetzung": 7.4, "echt": 8, "ziel_min": 9, "ziel_max": 12, "quelle": "pdf" },
    // echt: aus .lokal/build/*.toc, nur wenn Kapiteldatei seit dem Bau unverändert, sonst null und quelle "schaetzung"
    "woerter_ziel_min": 2700, "woerter_ziel_max": 3600,   // ziel_* × woerter_pro_seite (für die kleine Wortanzeige)
    "offene_punkte": 3, "plan_vorhanden": true, "pruefung_vorhanden": false,
    "pruefung": ".arbeit/pruefung/pruefung-2.1.md"   // nur wenn vorhanden, sonst null
  }],

  "plan": {
    "pfad": ".arbeit/plan.md", "pfad_abs": "…/.arbeit/plan.md", "vorhanden": true,
    "zeitleiste": [                                  // Meilensteine, Termine und die Abgabe, nach Datum (dann Zeit) sortiert
      { "art": "meilenstein", "id": "m-3", "datum": "2026-11-15", "zeit": "", "text": "Methodik Entwurf",
        "kapitel": ["3"], "status": "entwurf", "erreicht": false, "erledigt": false,
        "ueberfaellig": false, "tage": 45, "zeile": 4 },
      { "art": "termin", "id": "t-1a2b3c4d5e", "datum": "2026-10-20", "zeit": "14:00", "text": "Betreuung Dr. Müller",
        "erledigt": true, "ueberfaellig": false, "tage": 19, "zeile": 8 },
      { "art": "abgabe", "id": "abgabe", "datum": "2027-01-15", "zeit": "", "text": "Abgabe", "erledigt": false,
        "ueberfaellig": false, "tage": 106, "zeile": 14, "pfad": ".arbeit/einstellungen.md" }
    ],
    "meilensteine": [ /* nur art=meilenstein, gleiche Form */ ],
    "termine": [ /* nur art=termin, gleiche Form */ ]
  },
  // Meilenstein erreicht = jedes genannte Kapitel (Nummer oder Hauptkapitel, „alle“ = alle) hat mindestens den Status.
  // erledigt = erreicht (Meilenstein) bzw. „· erledigt“ in plan.md (Termin). ueberfaellig = nicht erledigt und Datum < heute.
  // zeile: 1-basiert in plan.md (bei abgabe in einstellungen.md, Feld pfad).

  "quellen": {
    "liste": [{
      // alle bisherigen Felder (id, bibkey, titel, autoren, jahr, venue, doi, status, stern, markierungen, kapitel,
      // pdf, pdf_vorhanden, in_bib, zitate (Zahl), ausgewertet, herkunft …) bleiben, plus:
      "eigene_notiz": "…",                           // die Board-Notiz der Person (früher Feld notiz)
      "notiz": {                                     // aus quellen/notizen/<bibkey>.md, null wenn die Datei fehlt
        "kern": "Erste bis drei Sätze der Kernaussage.", "zeile_kern": 6,
        "zitate": [{ "id": "Z1", "seite": "1204", "seite_pdf": 2, "typ": "befund", "kapitel": ["2.1"],
                     "original": "…", "paraphrase": "…", "zeile": 9 }]
        // seite: gedruckte Seitenangabe als Text (wie im Heft). seite_pdf: PDF-Seite (Zahl) oder null.
        // Zum Öffnen im PDF-Panel: seite_pdf, sonst Number(seite), wenn das eine Zahl ist.
      },
      "zitiert": [{ "datei": "kapitel/2-1-x.md", "zeile": 14, "kapitel": "2.1", "seite": "S. 4" }],
      // jede Fundstelle von [@key…] in kapitel/*.md, kapitel = nr aus zustand.json oder null, seite = Zusatz im Zitat oder ""
      "pfade": { "pdf": "/Users/a/arbeit/quellen/pdfs/x.pdf", "notiz": "/Users/a/arbeit/quellen/notizen/x.md" },  // absolut oder null
      "rel": { "pdf": "quellen/pdfs/x.pdf", "notiz": "quellen/notizen/x.md" }      // für /datei/<rel>, oder null
    }],
    "zaehler": { "vorschlag": 0, "genommen": 0, "spaeter": 0, "verworfen": 0 },  // genommen zählt bib-only mit (B4: Client nicht selbst zählen)
    "bib_anzahl": 3, "eingang": [], "ausgewertet": 1
  }
}
```

Weiterhin vorhanden: `heute`, `root`, `version`, `phase`, `phaseIndex`, `phaseName`, `phasen`, `naechster_schritt`,
`naechster_command`, `hauptkapitel`, `kapitelOhneEintrag` (zählen nicht zum Umfang, B5), `sonderTexte`, `abgabe`
(`{datum, tage, beginn}`), `kaputt`, `sync`, `verlauf`, `pdf`, `dokumente`, `betreuung`, `aenderungen`, `skills`,
`pdfBau`, `standVersion`. `stand.woerter` bleibt nur aus Kompatibilität, maßgeblich ist `stand.umfang`.

`stand.aenderungen[].datei` zeigt jetzt auf `kapitel/…` bzw. `.arbeit/…`. Beobachtet werden Markdown-Dateien unter
`kapitel/` und `.arbeit/`. Jeder Eintrag zusätzlich `pfad_abs`.

## v3 `GET /api/text?datei=<rel>`

Erlaubt: `.md` unter `kapitel/`, `.arbeit/`, `quellen/notizen/`. Nur lesen. Antwort wie oben plus
`pfad_abs`, `geaendert` (ISO mtime) und je Absatz `nr`: laufende Nummer ohne reine Überschriften
(B22, Überschrift-Absätze haben `nr: null`, `ueberschrift: true`). `zeile` (1-basiert) bleibt.
`html` rendert Formeln nicht selbst: `$…$` und `$$…$$` und `\ce{…}` bleiben als Text, eingebettet in
`<span class="formel-inline">` bzw. `<div class="formel">` (Inhalt escaped, ohne die Dollarzeichen,
Attribut `data-tex`), damit das Frontend KaTeX darauf anwenden kann. `\ce{…}` außerhalb von `$` wird zu
`<span class="formel-inline" data-tex="\ce{…}">`.

## v3 Schreiben

| Methode | Pfad | Körper | Antwort |
| --- | --- | --- | --- |
| POST | `/api/kapitel/status` | `{nr, status}` | `{ok, kapitel, vorher:{status}, undo:{nr, status, rueckgaengig}}` |
| POST | `/api/kapitel/status` (Undo) | `{nr, status, rueckgaengig}` | `{ok, kapitel, vorher:{status}}` |
| POST | `/api/termin` | `{datum, zeit?, text}` | `{ok, termin}` (`termin` in Zeitleisten-Form) |
| POST | `/api/termin/erledigt` | `{id, erledigt}` | `{ok, termin, vorher:{erledigt}}` |
| POST | `/api/termin/loeschen` | `{id}` | `{ok, termin, zeile}` |
| POST | `/api/termin/wiederherstellen` | `{termin, zeile?}` | `{ok, termin}` |
| POST | `/api/quelle` | `{id, status?, stern?, eigene_notiz?, markierungen?, kapitel?}` | wie v2.1 (`notiz` als String wird weiter als `eigene_notiz` angenommen) |
| POST | `/api/zitat` | `{bibkey, seite, seite_pdf?, text, notiz?}` | `{ok, datei, id}` |
| POST | `/api/zitat/entfernen` | `{bibkey, id}` | `{ok}` |
| POST | `/api/upload?name=` | Bytes | wie v2.1 |
| POST | `/api/pdf/bauen` | `{}` | wie v2.1 |
| POST | `/api/stop` | `{pid}` | wie v2.1 |

Kapitelstatus (B1, B2):
- Reihenfolge `offen → geplant → entwurf → geprueft → final`. Rückwärts jederzeit, vorwärts nur einen Schritt,
  `final` nur aus `geprueft`. Sonst 400 `ungueltig` mit Erklärung (z. B. „Kapitel 2.1 ist im Entwurf. Freigeben geht
  erst nach der Prüfung. Sag Claude: /pruefen 2.1“). Gleicher Status → 200 ohne Änderung, `undo: null`.
- `undo` ist genau der Körper für das Rückgängig: der Server setzt den alten Status ohne Reihenfolgeprüfung und
  **entfernt den Verlaufseintrag** der ursprünglichen Änderung. Kein neuer Verlaufseintrag. `rueckgaengig` ist ein
  Kennzeichen, das der Server nur für diesen Serverlauf kennt. Unbekannt, oder Kapitel hat inzwischen einen anderen
  Status → 409 `konflikt` („Das lässt sich nicht mehr rückgängig machen.“).
- `/api/kapitel/freigeben` `{nr}` bleibt als Alias für `status: final` (gleiche Antwort mit `undo`).

Termine (`.arbeit/plan.md`, Abschnitt `## Termine`):
- `id` ist stabil, solange Datum, Zeit und Text gleich bleiben (`t-` + 10 Hex aus sha1 von `datum|zeit|text`,
  bei Duplikaten `-2`, `-3`). Nach `erledigt` bleibt die `id` gleich.
- `datum` `JJJJ-MM-TT` Pflicht, `zeit` `HH:MM` optional, `text` Pflicht (≤ 200 Zeichen, kein `·`, keine Zeilenumbrüche;
  `·` wird zu `-`). `titel` wird als Alias für `text` angenommen.
- Neu: Zeile wird nach Datum einsortiert. Fehlt `plan.md` oder der Abschnitt, legt der Server ihn an.
- `loeschen` antwortet mit `zeile` (1-basiert, vor dem Löschen). Undo = `wiederherstellen` mit `termin` und
  `zeile`: die Zeile kommt an dieselbe Stelle zurück (bzw. ans Ende des Abschnitts, wenn sich die Datei inzwischen
  stark geändert hat). Gibt es dieselbe `id` schon → 409 `konflikt`.
- Unbekannte `id` → 404. Meilensteine sind im Dashboard nicht änderbar (die pflegt Claude in `plan.md`).

Zitate (B3): `seite` ist die gedruckte Seitenzahl (Text, z. B. `1204` oder `iv`), `seite_pdf` die PDF-Seite (Zahl).
Der Server schreibt `- seite:` und, wenn `seite_pdf` gesetzt und von `seite` verschieden, `- seite_pdf:`. Ohne
gedruckte Seitenzahl schickt das Frontend `seite: ""` und `seite_pdf`; dann schreibt der Server
`- seite: [PDF-Seite N, bitte prüfen]`.

## v3 Live-Aktualisierung (SSE `/ereignisse`)

- `stand` (data `{version}`) kommt, wenn sich der Stand ändert. Beobachtet: `kapitel/`, `.arbeit/`, `quellen/`
  (bib, notizen, pdfs, eingang), `abbildungen/`, `.claude/skills/`, `.lokal/build/*.toc`, `Arbeit.pdf`,
  `Arbeit-neu.pdf`, außerdem neu angelegte dieser Ordner. Sicherheitsnetz: alle 5 s Vergleich der Stand-Version.
- **Neu** `datei` (data `{pfade:[rel…]}`): kommt bei jeder Änderung einer beobachteten Datei, auch wenn sich der
  Stand dadurch nicht ändert (z. B. Tippfehler im Kapitel). Damit lädt die offene Leseansicht `/api/text` neu und der
  PDF-Viewer `Arbeit.pdf`. Gebündelt (≈ 300 ms), höchstens 50 Pfade je Ereignis.
- `pdf` wie bisher.

## v3 `/datei/<rel>`

Erlaubte Ordner: `kapitel/`, `.arbeit/`, `quellen/`, `abbildungen/`, `daten/`, `.claude/kit/docs/`. Erlaubte
Dateien: `Arbeit.pdf`, `Arbeit-neu.pdf`. Rest wie v2.1 (keine Symlinks hinaus, kein `..`).

## v3 Nachträge

Stand nach Integration mit `ladeStand()` (Strang A) und Servertest, 2026-10-01. Alles additiv.

- `kapitel[].status_erlaubt` enthält den **aktuellen Status mit** (Menü zeigt genau diese Einträge, B1).
  Zusätzlich je Kapitel: `anteil_gesetzt` (bool), `seiten.pdf_veraltet` (bool: im PDF, aber Datei seither
  geändert), `woerter_ziel` (Mitte aus `woerter_ziel_min/max`, nur Kompatibilität).
- `kapitelOhneEintrag[]`: `{name, datei, pfad_abs, groesse, geaendert, woerter}`.
- `umfang` zusätzlich `abbildungen`, `tabellen`, `formeln` (Summen). `erklaerung` ist ein fertiger deutscher Satz.
- `plan.zeitleiste[]`: Meilenstein-IDs sind `m-1`, `m-2` … (Reihenfolge in plan.md). Termine können zusätzlich `ort`
  und `notiz` haben. Bei gleichem Datum stehen Meilensteine vor Terminen. `plan.fehler: [{zeile, text, grund}]`
  listet Zeilen in plan.md, die nicht lesbar waren (Hinweis anzeigen, Klick → VS Code an der Zeile).
- `quellen.liste[].notiz_geaendert` (ISO mtime der Notizdatei), nur wenn es eine gibt.
- `quellen.liste[].notiz.zitate[].seite` kann `PDF-Seite N, bitte prüfen` lauten (aus dem Dashboard ohne gedruckte
  Seitenzahl übernommen). Dann `seite_pdf` zum Öffnen nehmen und die Seite als „noch prüfen“ kennzeichnen.
- `einstellungen` zusätzlich `port`. `zeilen` hat einen Eintrag je Schlüssel, der in der Datei steht.
- `stand.einstellungen_datei`, `stand.altes_layout` (true, wenn noch `arbeit/projekt.json` o. ä. herumliegt: Hinweis
  „Sag Claude: /update“) kommen aus `ladeStand()`.
- SSE `datei`: `pfade` kann auch Ordnernamen enthalten (z. B. `abbildungen`, wenn der Ordner neu angelegt wurde).
  Die Liste ist nicht zwingend dedupliziert über mehrere Ereignisse.
- `/api/text` `html`, weitere Formen:
  - Erzählendes Zitat `@key` im Fließtext → `<span class="zit erzaehlend" data-key title>Autor et al. (2019)</span>`,
    unbekannt → `<span class="zit fehlt" data-key>key</span>` (auch in `zitate_fehlen`).
  - Abbildung `![Text](../abbildungen/x.png){#fig:x}` → `<figure class="abbildung"><img src="/datei/abbildungen/x.png"
    data-rel="abbildungen/x.png" alt loading="lazy"><figcaption>Text</figcaption></figure>`. Pfad außerhalb
    `abbildungen/`, `daten/`, `quellen/`, `kapitel/` → `<figure class="abbildung fehlt"><figcaption>`. In der statischen
    Kopie funktioniert `/datei/` nicht: dort `data-rel` relativ zum Projektordner nutzen oder das Bild ausblenden.
  - Pipe-Tabelle → `<table class="tabelle"><thead>…</thead><tbody>…</tbody></table>`, eine direkt folgende
    Beschriftung `: Text {#tbl:x}` → `<p class="tabellen-titel">Text</p>`.
  - Formeln: `<span class="formel-inline" data-tex>` und `<div class="formel" data-tex>` (Block, ersetzt das frühere
    `<pre class="formel">`). KaTeX liegt nur live unter `/vendor/` (statisch ist `__MODUS__.vendor` null, dann bleibt
    der TeX-Text stehen).
- `POST /api/kapitel/status` Undo antwortet `{ok, kapitel, vorher}` (ohne `undo`). Der Server nutzt dafür
  `rueckgaengigStatus()` aus `zustand.mjs` mit der `verlauf_id` der ursprünglichen Änderung.
- `POST /api/quelle` Antwort: `quelle.eigene_notiz` gesetzt, `vorher.eigene_notiz` zusätzlich zu `vorher.notiz`, wenn
  die Notiz geändert wurde. `notiz` als Nicht-Text → 400.
- `POST /api/termin*`: Text darf kein `·` enthalten (wird zu `-`). `zeit` wird auf `HH:MM` normalisiert (`9:30` →
  `09:30`). Ungültige Zeit (`25:00`) → 400.
- Kein `.lokal/aktivitaet.json` mehr vom Server. Journal-Texte wie v2.1, neu: „Statusänderung von Kapitel 2.1 im
  Dashboard zurückgenommen (wieder Entwurf)“, „Zitat Z4 aus X (PDF-Seite 3, gedruckte Seite noch prüfen) im Dashboard
  gemerkt“.
- Live-Aktualisierung intern: `server/beobachter.mjs` (fs.watch je Ordner + Projektordner flach + `.lokal/build`
  flach, tote Beobachter werden ersetzt, Abfrage alle 10 s bzw. 2 s mit `SW_DASHBOARD_ABFRAGE=1`). Stand-Vergleich
  alle 5 s (ein Stand kostet etwa 15 ms).

### Erweiterungs-API im Browser (Frontend v3)
`window.SW = { stand(), neuZeichnen(), auftrag(cmd, text, sofort), anhaengen(obj), reiter(id), toast(text, rueckgaengig), panel(hash) }`.
`SW.baustein` aus v2.1 entfällt, Ersatz ist `SW.anhaengen`. `SW.panel(hash)` kennt `#kapitel/<nr>`, `#text/<rel>`,
`#quelle/<id>[/s<seite>]`, `#arbeit[/s<seite>]`, `#expose[/s<seite>]` (ab v3.1) und `#skill/<name>`. Eigene Erweiterungen: `.arbeit/dashboard-anpassungen.js`.
Abbildungspfade in Kapiteln sind relativ zum Projektroot (`abbildungen/x.png`), Fallback relativ zur Datei.

## v3.1 Nachträge (Kit 3.0.0, Stand 2026-10-02)

Alles additiv, `api` bleibt `3`. Gilt für `GET /api/stand` und die eingebettete `dashboard.html` gleich (beide
kommen aus `ladeStand()` plus `anreichern()`).

### Flexible Gliederung

Eine Kapiteldatei ist eine **Schreibeinheit** mit Status, auf beliebiger Ebene (`nr` `"3"`, `"3.2"`, `"3.2.1"`,
gemischt erlaubt). Alles darunter kommt zur Laufzeit aus den Überschriften der Datei, nie aus `zustand.json`.
Regel: Die Datei beginnt mit genau einer Überschrift für die Einheit (ohne Nummer, empfohlen so viele `#` wie die
`nr` Ebenen hat). Titel: Sobald die Datei eine Kopfüberschrift hat, gilt deren Text.

`stand.kapitel[]` zusätzlich (sortiert nach `nr`, numerisch je Ebene):

```jsonc
{
  "nr": "4.1", "ebene": 2,                        // Tiefe der nr (1 = Kapitel)
  "titel": "Synthese der Komplexe",               // aus der Kopfüberschrift der Datei, sonst zustand.json
  "titel_zustand": "Synthese", "titel_abweichung": true,   // Abweichung meldet check.mjs, --reparieren übernimmt
  "hauptkapitel": "4", "hauptkapitel_titel": "Ergebnisse und Diskussion",
  "datei": "kapitel/04-01-synthese-der-komplexe.md",
  "datei_umbenannt": false,                       // true: zustand.datei fehlte, genau eine Datei mit gleicher
  "datei_zustand": "kapitel/4-1-alt.md",          //   Nummer gefunden und zugeordnet (nur dann vorhanden)
  "kopf_fehlt": false, "kopf_zeile": 1,           // Datei beginnt nicht mit einer Überschrift / Zeile der Kopfüberschrift
  "abschnitte": [                                 // Überschriften unterhalb der Kopfüberschrift, in Dateireihenfolge
    { "ebene": 3, "nr": "4.1.1", "titel": "Ligandensynthese", "zeile": 5, "woerter": 9, "woerter_gesamt": 9 },
    { "ebene": 3, "nr": "4.1.2", "titel": "Komplexierung", "zeile": 9, "woerter": 10, "woerter_gesamt": 31 },
    { "ebene": 4, "nr": "4.1.2.1", "titel": "Ausbeuten", "zeile": 13, "woerter": 21, "woerter_gesamt": 21 },
    { "ebene": 3, "nr": null, "titel": "Vergleich mit der Literatur", "zeile": 20, "woerter": 7, "woerter_gesamt": 7, "anker": "sec:vergleich" }
  ]
  // ebene absolut (1 = Kapitel). nr berechnet wie LaTeX (bis Ebene 4), null bei {-} / {.unnumbered} und tiefer.
  // zeile 1-basiert in der Datei (für den Editor-Sprung). woerter = eigener Text bis zur nächsten Überschrift,
  // woerter_gesamt = mit allen Unterabschnitten. Code-Blöcke, Kommentare, Frontmatter und $$-Blöcke zählen nicht,
  // Attribute ({#sec:x}, {-}) und alte Nummern im Titel sind abgeschnitten. Die Kopfüberschrift steht nicht in der Liste.
}
```

`stand.gruppen[]` (neu): jede Nummer, unter der mindestens eine Einheit liegt (Hauptkapitel, die in Unterdateien
aufgeteilt sind, und Zwischenebenen). Für den Baum im Reiter Gliederung.

```jsonc
{ "nr": "4", "ebene": 1, "titel": "Ergebnisse und Diskussion", "einheit": false,   // einheit: es gibt auch eine Datei "4"
  "einheiten": ["4.1", "4.2"], "status": "offen",                                   // status: niedrigster der Einheiten
  "woerter": 52, "anteil": 45, "seiten": { "schaetzung": 0.2, "aktuell": 0.2, "ziel_min": 27, "ziel_max": 36 } }
```

Titel einer Gruppe: `zustand.hauptkapitel[]` (jetzt auf jeder Ebene erlaubt, optional mit `anteil`), sonst die
gleichnamige Einheit. Meilensteine `kapitel: 3.2` treffen 3.2 und alles darunter; gibt es keine solche Einheit,
die Einheit, die 3.2 enthält.

Anteile und Seitenziele (`seiten.mjs`): Hauptkapitel bekommen ihren Anteil nach Kapiteltyp, bei
`arbeit.fachprofil: naturwissenschaft` (oder Fachgebiet Chemie, Physik, Biologie …) Einleitung 8, Grundlagen 20,
Experimenteller Teil/Methodik 20, Ergebnisse (und Diskussion) 45, Fazit/Zusammenfassung/Ausblick 7 Prozent, sonst
9/22/15/25/17/8. Innerhalb eines Hauptkapitels gleich auf die Untereinheiten je Ebene; eine Einleitungseinheit
(`3` neben `3.1`) wiegt 0,15, außer sie hat selbst Unterabschnitte der nächsten Ebene (dann je Abschnitt 1).
Gesetzte `anteil`-Werte gelten fest.

Echte Seiten: pdf.mjs schreibt je Einheit `\kitEinheit{nr}{seite}` ins Inhaltsverzeichnis, dadurch passt die
Zuordnung bei jeder Tiefe und bei Nummerierungslücken. Ist eine Einheit seit dem Bau geändert, neu oder leer
geworden, gelten ihre und alle späteren echten Seiten als veraltet (`seiten.echt: null`, `seiten.pdf_veraltet: true`).
`stand.umfang.bau`: `{ zeit, marken }` des letzten erfolgreichen Baus oder `null`.

### Editor (VS Code oder Cursor)

```jsonc
{
  "editor": "cursor",                              // 'vscode' | 'cursor'
  "editor_name": "Cursor",                         // 'VS Code' | 'Cursor'
  "editor_quelle": "erkannt",                      // 'einstellung' | 'erkannt' | 'standard'
  "editor_einstellung": "automatisch",             // Wert von technik.editor: automatisch | vscode | cursor
  "vscode": "cursor://file",                       // Name bleibt (Kompatibilität): Präfix für Dateilinks wie in „v3 VS Code und Pfade“
  "claude_uri": "cursor://anthropic.claude-code/open?prompt="   // + encodeURIComponent(prompt)
}
```

Automatisch: `CURSOR_CLI`/`CURSOR_AGENT` gesetzt → Cursor; sonst enthält `VSCODE_GIT_ASKPASS_NODE`,
`__CFBundleIdentifier` oder `VSCODE_IPC_HOOK_CLI` „cursor“ → Cursor; sonst VS Code (`erkannt`, wenn VS-Code-Spuren
da sind, sonst `standard`). Erkannt wird in der Umgebung des Server-Prozesses. `stand.einstellungen.editor` = Wert
der Einstellung.

| Methode | Pfad | Körper | Antwort |
| --- | --- | --- | --- |
| POST | `/api/editor` | `{editor: "automatisch" \| "vscode" \| "cursor"}` | `{ok, editor, editor_name, editor_quelle, editor_einstellung, vscode, claude_uri, vorher:{editor}}`; schreibt `technik.editor` in `.arbeit/einstellungen.md` (Zeile wird ergänzt, falls sie fehlt). Unbekannt → 400. Undo = `vorher.editor` zurückschicken |

### PDF

`stand.pdf` behält `vorhanden` und `geaendert` (jetzt die tatsächlich gültige Datei) und bekommt:

```jsonc
"pdf": {
  "vorhanden": true, "geaendert": "2026-10-02T09:17:41.270Z", "datei": "Arbeit.pdf",
  "arbeit": {                                       // null, wenn es noch keins gibt
    "datei": "Arbeit-neu.pdf",                      // die neuere von Arbeit.pdf und Arbeit-neu.pdf (Windows-Sperre beim Bau)
    "url": "/datei/Arbeit-neu.pdf", "pfad_abs": "/Users/a/arbeit/Arbeit-neu.pdf",
    "zeit": "…", "seiten": 11,                      // aus dem letzten Bau, sonst aus dem PDF gezählt (oder null)
    "ausweich": true,                               // true: es ist die -neu-Datei (Hinweis: PDF-Programm schließen, neu bauen)
    "veraltet": true, "geaendert_seit": ["2.3", "quellen/literatur.bib"]   // Einheiten bzw. Dateien, die neuer sind als das PDF
  },
  "expose": { /* gleiche Form für Expose.pdf / Expose-neu.pdf, veraltet gegen .arbeit/expose/expose.md */ }
}
```

| Methode | Pfad | Körper | Antwort |
| --- | --- | --- | --- |
| POST | `/api/pdf/oeffnen` | `{art: "arbeit" \| "expose"}` oder `{datei: "Arbeit.pdf" \| "Arbeit-neu.pdf" \| "Expose.pdf" \| "Expose-neu.pdf" \| "quellen/pdfs/<x>.pdf"}` oder `{bibkey}` | öffnet im PDF-Programm des Systems (macOS `open`, Windows `explorer.exe`, Linux `xdg-open`), `{ok, datei}`. Andere Dateien oder fehlend → 404, ohne Angabe → 400 |

`/datei/` liefert zusätzlich `Expose-neu.pdf`. Der Beobachter meldet `Expose-neu.pdf` mit.

### Quellen

`stand.quellen.liste[]` zusätzlich:
- `pdf_abs` (absolut, auch für PDFs außerhalb des Projekts), `pdf_herkunft`: `board` (Feld `pdf` in kandidaten.json),
  `ordner` (`quellen/pdfs/<bibkey>.pdf`) oder `bib` (Feld `file` der bib, Zotero/Better BibTeX, JabRef, Mendeley;
  relative Pfade gelten zu `quellen/`, dann zum Projekt). Liegt das PDF außerhalb des Projekts, ist `pdf` null,
  `pdf_vorhanden` true, `pfade.pdf` absolut und `rel.pdf` null (nicht über `/datei/`, aber `POST /api/pdf/oeffnen {bibkey}`).
- `bibkey_ueber_doi: true`: Vorschlag ohne bibkey, dessen DOI schon in der bib steht. Dann trägt er den bibkey, steht
  nicht doppelt in der Liste und zählt als `genommen` (`status_board` = gespeicherter Status, wenn das vorher
  `vorschlag` oder `spaeter` war).

`stand.quellen.abgleich` (neu, über alle `kapitel/**/*.md`, Querverweise `@fig:` `@tbl:` `@eq:` `@sec:` ausgenommen):

```jsonc
{
  "zitiert": 4,                                                   // Zahl der verschiedenen zitierten Schlüssel
  "nicht_in_bib": [{ "key": "neu2024", "stellen": [{ "datei": "kapitel/04-02-x.md", "zeile": 3, "kapitel": "4.2" }] }],
  "nie_zitiert": ["mueller2020"],                                 // in literatur.bib, nirgends zitiert
  "ohne_notiz":  [{ "key": "lee2018", "stellen": [ … ] }],        // zitiert, in bib, keine quellen/notizen/<key>.md
  "ohne_pdf":    [{ "key": "weber2021", "stellen": [ … ] }]       // zitiert, in bib, kein PDF (auf keinem der drei Wege)
}
```

### Last

- Der Stand entsteht neu bei jedem Beobachter-Ereignis und nach jeder Schreibaktion (gebündelt, 350 ms), sonst nur
  alle 60 s (Datumswechsel, Git). `GET /api/stand` antwortet aus dem Cache, solange seit dem letzten Stand nichts
  gemeldet wurde und er jünger als 5 s ist.
- `git status` fragt `git-lage.mjs` (`gitLageGecached`) höchstens alle 60 s ab; `stand.sync.ungesichert` kann so
  bis zu einer Minute alt sein.
