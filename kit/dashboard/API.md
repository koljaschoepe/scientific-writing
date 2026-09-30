# Dashboard-API (v2.1)

Server: `kit/dashboard/server.mjs`, nur `127.0.0.1`. Alle Antworten JSON (außer Dateien/SSE).
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
| GET | `/api/text?datei=<rel>` | `{datei, titel, version, woerter, absaetze:[{i, text, html, hash, geaendert}], frontmatter}` für `.md` unter `arbeit/` |
| GET | `/api/skill?name=<name>` | `{name, beschreibung, inhalt, pfad, eigen}` |
| GET | `/datei/<rel>` | Rohdatei aus erlaubten Ordnern (`arbeit/`, `quellen/`, `abbildungen/`, `Arbeit.pdf`, `Vorschau.pdf`) |
| GET | `/vendor/<rel>` | Dateien aus `kit/dashboard/vendor/` (pdf.js) |

`version` einer Textdatei = `mtimeMs + ':' + size` als String.
`hash` eines Absatzes = erste 12 Hex-Zeichen von sha1(text).
`html` = sicher escapter Absatz mit einfacher Markdown-Auszeichnung (Überschrift, *kursiv*, **fett**, `[@key]` →
`<span class="zit" data-key="key">(Autor Jahr)</span>` wenn in literatur.bib, sonst `<span class="zit fehlt">`).

`stand.aenderungen`: `[{zeit, datei, titel, absaetze:[i...], woerter_delta}]`, neueste zuerst, max. 30,
gerätelokal aus `.lokal/aenderungen.json`. Der Server erkennt sie selbst per `fs.watch` auf `arbeit/`
(Markdown) durch Vergleich mit dem letzten Schnappschuss in `.lokal/schnappschuss/`.

`stand.skills`: `[{name, beschreibung, gruppe, slash:true, auto:boolean, eigen:boolean, argument}]`,
aus `.claude/skills/*/SKILL.md` Frontmatter. `gruppe` aus Frontmatter-Feld `gruppe`
(`arbeit` | `quellen` | `technik`), sonst `eigene`. `eigen` = nicht in `kit/manifest.json`.

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
| POST | `/api/zitat` | `{bibkey, seite, text, notiz?}` | hängt ein Zitat an `quellen/zitate/<bibkey>.md` an (Format laut SPEC), `{ok, datei}` |
| POST | `/api/pdf/bauen` | `{}` | startet `node kit/werkzeuge/pdf.mjs entwurf --json` im Hintergrund; läuft schon → `{ok, laeuft:true}`. Ergebnis per SSE `pdf` |
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
- `/datei/` folgt keinen Symlinks aus dem jeweiligen Ordner heraus (sonst 404). Erlaubt: `arbeit/`, `quellen/`, `abbildungen/`, `docs/`, `Arbeit.pdf`, `Vorschau.pdf`, `Arbeit-neu.pdf` (Ausweichname, wenn Arbeit.pdf beim Bau geöffnet war). `Arbeit.pdf` ist auch direkt unter `/Arbeit.pdf` erreichbar.

### Lesen

- `GET /api/stand` antwortet immer 200. Beschädigte Projektdateien stehen in `stand.kaputt: [rel...]` (aus `ladeStand()`); das Frontend zeigt dann den Hinweis „Datei X ist beschädigt. Sag Claude: /hilfe reparieren“. Wirft eine ältere `ladeStand()` doch, kommt ein Notstand `{schema, root, version, kaputt:[rel], notstand:true}`.
- `stand.standVersion`: dieselbe Version, die per SSE `stand` gesendet wird. Nach `holeStand()` vergleichen spart doppeltes Zeichnen.
- `stand.skills[]` zusätzlich `ordner` (Ordnername unter `.claude/skills/`, für `/api/skill?name=`). `slash` ist false nur bei `user-invocable: false`. `auto` = nicht `disable-model-invocation: true`. `eigen` ist false, solange `kit/manifest.json` fehlt.
- `stand.pdfBau` zusätzlich `seiten` (Zahl oder null). `datei` ist der Pfad, den `pdf.mjs` gemeldet hat (normal `Arbeit.pdf`, ggf. `Arbeit-neu.pdf`). Ohne Bau in diesem Serverlauf gilt die Änderungszeit von `Arbeit.pdf` als letzter Erfolg für `geaendert_seit`.
- `stand.aenderungen`: Schreibt dieselbe Datei innerhalb von 2 Minuten erneut, wird der oberste Eintrag zusammengefasst (Absätze vereinigt, Wort-Delta addiert, Zeit aktualisiert), damit Autosave die Liste nicht flutet. Gelöschte Absätze erzeugen einen Eintrag mit `absaetze: []` und negativem `woerter_delta`. Änderungen, die bei ausgeschaltetem Server passiert sind, werden beim Start gemeldet; neue Dateien bekommen still einen Schnappschuss.
- `GET /api/text` zusätzlich `zitate_fehlen: [key...]` (Zitierschlüssel, die nicht in `literatur.bib` stehen). `frontmatter` ist ein Objekt (einfaches YAML). `titel`: Frontmatter `titel`/`title`, sonst `nr titel` aus zustand.json, sonst erste Überschrift, sonst Dateiname. Absatzgrenzen wie `absaetze()` in `lib.mjs` (Leerzeilen, Code- und Formelblöcke bleiben ganz).
- `html` im Detail: Überschrift in der ersten Zeile → `<hN>`, Rest des Absatzes dahinter; Codeblock → `<pre><code>`, `$$…$$` → `<pre class="formel">`; `**fett**`, `*kursiv*`, `` `code` ``; Zeilenumbruch → `<br>`. Zitate: jede Quelle einer Gruppe `[@a; @b, S. 4]` wird ein eigenes `<span class="zit" data-key title="Titel">(Autor Jahr, S. 4)</span>`. Autor: Nachname der ersten Person, zwei Personen „A und B“ (Arbeitssprache en: „A and B“), ab drei „A et al.“. Unbekannt: `<span class="zit fehlt" data-key>(key)</span>`.
- `GET /api/skill` zusätzlich `gruppe`. `name` darf Ordner- oder Frontmatter-Name sein.
- `GET /api/check` antwortet `{verfuegbar, ergebnisse, fehler?}`; mehrere gleichzeitige Aufrufe teilen sich einen Lauf.
- SSE `/ereignisse`: beginnt mit `retry: 2000`, dann `hallo` (data: `{version, pid}`) und sofort `stand` (data: `{version}`). Heartbeat `: ping` alle 20 s. `pdf` kommt beim Start eines Baus und beim Ende; danach folgt ein `stand`-Event.
- `window.__MODUS__` zusätzlich `api: 2.1` und `vendor` (`'/vendor/'` live, `null` in der statischen Datei, dort also keine pdf.js-Ansicht anbieten, stattdessen Link auf die Datei).
- `render.mjs` bettet `kit/dashboard/ui/*.css` (alphabetisch, nach `style.css`) und `kit/dashboard/ui/*.js` (alphabetisch, **vor** `app.js`) inline ein. Klassische Skripte, kein `import`/`export` (die statische Datei läuft über `file://`). pdf.js wird live per dynamischem `import('/vendor/pdfjs/pdf.min.mjs')` geladen; `.mjs` wird als `text/javascript` ausgeliefert.

### Schreiben

- `POST /api/quelle`: `vorher` enthält genau die geänderten Felder (bei Statuswechsel zusätzlich `entschieden`). Undo = dieselben Felder mit den `vorher`-Werten zurückschicken. Doppelte `id`s im Board werden alle gleich geändert, `anzahl` sagt wie viele. Ohne änderbares Feld → 400. Wird eine Quelle `genommen`, zählt das in `.lokal/aktivitaet.json` als Quelle des Tages.
- `POST /api/upload`: Antwort `{ok, name, pfad, groesse}`. Name wird bereinigt, auf 180 Zeichen gekürzt (Endung bleibt), bei Namensgleichheit `-2`, `-3` … Leere Datei → 400. Über 300 MB → 413, Teildatei wird gelöscht. Undo für Upload gibt es nicht (Datei liegt im Eingang, Claude sortiert).
- `POST /api/termin*`: alle Antworten enthalten `termin`. `erledigt` zusätzlich `vorher: {erledigt}`. `wiederherstellen` mit schon vorhandener ID → 409 `konflikt`.
- `POST /api/kapitel/status`: unbekannte `nr` oder fehlende `nr` → 400. `vorher: {status}`. Undo = `status` zurücksetzen. Alias `/api/kapitel/freigeben`: nicht `geprueft` → 400 mit Erklärung, schon `final` → 400.
- `PUT /api/text`: Antwort `{ok, version, absatz, vorher: {text, hash}, absaetze_anzahl}`. `absatz` ist Absatz `i` nach der Änderung (enthält der neue Text Leerzeilen, entstehen mehrere Absätze, `absatz` ist dann der erste davon; `null`, wenn gelöscht). Leerer `text` löscht den Absatz. Undo = `PUT` mit `i`, `hash: absatz.hash`, `text: vorher.text`. `version` im Körper ist optional, maßgeblich ist `hash`. Zeilenenden (CRLF), BOM und Frontmatter der Datei bleiben erhalten.
- `POST /api/zitat`: Antwort zusätzlich `id` (z. B. `Z3`). Neuer Eintrag hat `seite`, `typ: aussage`, leeres `kapitel`, `original` (Text in Anführungszeichen, innere `"` escapt), `kontext` (= `notiz`, falls da) und `herkunft: dashboard <Datum>`. Fehlt die Datei, wird sie mit Kopfzeilen laut SPEC angelegt.
- `POST /api/pdf/bauen`: Antwort `{ok:true, laeuft:true, schon_gestartet:boolean, pdfBau}`. Läuft höchstens 10 Minuten. Ohne Pandoc/LaTeX endet der Bau mit `ok:false` und einer verständlichen `meldung`.
- `POST /api/stop`: falsche `pid` → 403. `node kit/dashboard/server.mjs --stoppen` beendet nur einen Server, der auf `/api/ping` mit derselben `pid` und demselben Projekt antwortet; sonst wird nur die veraltete Info-Datei entfernt.
- Journal-Texte (Beispiele): „Quelle smith2020deep genommen“, „Stern für X auf 2 gesetzt“, „Termin „Betreuung“ am 2026-10-12 angelegt“, „Kapitel 2.1 im Dashboard auf „geprüft“ gesetzt (vorher Entwurf)“, „Absatz 3 in arbeit/kapitel/2-1-x.md im Dashboard korrigiert“ (Absatznummer 1-basiert), „Zitat Z3 aus X (S. 4) im Dashboard gemerkt“, „PDF-Entwurf im Dashboard gebaut (12 Seiten)“ bzw. „PDF-Bau im Dashboard gescheitert: …“. Die Änderungserkennung schreibt kein Journal (Claude kennt seine eigenen Änderungen), nur `aenderungen.json` und Aktivität.

### Umgebung

- `SW_DASHBOARD_ABFRAGE=1` erzwingt die Abfrage alle 2 s statt `fs.watch` (zum Testen des Rückfalls für Linux oder Netzlaufwerke). Ohne die Variable läuft zusätzlich alle 10 s eine Abfrage als Sicherheitsnetz.

## Ergänzungen bei der Integration

- `GET /api/text`: jeder Absatz trägt `zeile` (1-basiert, im Rohtext inklusive Frontmatter) für den Sprung nach VS Code.
- `POST /api/zitat/entfernen` `{bibkey, id}`: entfernt den Block `## <id>` wieder (Rückgängig für `/api/zitat`).
