# GitHub und /sync, einfach erklärt

> Warum deine Arbeit auf GitHub liegt und was /sync genau macht.
> Stand: 2026-10-01

## Was ist GitHub?

Ein Online-Speicher für Projekte, der sich jede Version merkt. Gesichert werden deine Kapitel,
Quellen, Daten und Abbildungen und der versteckte Ordner `.arbeit/` mit deinen Einstellungen
und deinem Stand. Dein Projekt dort ist
**privat**: Nur du siehst es (und wen du ausdrücklich einlädst). Stell es dir vor wie eine
Cloud mit Zeitmaschine: Du kannst zu jedem gesicherten Stand zurück.

## Was macht /sync?

In einem Schritt:
1. **Sichern**: Alle Änderungen seit dem letzten Mal werden mit Datum festgehalten.
2. **Holen**: Hast du auf einem anderen Rechner weitergearbeitet, kommt dieser Stand dazu.
3. **Hochladen**: Der gemeinsame Stand geht auf GitHub.

`/sync` passiert **nie automatisch** und arbeitet immer direkt auf deinem einen Stand, ohne
Nebenzweige. Mach es am Ende jedes Arbeitstags. Claude erinnert dich
beim Start, wenn der letzte Sync länger als zwei Tage her ist, und das Dashboard zeigt es an.

## Was, wenn es einen Konflikt gibt?

Das passiert nur, wenn du dieselbe Datei auf zwei Rechnern geändert hast. Es geht nichts
verloren. Claude zeigt dir, was sich auf beiden Seiten unterscheidet, und fragt, welche
Fassung gilt, meist ist „beide zusammenführen“ richtig.

## Was ist mit meinen PDFs?

Die Quell-PDFs werden mitgesichert, weil sie Teil deiner Arbeit sind und dein Repo privat
ist. GitHub nimmt höchstens 100 MB pro Datei an. Größere Dateien meldet `/sync` vorher.

## Kann ich meinen Betreuer einladen?

Ja: auf github.com dein Projekt öffnen, Settings, Collaborators, Add people. Einfacher ist
meist, ihm das PDF zu schicken (`/pdf`).

## Was wird nicht gesichert?

Der Ordner `.lokal/` gehört zu diesem Rechner (zuletzt geänderte Absätze, Dashboard-Protokoll,
der PDF-Bau) und bleibt bewusst lokal. So entstehen keine Konflikte zwischen zwei
Rechnern.

## Updates des Kits

Neue Funktionen des Kits kommen nicht über `/sync`, sondern über `/update`. Das ändert nur die
Kit-Dateien, nie deine Arbeit und nie deine eigenen Befehle.
