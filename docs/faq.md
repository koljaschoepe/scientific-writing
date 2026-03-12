# Häufige Fragen (FAQ)

## Allgemein

### Für welche Arbeiten ist das Framework geeignet?
Alle wissenschaftlichen Arbeiten: Seminararbeiten, Hausarbeiten, Bachelorarbeiten,
Masterarbeiten und Dissertationen aller Fachrichtungen. Es ist besonders gut für
Literaturarbeiten und konzeptionelle Arbeiten geeignet, funktioniert aber auch mit
empirischen Arbeiten.

### Muss ich LaTeX kennen?
Nein. Das Framework übernimmt die LaTeX-Konvertierung und -Kompilierung automatisch.
Du arbeitest nur mit Markdown und Slash-Befehlen.

### In welcher Sprache kann ich schreiben?
Deutsch und Englisch werden unterstützt. Die Sprache wird bei `/setup` festgelegt.

## Setup

### Ich habe kein Merkblatt-PDF. Ist das schlimm?
Nein. Du kannst alle Formatierungsvorgaben manuell eingeben.
Claude schlägt sinnvolle Standardwerte vor.

### Kann ich die Konfiguration später ändern?
Ja. Bearbeite `config.yaml` direkt. Änderungen am Zitationsstil sollten
möglichst früh erfolgen, da spätere Änderungen alle Kapitel betreffen.

## Workflow

### Kann ich die Reihenfolge der Phasen ändern?
Nein. Die Phasen bauen aufeinander auf. Du kannst aber innerhalb einer Phase
Kapitel in beliebiger Reihenfolge bearbeiten.

### Was passiert wenn ich die Gliederung ändern will?
Ab Phase 3 ist die Gliederung gesperrt. Falls nötig, kann ein Reset auf
Phase 2 durchgeführt werden -- dabei gehen aber Zuordnungen und Pläne verloren.

### Kann ich ein Kapitel überspringen?
Nein. Kapitel werden in der Reihenfolge der Gliederung geschrieben,
damit der rote Faden gewahrt bleibt.

### Was bedeutet draft und final?
- `draft/`: Entwurf, noch nicht geprüft/freigegeben
- `final/`: Vom User freigegeben, wird für die nächste Phase verwendet

### Wie füge ich Quellen hinzu?
Drei Wege:
1. `/cite` -- Claude führt dich durch (empfohlen)
2. PDFs in `sources/pdfs/` ablegen und `/cite` mit Pfad ausführen
3. `sources/literature.md` manuell bearbeiten

## Qualität

### Wie gut ist der generierte Text?
Der Text folgt wissenschaftlichen Standards (sachlich, belegt, strukturiert).
Er sollte aber IMMER von dir geprüft und ggf. überarbeitet werden.
Die Qualitätsprüfung (Phase 6) hilft dabei, Schwächen zu finden.

### Ersetzt das Framework mein eigenes Denken?
Nein. Du triffst alle inhaltlichen Entscheidungen: Thema, Forschungsfrage,
Argumentation, Bewertung. Claude unterstützt bei Formulierung und Struktur.

## Technisch

### LaTeX-Kompilierung schlägt fehl. Was tun?
1. Prüfen ob LaTeX installiert ist: `which latexmk` oder `which xelatex`
2. Falls nicht installiert: Siehe README.md für Installationsanweisungen
3. Falls installiert: Fehlermeldung an Claude zeigen mit `/compile`

### Kann ich die generierte LaTeX-Datei manuell bearbeiten?
Ja. Die Dateien in `output/phase-07-latex/latex/` können frei bearbeitet werden.
Beachte aber, dass ein erneutes `/compile` deine Änderungen überschreiben kann.

### Wie gross wird das Repository?
Ca. 1-5 MB ohne PDFs. PDFs in `sources/pdfs/` sind gitignored.

## Seminar- und Hausarbeiten

### Kann ich eine Seminararbeit ohne Quellen schreiben?
Ja. Wähle bei `/setup` den Quellen-Workflow "Keine Quellen". Phase 3 (Zitat-Zuordnung)
wird dann automatisch übersprungen und die Argumentation stützt sich auf Logik und Beispiele.

### Ist die Struktur für kurze Arbeiten anders?
Ja. Für Seminararbeiten gibt es ein eigenes Kapitelmodell (2-3 Hauptkapitel statt 5-6).
Der Outliner-Agent wählt das passende Modell automatisch basierend auf dem Arbeitstyp.

### Brauche ich weniger Quellen?
Ja. Die Mindestanforderung wird an den Arbeitstyp angepasst:
- Seminararbeit: 3 Quellen
- Hausarbeit: 5 Quellen
- Bachelorarbeit: 10 Quellen
- Masterarbeit: 15 Quellen

## Quellen-Import

### Wie importiere ich eine BibTeX-Datei?
```
/cite -> "BibTeX-Import" -> Pfad zur .bib-Datei angeben
```
Claude liest alle Einträge, konvertiert sie und bietet Batch-Import an.

### Wie importiere ich aus Zotero?
1. In Zotero: Rechtsklick auf Sammlung -> "Exportiere Sammlung..."
2. Format wählen: BibTeX (empfohlen), CSV oder RIS
3. `/cite` -> "Zotero-Import" -> Pfad angeben

### Welche Zotero-Exportformate werden unterstützt?
- BibTeX (.bib) -- empfohlen, genauestes Mapping
- CSV -- tabellarisch, einfach
- RIS (.ris) -- Standard-Austauschformat
