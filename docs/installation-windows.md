# Installation unter Windows

> Für Menschen ohne Technik-Erfahrung. Dauer: etwa eine Stunde, davon viel Warten.
> Stand: 2026-09-30

## Was du am Ende hast

- **VS Code**, das Programm, in dem du arbeitest, mit Claude rechts daneben
- dein **privates Projekt** auf GitHub (Backup, nur du siehst es)
- das **Dashboard** mit deinem Fahrplan, deinen Quellen und Kapiteln
- alles, was für das fertige **PDF** nötig ist (LaTeX, Pandoc)

## Vorher erledigen (10 Minuten)

1. **Claude-Konto mit Abo.** Auf [claude.ai](https://claude.ai) ein Konto anlegen und ein
   Abo abschließen. Claude Code ist im Pro-Abo enthalten. Preis vor dem Abschluss auf der
   Seite prüfen, er ändert sich gelegentlich.
2. **GitHub-Konto.** Auf [github.com/signup](https://github.com/signup) kostenlos anlegen.
   Tipp: Nimm dieselbe E-Mail-Adresse wie bei Claude. Merke dir den Benutzernamen.
3. **Windows aktuell?** Windows 10 (ab Version 1809) oder Windows 11. Unter
   Einstellungen, Windows Update einmal nach Updates suchen lassen.
4. **Laptop am Strom und im WLAN.** Es werden mehrere Gigabyte geladen.

## Schritt 1: Das Einrichtungs-Skript starten

1. Startmenü öffnen, **PowerShell** tippen, **Windows PowerShell** anklicken
   (nicht „als Administrator“, ein normales Fenster reicht).
2. Diese Zeile kopieren, im blauen Fenster mit Rechtsklick einfügen, Enter:

   ```powershell
   irm https://raw.githubusercontent.com/koljaschoepe/scientific-writing/main/install/install-windows.ps1 | iex
   ```

3. Das Skript arbeitet sich durch nummerierte Schritte. Grün heißt erledigt.
   - Fragt Windows „Möchten Sie zulassen, dass diese App Änderungen vornimmt?“: **Ja**.
   - Es fragt nach deinem **Namen** und deiner **E-Mail**: erscheinen an jeder Sicherung.
   - Bei GitHub erscheint ein **Code** wie `ABCD-1234`. Der Browser öffnet sich, Code
     eingeben, „Authorize GitHub CLI“ klicken.
   - Es fragt nach einem **Projektnamen** (Vorschlag `diplomarbeit`) und einem Ordner.
     Den Vorschlag mit Enter übernehmen.
4. Am Ende öffnet sich VS Code mit deinem Projekt.

Klappt etwas nicht, ist das kein Drama: Das Skript darf beliebig oft neu gestartet werden,
Erledigtes wird übersprungen. Nur prüfen, was fehlt:
`powershell -ExecutionPolicy Bypass -File install\install-windows.ps1 -NurPruefen`.

## Schritt 2: VS Code zum ersten Mal

VS Code stellt beim ersten Öffnen ein paar Fragen. So beantwortest du sie:

| Frage | Antwort | Warum |
| --- | --- | --- |
| „Vertrauen Sie den Autoren der Dateien in diesem Ordner?“ | **Ja, ich vertraue den Autoren** | Sonst sind Erweiterungen und das Dashboard gesperrt |
| „Dieser Ordner enthält automatische Aufgaben … zulassen?“ | **Zulassen** | Startet dein Dashboard bei jedem Öffnen |
| „Empfohlene Erweiterungen installieren?“ | **Installieren** | Deutsch, Claude, LaTeX, PDF-Ansicht |
| Sprache auf Deutsch umstellen, neu starten? | **Ja** | |

## Schritt 3: Claude anmelden

1. Rechts oben in VS Code das **Claude-Symbol** anklicken (orangefarbener Stern).
   Nicht zu sehen? Links auf das Erweiterungs-Symbol (vier Quadrate), „Claude Code“ suchen,
   installieren.
2. **Anmelden** mit deinem Claude-Konto. Der Browser öffnet sich, bestätigen.
3. Claude fragt, ob es diesem Ordner vertrauen soll: **Ja**. Nur dann gelten die
   Einstellungen des Kits (keine ständigen Nachfragen) und der Browser-Zugriff.
4. Frage nach dem MCP-Server **„playwright“**: **erlauben**. Damit kann Claude für dich im
   Internet und im Bibliothekskatalog suchen.

## Schritt 4: Loslegen

Ins Claude-Feld tippen:

```
/start
```

Claude stellt dir Fragen mit anklickbaren Antworten und richtet alles ein. Wie es danach
weitergeht: [erste-schritte.md](erste-schritte.md).

## Einmalig: Zugang zur Uni-Bibliothek (SLUB)

Damit Claude Volltexte über deinen Uni-Zugang laden kann, meldest du dich einmal selbst an.
Sag Claude: „Öffne die SLUB-Anmeldung.“ Ein Browserfenster öffnet sich, du meldest dich mit
deinem Uni-Login an. Claude sieht dein Passwort nie. Die Anmeldung bleibt in einem eigenen
Browserprofil gespeichert (`C:\Users\<du>\.scientific-writing\browser-profil`), außerhalb
deines Projekts, und landet deshalb nie auf GitHub. Läuft sie ab, einfach wiederholen.

## Wenn etwas hakt

- In Claude: `/hilfe` prüft alles und repariert, was geht.
- Nachschlagen: [probleme.md](probleme.md).
- Protokoll der Installation: `install\install.log` im Projekt.
