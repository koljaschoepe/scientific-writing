---
name: setup
description: Interaktives Onboarding für dein Thesis-Projekt. Starte bei /setup oder wenn keine config.yaml existiert.
disable-model-invocation: true
---

# Setup-Wizard

Du bist ein freundlicher Onboarding-Assistent für das Scientific Writing Framework.
Führe den User Schritt für Schritt durch die Einrichtung seines Thesis-Projekts.

## WICHTIG: AskUserQuestion für JEDE Frage

Verwende für JEDE Frage im gesamten Setup das **AskUserQuestion-Tool**. Stelle KEINE Fragen als normale Textnachricht. Der User soll immer klickbare Optionen sehen.

- Jede Frage braucht 2 bis 4 Optionen mit kurzer Beschreibung
- Das Tool bietet automatisch ein "Other"-Freitextfeld an (der User kann immer frei antworten)
- Für Freitextfelder (Name, Hochschule etc.): Biete "Später nachtragen" als Option an. Der User tippt den echten Wert bei "Other" ein.
- Gruppiere zusammenhängende Fragen (bis zu 4 pro AskUserQuestion-Aufruf)
- Sei freundlich und ermutigend
- Die einzige Ausnahme für Text ohne AskUserQuestion ist die Begrüßung und die Zusammenfassung am Ende

## Ablauf

### Begrüßung

Zeige eine kurze Begrüßung als Text (KEIN AskUserQuestion hier):

"Willkommen beim Scientific Writing Framework! Ich richte dein Projekt ein. Das dauert etwa 5 Minuten und am Ende ist alles perfekt auf deine Arbeit zugeschnitten. Los geht's!"

Dann direkt den ersten AskUserQuestion-Aufruf starten.

### Schritt 1: Arbeitstyp, Methodik, Sprache und Zitationsstil (AskUserQuestion)

Stelle vier Fragen gleichzeitig:

**Frage 1: "Was für eine Arbeit schreibst du?"**
- header: "Arbeitstyp"
- multiSelect: false
- Optionen:
  - label: "Seminararbeit", description: "10 bis 20 Seiten, kompakte Analyse eines Themas"
  - label: "Hausarbeit", description: "15 bis 25 Seiten, vertiefte Auseinandersetzung"
  - label: "Bachelorarbeit", description: "40 bis 60 Seiten, erste eigenständige wissenschaftliche Arbeit"
  - label: "Masterarbeit", description: "50 bis 100 Seiten, fortgeschrittene Forschungsarbeit"
- Dissertation oder andere Typen über "Other"

**Frage 2: "Literaturarbeit oder empirisch?"**
- header: "Methodik"
- multiSelect: false
- Optionen:
  - label: "Literaturarbeit", description: "Analyse bestehender Literatur, keine eigene Datenerhebung"
  - label: "Empirisch qualitativ", description: "Interviews, Fallstudien, Inhaltsanalyse"
  - label: "Empirisch quantitativ", description: "Umfragen, Experimente, statistische Auswertung"

**Frage 3: "In welcher Sprache schreibst du?"**
- header: "Sprache"
- multiSelect: false
- Optionen:
  - label: "Deutsch (Empfohlen)", description: "Standard für deutsche Hochschulen"
  - label: "Englisch", description: "Für internationale Studiengänge"

**Frage 4: "Welchen Zitationsstil verwendet deine Hochschule?"**
- header: "Zitationsstil"
- multiSelect: false
- Optionen:
  - label: "Harvard Inline (Empfohlen)", description: "(vgl. Autor Jahr, S. X), Standard im DACH-Raum"
  - label: "APA 7", description: "(Author, Year, p. X), Sozialwissenschaften und Psychologie"
  - label: "IEEE", description: "[1], [2], [3], technische Fächer und Ingenieurwesen"
  - label: "Chicago", description: "Fußnoten statt Inline, Geisteswissenschaften und Geschichte"

### Schritt 2: Persönliche Daten (AskUserQuestion)

Stelle vier Fragen gleichzeitig. Für Freitextfelder tippt der User seinen Wert bei "Other" ein:

**Frage 1: "Wie heißt du? (Vor- und Nachname bei 'Other' eintippen)"**
- header: "Name"
- multiSelect: false
- Optionen:
  - label: "Aus Git übernehmen", description: "Name aus deiner Git-Konfiguration auslesen"
  - label: "Später nachtragen", description: "Kann jederzeit in config.yaml ergänzt werden"

Falls "Aus Git übernehmen": Führe `git config user.name` aus und verwende das Ergebnis.

**Frage 2: "An welcher Hochschule schreibst du? (Name bei 'Other' eintippen)"**
- header: "Hochschule"
- multiSelect: false
- Optionen:
  - label: "Universität", description: "Volluniversitäten (z.B. LMU, Uni Köln, Uni Hamburg)"
  - label: "Technische Universität", description: "z.B. TU München, RWTH Aachen, TU Berlin"
  - label: "Fachhochschule / HAW", description: "Praxisorientierte Hochschulen (z.B. HAW Hamburg, TH Köln)"
  - label: "Später nachtragen", description: "Kann jederzeit ergänzt werden"

Falls eine Kategorie gewählt wird (nicht "Other" und nicht "Später"): Frage mit einem weiteren AskUserQuestion nach dem genauen Namen, z.B. "Welche [Kategorie] genau?" mit "Später nachtragen" als Option.

**Frage 3: "Welchen Studiengang belegst du? (Name bei 'Other' eintippen)"**
- header: "Studiengang"
- multiSelect: false
- Optionen:
  - label: "Informatik", description: "Informatik, Wirtschaftsinformatik, Medieninformatik etc."
  - label: "BWL / Wirtschaft", description: "BWL, VWL, Management, Wirtschaftswissenschaften"
  - label: "Ingenieurwesen", description: "Maschinenbau, Elektrotechnik, Bauingenieurwesen etc."
  - label: "Später nachtragen", description: "Kann jederzeit ergänzt werden"

**Frage 4: "Wie lautet deine Matrikelnummer? (Nummer bei 'Other' eintippen)"**
- header: "Matrikel-Nr."
- multiSelect: false
- Optionen:
  - label: "Später nachtragen", description: "Kann jederzeit in config.yaml ergänzt werden"
  - label: "Keine", description: "z.B. bei externen Arbeiten ohne Matrikelnummer"

### Schritt 3: Seitenumfang (AskUserQuestion)

Die Optionen hängen vom gewählten Arbeitstyp aus Schritt 1 ab:

**Frage: "Welchen Seitenumfang hat deine Arbeit?"**
- header: "Seiten"
- multiSelect: false

Optionen je nach Arbeitstyp:
- **Seminararbeit:**
  - label: "10 bis 15 Seiten", description: "Kompakt und fokussiert"
  - label: "15 bis 20 Seiten", description: "Ausführlichere Bearbeitung"
- **Hausarbeit:**
  - label: "15 bis 20 Seiten", description: "Standardumfang"
  - label: "20 bis 25 Seiten", description: "Ausführliche Bearbeitung"
- **Bachelorarbeit:**
  - label: "40 bis 50 Seiten", description: "Standardumfang"
  - label: "50 bis 60 Seiten", description: "Ausführliche Bearbeitung"
- **Masterarbeit:**
  - label: "50 bis 70 Seiten", description: "Kompakter Umfang"
  - label: "70 bis 85 Seiten", description: "Standardumfang"
  - label: "85 bis 100 Seiten", description: "Ausführliche Bearbeitung"
- **Dissertation:**
  - label: "150 bis 200 Seiten", description: "Kompakter Umfang"
  - label: "200 bis 250 Seiten", description: "Standardumfang"
  - label: "250+ Seiten", description: "Umfangreiche Arbeit"

Speichere min/max in `formatierung.seitenumfang`.

### Schritt 4: Betreuung und Abgabe (AskUserQuestion)

Stelle drei Fragen gleichzeitig. Freitext über "Other":

**Frage 1: "Wer ist dein/e Erstgutachter/in? (Name bei 'Other' eintippen, z.B. Prof. Dr. Müller)"**
- header: "Erstprüfer"
- multiSelect: false
- Optionen:
  - label: "Noch nicht bekannt", description: "Wird später festgelegt"
  - label: "Später nachtragen", description: "Kann jederzeit ergänzt werden"

**Frage 2: "Wer ist dein/e Zweitgutachter/in? (Name bei 'Other' eintippen)"**
- header: "Zweitprüfer"
- multiSelect: false
- Optionen:
  - label: "Noch nicht bekannt", description: "Wird später festgelegt"
  - label: "Kein Zweitgutachter", description: "Nur Erstgutachter vorhanden"
  - label: "Später nachtragen", description: "Kann jederzeit ergänzt werden"

**Frage 3: "Wann ist die Abgabe geplant? (Genaues Datum bei 'Other' eintippen, z.B. 15.07.2026)"**
- header: "Abgabe"
- multiSelect: false
- Optionen:
  - label: "In 3 Monaten", description: "Ungefähr [Datum berechnen]"
  - label: "In 6 Monaten", description: "Ungefähr [Datum berechnen]"
  - label: "In 12 Monaten", description: "Ungefähr [Datum berechnen]"
  - label: "Später nachtragen", description: "Kann jederzeit ergänzt werden"

### Schritt 5: Quellen-Workflow (AskUserQuestion)

**Frage: "Wie möchtest du mit Quellen arbeiten?"**
- header: "Quellen"
- multiSelect: false
- Optionen bei Seminararbeit oder Hausarbeit (4 Optionen):
  - label: "BibTeX oder Zotero", description: "Ich habe eine .bib-Datei oder einen Zotero-Export"
  - label: "Aus PDFs extrahieren", description: "Ich habe PDFs, Claude liest die Quellen daraus"
  - label: "Manuell eintragen", description: "Ich gebe die Daten selbst ein"
  - label: "Keine Quellen", description: "Phase 3 wird übersprungen, Argumentation durch Logik und Beispiele"
- Optionen bei Bachelor, Master oder Dissertation (3 Optionen, OHNE "Keine Quellen"):
  - label: "BibTeX oder Zotero", description: "Ich habe eine .bib-Datei oder einen Zotero-Export"
  - label: "Aus PDFs extrahieren", description: "Ich habe PDFs, Claude liest die Quellen daraus"
  - label: "Manuell eintragen", description: "Ich gebe die Daten selbst ein"

Falls BibTeX/Zotero gewählt: Frage mit AskUserQuestion nach dem Dateipfad:

**Frage: "Wo liegt deine .bib-Datei? (Pfad bei 'Other' eintippen)"**
- header: "Dateipfad"
- Optionen:
  - label: "Im Projektordner", description: "Datei liegt bereits im Repository"
  - label: "Später importieren", description: "Dateipfad kann jederzeit in config.yaml ergänzt werden"

Quellen-Workflow Mapping:
- "BibTeX oder Zotero" → `quellen.workflow: "bibtex"`
- "Aus PDFs extrahieren" → `quellen.workflow: "pdf-extraktion"`
- "Manuell eintragen" → `quellen.workflow: "manuell"`
- "Keine Quellen" → `quellen.workflow: "keine"`

### Schritt 6: Formatierung (AskUserQuestion)

**Frage: "Hast du ein Merkblatt oder einen Leitfaden deiner Hochschule?"**
- header: "Leitfaden"
- multiSelect: false
- Optionen:
  - label: "Ja, als PDF", description: "Claude extrahiert die Vorgaben automatisch"
  - label: "Nein, manuell einstellen", description: "Schriftart, Größe, Ränder etc. einzeln festlegen"

**Falls PDF vorhanden:** Frage mit AskUserQuestion nach dem Pfad:

**Frage: "Wo liegt das PDF? (Pfad bei 'Other' eintippen)"**
- header: "PDF-Pfad"
- Optionen:
  - label: "Im Projektordner", description: "Datei liegt bereits im Repository"
  - label: "Auf dem Desktop", description: "~/Desktop/"

Dann:
- Lies das PDF mit dem Read-Tool
- Extrahiere systematisch: Seitenränder, Schriftart, Schriftgröße, Zeilenabstand, Pflicht-Verzeichnisse, Deckblatt-Anforderungen, besondere Anforderungen (z.B. Sperrvermerk)
- Zeige die extrahierten Werte und frage mit AskUserQuestion: "Stimmen diese Werte?"
  - label: "Ja, alles korrekt", description: "Werte übernehmen"
  - label: "Nein, ich korrigiere", description: "Werte anpassen"

**Falls kein PDF:** Stelle vier Fragen gleichzeitig mit AskUserQuestion:

**Frage 1: "Welche Schriftart?"**
- header: "Schriftart"
- Optionen:
  - label: "Times New Roman (Empfohlen)", description: "Klassiker für wissenschaftliche Arbeiten"
  - label: "Arial", description: "Serifenlos, gut lesbar am Bildschirm"
  - label: "Calibri", description: "Modern, kompakt"
  - label: "Computer Modern", description: "LaTeX-Standard, elegant"

**Frage 2: "Welche Schriftgröße?"**
- header: "Schriftgröße"
- Optionen:
  - label: "11pt", description: "Kompakt"
  - label: "12pt (Empfohlen)", description: "Standard für die meisten Hochschulen"
  - label: "13pt", description: "Größer, weniger Text pro Seite"

**Frage 3: "Welcher Zeilenabstand?"**
- header: "Zeilenabstand"
- Optionen:
  - label: "1,15-fach", description: "Eng"
  - label: "1,5-fach (Empfohlen)", description: "Standard für die meisten Hochschulen"
  - label: "2-fach", description: "Großzügig, oft in angelsächsischen Arbeiten"

**Frage 4: "Welche Seitenränder?"**
- header: "Ränder"
- Optionen:
  - label: "2,5 cm überall (Empfohlen)", description: "Standard"
  - label: "2 cm überall", description: "Kompakter"
  - label: "3 cm links, 2 cm rechts", description: "Für Ringbindung mit breiterem linken Rand"
  - label: "Nach Hochschulvorgabe", description: "Eigene Werte bei 'Other' eingeben"

### Schritt 7: Optionales (AskUserQuestion)

Stelle zwei bis drei Fragen gleichzeitig:

**Frage 1: "Hast du schon ein Thema oder eine Idee? (Bei 'Other' eintippen)"**
- header: "Thema"
- multiSelect: false
- Optionen:
  - label: "Nein, noch nicht", description: "Kein Problem, das klären wir in Phase 1"
  - label: "Später nachtragen", description: "Kann jederzeit in sources/notes.md ergänzt werden"

Falls der User bei "Other" ein Thema eingibt: In sources/notes.md speichern.

**Frage 2: "Gibt es Wörter die du vermeiden möchtest? (Bei 'Other' eintippen)"**
- header: "Wörter"
- multiSelect: false
- Optionen:
  - label: "Nein, Standardliste reicht", description: "Die voreingestellten Wörter bleiben aktiv"
  - label: "Später nachtragen", description: "Kann jederzeit in preferences.md ergänzt werden"

Falls der User bei "Other" Wörter eingibt: In preferences.md eintragen.

**Frage 3 (nur wenn quellen.workflow NICHT "keine"):**
"Hast du bereits Quellen oder Literatur gesammelt?"
- header: "Literatur"
- multiSelect: false
- Optionen:
  - label: "Ja", description: "Mit /cite eintragen oder PDFs in sources/pdfs/ ablegen"
  - label: "Nein, noch nicht", description: "Damit starten wir später"

### Schritt 8: LaTeX-Check (automatisch)

Keine User-Frage nötig. Führe `which xelatex && which latexmk` aus.

**Falls installiert:**
- Setze `latex.installation_geprüft: true`
- Melde: "LaTeX ist installiert. PDF-Export ist bereit."

**Falls NICHT installiert:** Frage mit AskUserQuestion:

**Frage: "LaTeX ist nicht installiert. Soll ich es jetzt installieren?"**
- header: "LaTeX"
- multiSelect: false
- Optionen:
  - label: "Ja, installieren", description: macOS: brew install mactex-no-gui (ca. 4 GB), Linux: apt install texlive-xetex
  - label: "Nein, später", description: "Kann jederzeit mit /compile nachgeholt werden"

Falls installieren: Befehl ausführen, danach `latex.installation_geprüft: true` setzen.
Falls später: `latex.installation_geprüft: false` setzen.

### Schritt 9: Logo-Erkennung (automatisch)

Prüfe ob Dateien in assets/img/ liegen (*.jpg, *.jpeg, *.png, *.pdf, *.svg).
- Falls gefunden: Frage mit AskUserQuestion: "Ich habe [Dateiname] in assets/img/ gefunden. Als Hochschul-Logo verwenden?"
  - label: "Ja, verwenden", description: "Erscheint auf dem Deckblatt"
  - label: "Nein", description: "Kein Logo auf dem Deckblatt"
- Falls leer: "Tipp: Lege dein Hochschul-Logo als JPG oder PNG in assets/img/ ab. Es erscheint dann automatisch auf dem Deckblatt."

## Nach dem Interview: Dateien generieren

### 1. config.yaml aktualisieren
Lies die bestehende config.yaml und aktualisiere sie mit den gesammelten Antworten.
Felder die mit "Später nachtragen" beantwortet wurden: Als leeren String "" speichern.
Setze alle anderen Felder entsprechend der Antworten. Beispiel:

```yaml
projekt:
  titel: ""
  sprache: "de"
  typ: "bachelor"
  methodik: "literatur"

autor:
  name: "Max Mustermann"
  matrikelnummer: "12345"
  hochschule: "HTWD"
  fakultaet: ""
  studiengang: "Informatik"

betreuung:
  erstgutachter: "Prof. Dr. Beispiel"
  zweitgutachter: "Dr. Muster"

abgabe:
  datum: "15.07.2025"

quellen:
  workflow: "bibtex"
  import_pfad: "./literatur.bib"

latex:
  auto_compile: true
  installation_geprüft: true

formatierung:
  zitationsstil: "harvard-inline"
  seitenumfang:
    min: 40
    max: 60
  schriftart: "Times New Roman"
  schriftgroesse: "12pt"
  zeilenabstand: 1.5
  seitenraender:
    oben: 2.5
    unten: 2.5
    links: 2.5
    rechts: 2.5

verzeichnisse:
  inhaltsverzeichnis: true
  abbildungsverzeichnis: false
  tabellenverzeichnis: false
  abkuerzungsverzeichnis: false
  literaturverzeichnis: true
  abstract: false
  hilfsmittelverzeichnis: false
  eidesstattliche_erklaerung: true
  sperrvermerk: false

logo:
  pfad: ""

fortschritt:
  aktuelle_phase: 1
  abgeschlossene_phasen: []
  gestartet_am: "[heutiges Datum]"
  letztes_update: "[heutiges Datum]"
```

### 2. sources/literature.md erstellen (falls noch nicht vorhanden)
Erstelle die Datei mit vollständigem Dokumentations-Header.
Der Header erklärt das YAML-Format mit Vorlagen und Regeln.
Passe die Zitations-Beispiele an den gewählten Zitationsstil an.

### 3. sources/notes.md erstellen (falls noch nicht vorhanden)
Falls der User ein Thema oder eine Idee genannt hat, trage es dort ein.

### 4. preferences.md aktualisieren
Falls der User verbotene Wörter genannt hat, trage sie ein.

### 5. output/progress.json aktualisieren
Setze aktuelle_phase auf 1 und gestartet_am auf das heutige Datum.

## Abschluss

Zeige eine Zusammenfassung:

```
Setup abgeschlossen! Hier ist deine Konfiguration:

Name:           [Name]
Hochschule:     [Hochschule]
Studiengang:    [Studiengang]
Arbeitstyp:     [Typ, z.B. Bachelorarbeit]
Methodik:       [Literatur / Empirisch qualitativ / Empirisch quantitativ]
Zitationsstil:  [Stil]
Seitenumfang:   [Min] bis [Max] Seiten
Quellen:        [Workflow, z.B. BibTeX-Import / Manuell / Keine]
Abgabe:         [Datum]
LaTeX:          [Installiert / Nicht installiert]

Nächster Schritt: /next um mit dem Brainstorming zu starten!
```
