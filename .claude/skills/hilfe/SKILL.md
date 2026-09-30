---
name: hilfe
description: Lage, nächster Schritt, Systemcheck mit Reparatur, Bedienung und Rückgängigmachen erklären.
when_to_use: Person weiß nicht weiter, Fehlermeldung, Dashboard lädt nicht, JSON kaputt, etwas rückgängig machen.
argument-hint: "[frage oder problem]"
gruppe: technik
---

# /hilfe: Wo bin ich, was jetzt, was ist kaputt?

**Wichtig:** Einfach sprechen, ohne Fachbegriffe. Ohne Rückfrage nur reparieren, was nichts
installiert und nichts nach außen schickt. Nie eine beschädigte Datei mit einer Vorlage
überschreiben. Endausgabe laut `AGENTS.md`.

Argument: `$ARGUMENTS`

## 1. Lage (still, parallel)

- `node kit/werkzeuge/stand.mjs` (Phase, nächster Schritt, Frist)
- `node kit/werkzeuge/check.mjs --json` (Systemcheck)

## 2. Antworten

**Mit Frage:** passenden Abschnitt in `docs/probleme.md` bzw. `docs/befehle.md` lesen. Passt
ein Check-Punkt mit `ok: false`, zuerst den beheben. Antwort in höchstens fünf Sätzen mit dem
konkreten nächsten Schritt. Reine Frage: kein Abschluss-Interview nötig.

**Ohne Frage:** Lagekarte:

```
Du bist hier:     Phase 3 von 8, Recherche
Nächster Schritt: 12 Vorschläge im Dashboard sichten (Reiter Quellen)
Abgabe:           in 143 Tagen (2027-02-28), Tagesziel 310 Wörter
System:           alles in Ordnung
```

Dazu höchstens vier passende Befehle je mit einem Satz Nutzen (einrichtung: /start;
thema bis gliederung: /weiter, /recherche; schreiben: /schreiben, /quellen, /pdf;
pruefen: /pruefen, /pdf; abgabe: /pdf, /pruefen final, /sync).

## 3. Reparieren

- Ohne Rückfrage: `node kit/werkzeuge/check.mjs --reparieren` (stellt beschädigte JSON-Dateien
  aus einer gültigen `.bak` wieder her), `node kit/werkzeuge/zustand.mjs init` (legt fehlende
  Nutzerdateien an), Dashboard starten. Ergebnis in einem Satz.
- Bleibt eine JSON-Datei kaputt (Dashboard meldet „beschädigt“): Fehlerstelle mit `node -e`
  finden, gezielt reparieren, bei Git-Konfliktmarken die Fassungen zusammenführen wie in
  `/sync`. Die `.bak` daneben ist die letzte gute Fassung.
- Mit Interview alles, was installiert oder sich anmeldet (winget, brew, `gh auth login`,
  `git config --global`), bis zu vier Punkte je Aufruf: „<Punkt> fehlt. Jetzt einrichten?“,
  „Ja, jetzt (Empfohlen)“, „Später“. Danach Check erneut. Windows: neue Programme oft erst
  nach Neustart von VS Code sichtbar.
- Projekt in OneDrive, iCloud oder Dropbox: Risiko erklären, beim Umzug helfen, nie selbst
  verschieben.

## 4. Rückgängig machen (erklären, wenn gefragt)

- **Im Dashboard:** Jede Aktion zeigt kurz „Rückgängig“ unten im Hinweis, mehrere nacheinander
  gehen auch.
- **Claudes Änderungen:** in VS Code der Rewind-Knopf am Prompt, in der Konsole zweimal Esc.
  Das setzt Gespräch und von Claude direkt bearbeitete Dateien zurück.
- **Grenze:** Rewind wirkt nicht auf Dateien, die Subagents (z. B. der Autor beim Kapitelschreiben)
  oder Befehle im Terminal geschrieben haben. Dafür vorher `/sync`, dann ist jeder gesicherte
  Stand auf GitHub zurückholbar. Der Autor legt zusätzlich Kopien in `arbeit/kapitel/.versionen/` an.
- **Kaputte JSON-Datei:** `.bak` daneben, siehe Reparieren.

## 5. Wenn nichts hilft

Problembericht zum Weitergeben: was sie wollte, was passiert ist (Fehlermeldung wörtlich),
Betriebssystem, Ergebnis von `check.mjs`, Version aus `kit/VERSION`. Keine Zugangsdaten,
keine Inhalte der Arbeit.

## 6. Abschluss

Nach Reparaturen oder der Lagekarte: Interview „Wie machen wir weiter?“, z. B.
„<nächster Schritt> (Empfohlen)“, „Dashboard öffnen“, „Andere Frage“.
