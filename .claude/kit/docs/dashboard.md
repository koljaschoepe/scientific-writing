# Das Dashboard

> Dein Überblick über die ganze Arbeit, direkt in VS Code.
> Stand: 2026-10-02

## Öffnen

- Startet automatisch, wenn du den Projektordner in VS Code öffnest (dafür einmal
  „Automatische Aufgaben zulassen“ bestätigen) und zusätzlich beim Start von Claude.
- Adresse: [http://127.0.0.1:4711/](http://127.0.0.1:4711/). Ein Klick auf den Link öffnet
  es im integrierten Browser von VS Code.
- Oder `/dashboard` in Claude.

## Aufbau

| Reiter | Inhalt |
| --- | --- |
| Übersicht | Der Weg durch die Phasen, nächster Schritt, Countdown bis zur Abgabe, Umfang in Seiten, zuletzt geänderte Absätze |
| Quellen | Claudes Vorschläge mit Begründung: nehmen, verwerfen, später, Sterne, Notizen. Eine Zeile aufklappen zeigt die Zitate mit Seite, wo die Quelle in deinen Kapiteln steht, und die Kernaussage. PDFs per Drag and Drop hochladen |
| Gliederung | Alle Kapitel und Unterkapitel in beliebiger Tiefe mit Status, Seiten gegen Ziel, Prüfpunkten, Notenschätzung. Darunter aufklappbar die Abschnitte aus den Überschriften der Datei. Kapitel lesen, Formeln werden lesbar gesetzt |
| Plan | Meilensteine und Termine in einer Zeitleiste. Termine anlegen, abhaken, löschen |
| Hilfe | Befehle, Werkzeugkasten, Systemcheck, Sync-Stand |

Oben rechts auf jeder Seite: **Claude fragen**. Befehl wählen, Text ergänzen, „An Claude
senden“. Claude öffnet sich mit der fertigen Nachricht, du drückst Enter. Mit „Anhängen“ an
einem Absatz, Zitat oder Termin kommt diese Stelle mit in die Nachricht.

## Klicken

- Ein Klick auf einen Datei- oder Absatznamen öffnet die Datei in VS Code oder Cursor genau an
  der Stelle. Welcher Editor, erkennt das Kit selbst. Festlegen: Schalter „Editor“ im Dashboard
  oder `- editor: cursor` (bzw. `vscode`, `automatisch`) unter Technik in `.arbeit/einstellungen.md`.
- PDF der Arbeit oder des Exposés: Klick öffnet es rechts im Lesebereich, „Im PDF-Programm
  öffnen“ öffnet es mit dem Standardprogramm deines Rechners.
- Ein Klick auf eine Zeile klappt sie auf.
- Ein Klick auf ein Zitat öffnet das PDF der Quelle rechts im Lesebereich auf der richtigen Seite.

## Umfang in Seiten

Das Dashboard rechnet in Seiten, weil Prüfungsordnungen in Seiten denken. Vor dem ersten PDF
schätzt es (etwa 300 Wörter je Seite, Abbildungen und Tabellen kommen dazu), danach nimmt es
die echten Seiten aus dem PDF. Steht „ca.“ davor, ist es eine Schätzung. Der Seitenbereich der
ganzen Arbeit steht in `.arbeit/einstellungen.md` und lässt sich jederzeit ändern, die Kapitel
bekommen davon ihren Anteil.

## Lesen und PDF

Rechts öffnet sich ein **Lesebereich**:
- **Kapitel lesen:** Absätze, die sich seit kurzem geändert haben, sind markiert. Ändern
  kannst du den Text in VS Code (Klick auf den Absatz) oder per Nachricht an Claude.
- **PDF ansehen:** deine Arbeit oder ein Quell-PDF. Markierst du eine Textstelle in einer
  Quelle, speichert „Als Zitat“ sie mit Seitenzahl. Claude ergänzt beim nächsten `/quellen`
  den Rest.
- **PDF aktualisieren:** baut den Entwurf auf Knopfdruck, ohne Claude.

## Werkzeugkasten und Rückgängig

- **Werkzeugkasten** (Reiter Hilfe): alle Befehle nach Gruppen, mit Inhalt zum Lesen. „Neu“
  oder „Ändern“ bittet Claude, einen eigenen Befehl für dich anzulegen. Eigene Befehle
  bleiben bei `/update` erhalten.
- **Rückgängig:** Nach jeder Aktion im Dashboard erscheint unten kurz „Rückgängig“, auch
  mehrmals hintereinander.

## Claude weiß, was du im Dashboard tust

Was du im Dashboard entscheidest, bekommt Claude bei deiner nächsten Nachricht automatisch mitgeteilt.
Du musst nicht dazuschreiben, dass du drei Quellen genommen hast.

## Woher die Zahlen kommen

Das Dashboard speichert nichts selbst. Es liest deine Dateien in `kapitel/`, `quellen/` und
`.arbeit/` und schreibt deine Entscheidungen genau dorthin. Deshalb stimmen Dashboard und
Claude immer überein. Nur was zu diesem Rechner gehört (zuletzt geändert, PDF-Bau), liegt im
Ordner `.lokal/` und wird nicht mit GitHub abgeglichen.

## Umbauen

`/dashboard anpassen` und beschreiben, was anders sein soll, etwa „Zeig mir auf der
Übersicht die offenen Quellen zuerst“. Deine Anpassungen liegen in `.arbeit/` und bleiben bei
einem `/update` erhalten.
