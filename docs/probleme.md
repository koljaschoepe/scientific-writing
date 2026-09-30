# Probleme und Lösungen

> Die häufigsten Stolpersteine. Erste Hilfe immer: /hilfe in Claude.
> Stand: 2026-09-30

## Claude und VS Code

**Ich sehe das Claude-Symbol nicht.**
Links auf Erweiterungen (vier Quadrate), „Claude Code“ von Anthropic suchen, installieren,
VS Code neu starten.

**Claude fragt ständig um Erlaubnis.**
Der Ordner ist nicht als vertrauenswürdig markiert, dann gelten die Einstellungen des Kits
nicht. VS Code: Befehlspalette (Strg+Umschalt+P), „Arbeitsbereichsvertrauen verwalten“,
vertrauen. Claude neu öffnen und beim Ordner-Vertrauen „Ja“ wählen.

**Ein Befehl wie /weiter ist unbekannt.**
Claude wurde in einem anderen Ordner gestartet. VS Code muss genau deinen Projektordner offen
haben (Datei, Ordner öffnen). Nach `/update` einmal Claude schließen und neu öffnen.

**„Limit erreicht“ oder Claude wird langsam.**
Das Pro-Abo hat ein Nutzungsbudget pro Zeitfenster. Pause machen, die Zeit bis zum Reset steht
in der Meldung. Große Aufträge (alles prüfen, viele PDFs auswerten) lieber auf mehrere
Sitzungen verteilen.

## Dashboard

**Das Dashboard lädt nicht (Seite nicht erreichbar).**
In Claude `/dashboard` eingeben, das startet es neu. Oder in VS Code: Terminal, Aufgabe
ausführen, „Dashboard“. Hilft das nicht: `node kit/dashboard/server.mjs` im Terminal, die
Fehlermeldung an Claude geben.

**Port schon belegt.**
Ein anderes Programm nutzt Port 4711. In `arbeit/projekt.json` unter `dashboard.port` eine
andere Zahl eintragen (zum Beispiel 4712), Claude sagen „Dashboard neu starten“.

**Das Dashboard zeigt alte Zahlen.**
Neu laden (F5). Die Datei `dashboard.html` ist nur eine Kopie ohne Knöpfe und wird erneuert,
solange das Dashboard läuft.

**„Datei ist beschädigt“.**
Eine Einstellungsdatei in `arbeit/` oder `quellen/` ist nicht mehr lesbar, oft nach einem
Konflikt beim Sichern. Das Dashboard überschreibt sie dann bewusst nicht. In Claude
`/hilfe reparieren` eingeben. Daneben liegt immer eine Sicherung mit der Endung `.bak`.

**Ich habe im Dashboard etwas falsch geklickt.**
Unten erscheint kurz „Rückgängig“. Ist der Hinweis weg, sag Claude, was du zurückhaben willst.

## Rückgängig machen

**Claude hat etwas geändert, das ich nicht wollte.**
In VS Code am Eingabefeld von Claude den Rewind-Knopf nutzen (in der Konsole zweimal Esc)
und den Stand vor der Änderung wählen. Ausnahme: Kapitel, die ein Hilfsagent geschrieben
hat, und Dateien aus Terminal-Befehlen holt Rewind nicht zurück. Dann hilft der zuletzt mit
`/sync` gesicherte Stand oder die Kopie in `arbeit/kapitel/.versionen/`. Sag Claude einfach,
was du zurückhaben willst.

## Rechtschreibprüfung (LTeX+)

**Fachbegriffe sind rot unterstrichen.**
LTeX+ kennt deine Begriffe aus `arbeit/begriffe.md` nicht von selbst. Auf das Wort klicken,
Schnellkorrektur (Glühbirne), „Zum Wörterbuch hinzufügen“. Das gilt dann für alle deine
Projekte.

**Meine Arbeit ist englisch.**
In den VS-Code-Einstellungen „LTeX: Language“ suchen und auf `en-US` oder `en-GB` stellen.

## Browser-Zugriff (Playwright)

**„MCP server playwright failed“ oder „Connection closed“.**
1. Einmal prüfen: `/hilfe`. Node.js muss installiert sein.
2. Claude-Fenster schließen und neu öffnen. Beim ersten Start lädt der Server etwa eine
   Minute Dateien nach.
3. Wurde die Nachfrage „playwright erlauben?“ abgelehnt: in Claude `/mcp` eingeben und den
   Server aktivieren.

**Die SLUB-Anmeldung ist weg.**
Uni-Logins laufen nach einiger Zeit ab. Claude sagen „Öffne die SLUB-Anmeldung“ und neu
anmelden. Hilft das nicht, den Ordner `.scientific-writing/browser-profil` in deinem
Benutzerordner löschen (alle gespeicherten Logins sind dann weg) und neu anmelden.

## PDF und LaTeX

**/pdf bricht ab.**
Claude übersetzt die Fehlermeldung und behebt sie meist selbst. Häufige Ursachen:
- ein Sonderzeichen im Text, das LaTeX nicht kennt (Claude ersetzt es)
- eine Quelle, die im Text zitiert, aber nicht in `quellen/literatur.bib` steht
- ein Bild, das es nicht gibt

**„MiKTeX: package not found“ oder ein Fenster fragt nach Paketinstallation.**
MiKTeX lädt fehlende Pakete nach. Fragt ein Fenster: „Installieren“ und Haken bei „nicht mehr
fragen“. Dauerhaft einstellen: MiKTeX Console, Einstellungen, „Fehlende Pakete immer
installieren“.

**Das erste PDF dauert ewig.**
Normal. Beim ersten Mal lädt MiKTeX Pakete aus dem Internet. Danach geht es schnell.

## GitHub und /sync

**„Anmeldung fehlt“ oder „Authentication failed“.**
Claude startet die Neuanmeldung selbst. Im Browser den Code eingeben, fertig.

**„Konflikt“.**
Du hast dieselbe Datei auf zwei Rechnern geändert. Nichts ist verloren, Claude fragt dich
Datei für Datei, welche Fassung gilt.

**„Datei größer als 95 MB“.**
GitHub nimmt keine Dateien über 100 MB. Claude bietet an, die Datei aus der Sicherung
auszunehmen.

## Ordner und Speicherort

**Mein Projekt liegt in OneDrive (oder iCloud, Dropbox).**
Zwei Sync-Programme gleichzeitig (OneDrive und Git) führen zu doppelten Dateien wie
`kapitel-DESKTOP-ABC.md` und gesperrten Dateien. Besser: Projekt in einen lokalen Ordner
verschieben, etwa `C:\Users\<du>\Arbeiten\diplomarbeit`. Vorher `/sync`, dann VS Code
schließen, Ordner verschieben, neu öffnen. Die Sicherung macht ohnehin GitHub.

**Umlaute oder Leerzeichen im Benutzernamen.**
Funktioniert in der Regel. Wenn ein Werkzeug trotzdem hakt: `/hilfe` mit der Fehlermeldung.

## Wenn nichts hilft

`/hilfe` erstellt einen Problembericht, den du weitergeben kannst (ohne Zugangsdaten und ohne
Inhalte deiner Arbeit). Fehler im Kit selbst bitte als Issue melden:
[github.com/koljaschoepe/scientific-writing/issues](https://github.com/koljaschoepe/scientific-writing/issues).
