---
name: hilfe
description: Erklärt und repariert Technik (Fehlermeldungen, Dashboard, beschädigte Dateien, Rückgängig, Bedienung).
when_to_use: Etwas geht nicht, eine Fehlermeldung, etwas rückgängig machen, Frage zur Bedienung. Nicht für „was jetzt?“ (weiter).
argument-hint: "[frage oder problem]"
gruppe: technik
---

# /hilfe: Was ist kaputt, wie geht das?

**Wichtig:** Einfach sprechen, ohne Fachbegriffe. Ohne Rückfrage nur reparieren, was nichts
installiert und nichts nach außen schickt. Nie eine beschädigte Datei mit einer Vorlage
überschreiben. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## 1. Lage (still, parallel)

- `node .claude/kit/werkzeuge/zustand.mjs zeige` (kurz: Phase, nächster Schritt, Kapitel)
- `node .claude/kit/werkzeuge/check.mjs --json` (Systemcheck)

## 2. Antworten

**Mit Frage:** passenden Abschnitt in `.claude/kit/docs/probleme.md` (Technik) oder
`.claude/kit/docs/befehle.md` (Bedienung) per Suche finden und nur den lesen. Passt ein
Check-Punkt mit `ok: false`, zuerst den beheben. Antwort in höchstens fünf Sätzen mit dem
konkreten nächsten Schritt. Reine Frage: kein Abschluss-Interview.

**Ohne Frage:** vier Zeilen Lage aus den beiden Werkzeugen, z. B.

```
Du bist hier:     Phase 3 von 8, Recherche
Nächster Schritt: 12 Vorschläge im Dashboard sichten (Reiter Quellen)
Abgabe:           in 143 Tagen (2027-02-28)
System:           alles in Ordnung
```

Dazu höchstens drei passende Befehle mit je einem Satz Nutzen. Was inhaltlich als Nächstes
dran ist, klärt der weiter-Skill.

## 3. Reparieren

- Ohne Rückfrage: `node .claude/kit/werkzeuge/check.mjs --reparieren` (stellt beschädigte
  JSON-Dateien aus einer gültigen `.bak` wieder her), `zustand.mjs init` (legt fehlende Dateien
  an), Dashboard starten. Ergebnis in einem Satz.
- Bleibt eine JSON-Datei kaputt: Fehlerstelle mit `node -e` finden, gezielt reparieren, bei
  Konfliktmarken die Fassungen zusammenführen wie im sync-Skill. Die `.bak` daneben ist die
  letzte gute Fassung. `einstellungen.md` und `plan.md` sind Text: fehlerhafte Zeilen gezielt
  korrigieren, Kommentare stehen lassen.
- Mit Interview alles, was installiert oder sich anmeldet (winget, brew, `gh auth login`,
  `git config --global`), bis zu vier Punkte je Aufruf: „<Punkt> fehlt. Jetzt einrichten?“,
  „Ja, jetzt (Empfohlen)“, „Später“. Danach Check erneut. Windows: neue Programme oft erst
  nach Neustart von VS Code sichtbar.
- Projekt in OneDrive, iCloud oder Dropbox: Risiko erklären, beim Umzug helfen, nie selbst
  verschieben.

## 4. Rückgängig machen (erklären, wenn gefragt)

- **Im Dashboard:** Jede Aktion zeigt kurz „Rückgängig“ unten im Hinweis, auch mehrmals.
- **Claudes Änderungen:** in VS Code der Rewind-Knopf am Prompt, in der Konsole zweimal Esc.
- **Grenze:** Rewind wirkt nicht auf Dateien, die Subagents (etwa der Autor) oder Befehle im
  Terminal geschrieben haben. Dafür gibt es `/sync` und die Kopien in `kapitel/.versionen/`.

## 5. Wenn nichts hilft

Problembericht zum Weitergeben: was sie wollte, was passiert ist (Fehlermeldung wörtlich),
Betriebssystem, Ergebnis von `check.mjs`, Version aus `.claude/kit/VERSION`. Keine
Zugangsdaten, keine Inhalte der Arbeit.

## 6. Abschluss

Nach Reparaturen oder der Lage: Interview „Wie machen wir weiter?“, z. B. „<nächster Schritt>
(Empfohlen)“, „Dashboard öffnen“, „Andere Frage“.
