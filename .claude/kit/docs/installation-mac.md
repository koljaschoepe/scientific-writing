# Installation unter macOS

> Für Menschen ohne Technik-Erfahrung. Dauer: etwa eine Stunde, davon viel Warten.
> Stand: 2026-10-02

## Vorher erledigen

1. **Claude-Konto mit Abo** auf [claude.ai](https://claude.ai) (Claude Code ist ab Pro dabei,
   Preis vor Abschluss prüfen).
2. **GitHub-Konto** auf [github.com/signup](https://github.com/signup), kostenlos.
3. Mindestens **15 GB frei** (LaTeX braucht rund 6 GB). Apfel-Menü, Über diesen Mac,
   Weitere Infos, Speicher.
4. Dein **Mac-Passwort** bereithalten. Es wird für Homebrew und LaTeX gebraucht.

## Schritt 1: Das Einrichtungs-Skript starten

1. **Terminal** öffnen (Cmd + Leertaste, „Terminal“ tippen, Enter).
2. Diese Zeile einfügen, Enter:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/koljaschoepe/scientific-writing/main/.claude/kit/install/install-mac.sh | bash
   ```

3. Den Schritten folgen:
   - Beim Passwort erscheinen keine Zeichen, das ist normal. Tippen, Enter.
   - Name und E-Mail angeben (für Sicherungen).
   - GitHub: Code im Browser eingeben, „Authorize“.
   - Projektname und Ordner: Vorschläge mit Enter übernehmen. Das Projekt liegt bewusst in
     `~/Arbeiten` und nicht in „Dokumente“, weil iCloud dort oft mitsynchronisiert und sich
     mit Git in die Quere kommt.
4. VS Code öffnet sich mit deinem Projekt.

Nur prüfen: `bash .claude/kit/install/install-mac.sh --pruefen`.

**Warum MacTeX und nicht das kleine BasicTeX?** BasicTeX spart 5 GB, aber jedes fehlende
LaTeX-Paket bricht das PDF mit einer kryptischen Meldung ab und muss von Hand nachinstalliert
werden. MacTeX enthält alles. Nur bei weniger als 12 GB freiem Speicher weicht das Skript auf
BasicTeX mit einer festen Paketliste aus.

## Schritt 2 bis 4

Mit Cursor statt VS Code: [installation-windows.md](installation-windows.md#cursor-statt-vs-code)
(gilt für macOS genauso).

Wie unter Windows: [installation-windows.md](installation-windows.md), ab „Schritt 2: VS Code
zum ersten Mal“. Tastenkürzel: Cmd statt Strg.

Der Browser für Claude ist Google Chrome, wenn vorhanden, sonst Edge, sonst ein von Playwright
geladener Chromium. Das Browserprofil mit deinen Logins liegt unter
`~/.scientific-writing/browser-profil`.
