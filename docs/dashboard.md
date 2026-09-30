# Das Dashboard

> Dein Überblick über die ganze Arbeit, direkt in VS Code.
> Stand: 2026-09-30

## Öffnen

- Startet automatisch, wenn du den Projektordner in VS Code öffnest (dafür einmal
  „Automatische Aufgaben zulassen“ bestätigen) und zusätzlich beim Start von Claude.
- Adresse: [http://127.0.0.1:4711/](http://127.0.0.1:4711/). Ein Klick auf den Link öffnet
  es im integrierten Browser von VS Code.
- Oder `/dashboard` in Claude.
- Ohne laufenden Server: `dashboard.html` im Projektordner per Doppelklick. Das ist eine
  Kopie zum Lesen, ohne Knöpfe.

## Aufbau

| Reiter | Inhalt |
| --- | --- |
| Übersicht | Der Weg durch die acht Phasen, nächster Schritt, Tagesziel und Serie, Countdown, zuletzt geänderte Absätze, Abzeichen |
| Quellen | Das Triage-Board: Claudes Vorschläge mit Begründung. Nehmen, verwerfen, später, Sterne, Notizen, Markierungen. PDFs per Drag and Drop hochladen |
| Kapitel | Alle Unterkapitel mit Status, Wörtern gegen Budget, Prüfpunkten, Notenschätzung. Kapitel lesen und freigeben |
| Plan | Meilensteine, Betreuungstermine, Fristen. Termine eintragen und abhaken |
| Hilfe | Befehle, Werkzeugkasten, Systemcheck, Sync-Stand |

Oben auf jeder Seite: das **Auftragsfeld**. Aktion wählen, Bausteine anklicken, Text
ergänzen, Absenden. Claude öffnet sich mit dem fertigen Auftrag, du drückst Enter.

## Lesen und korrigieren

Rechts öffnet sich ein **Lesebereich** (am Handy im Vollbild):
- **Kapitel lesen:** Absätze, die sich seit kurzem geändert haben, sind markiert. Einen
  Absatz kannst du direkt verbessern oder mit „an Claude“ einen Auftrag dazu schicken.
- **PDF ansehen:** deine Arbeit oder ein Quell-PDF. Markierst du eine Textstelle in einer
  Quelle, speichert „Als Zitat“ sie mit Seitenzahl. Claude ergänzt beim nächsten `/quellen`
  die Paraphrase.
- **PDF aktualisieren:** baut den Entwurf auf Knopfdruck, ohne Claude. Der Hinweis
  „3 Änderungen seither“ zeigt, wann es sich lohnt.

## Suchen, Werkzeugkasten, Rückgängig

- **Suche:** Strg+K (Mac Cmd+K) findet Kapitel, Quellen, Termine und Befehle.
- **Werkzeugkasten** (Reiter Hilfe): alle Befehle nach Gruppen, mit Inhalt zum Lesen. „Neu“
  oder „Ändern“ bittet Claude, einen eigenen Befehl für dich anzulegen. Eigene Befehle
  bleiben bei `/update` erhalten.
- **Rückgängig:** Nach jeder Aktion im Dashboard erscheint unten kurz „Rückgängig“. Das geht
  auch mehrmals hintereinander.

## Claude weiß, was du im Dashboard tust

Was du im Dashboard entscheidest oder korrigierst, bekommt Claude beim nächsten Auftrag
automatisch mitgeteilt. Du musst nicht dazuschreiben, dass du drei Quellen genommen hast.

## Woher die Zahlen kommen

Das Dashboard speichert nichts selbst. Es liest deine Dateien in `arbeit/` und `quellen/`
und schreibt deine Entscheidungen genau dorthin. Deshalb stimmen Dashboard und Claude immer
überein. Nur Dinge, die zu diesem Rechner gehören (Tagesaktivität, zuletzt geändert), liegen
im Ordner `.lokal/` und werden nicht mit GitHub abgeglichen.

## Umbauen

`/dashboard anpassen` und beschreiben, was anders sein soll, etwa „Zeig mir auf der
Übersicht die offenen Quellen zuerst“. Deine Anpassungen liegen in `arbeit/` und bleiben bei
einem `/update` erhalten.
