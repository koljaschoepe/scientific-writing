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
  Kopie zum Lesen, ohne Knöpfe, und wird nach jeder Claude-Sitzung erneuert.

## Aufbau

| Reiter | Inhalt |
| --- | --- |
| Übersicht | Der Weg durch die acht Phasen, nächster Schritt, Tagesziel und Serie, Countdown bis zur Abgabe, Abzeichen |
| Quellen | Das Triage-Board: Claudes Vorschläge mit Begründung. Du entscheidest: nehmen, verwerfen, später. Sterne, Notizen, Markierungen. PDFs per Drag and Drop hochladen |
| Kapitel | Alle Unterkapitel mit Status (geplant, Entwurf, geprüft, final), Wörtern gegen Budget, offenen Prüfpunkten und Notenschätzung. Knopf „freigeben“ |
| Plan | Meilensteine, Betreuertermine, Fristen. Termine eintragen und abhaken |
| Hilfe | Alle Befehle erklärt, Systemcheck, Sync-Stand |

Oben auf jeder Seite: das **Auftragsfeld**. Aktion wählen (zum Beispiel „Kapitel schreiben“),
Bausteine anklicken (Kapitel, Quellen), Text ergänzen, Absenden. Claude öffnet sich mit dem
fertigen Auftrag, du drückst Enter. Alternativ „Kopieren“ und selbst einfügen.

## Woher die Zahlen kommen

Das Dashboard speichert nichts selbst. Es liest bei jedem Aufruf deine Dateien: Zustand und
Plan in `arbeit/`, Quellen in `quellen/`, Wörter direkt aus den Kapiteldateien. Was du im
Dashboard entscheidest, schreibt es in genau diese Dateien. Deshalb stimmen Dashboard und
Claude immer überein.

## Umbauen

Gefällt dir etwas nicht? `/dashboard anpassen` und beschreiben, was anders sein soll, etwa
„Zeig mir auf der Übersicht die offenen Quellen zuerst“. Deine Anpassungen liegen in
`arbeit/` und bleiben bei einem `/update` erhalten.
