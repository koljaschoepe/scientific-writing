---
name: hilfe
description: Hilfe in jeder Lage. Zeigt, wo die Arbeit steht und was als Nächstes sinnvoll ist, prüft das System und repariert, was geht, beantwortet Fragen zur Bedienung.
argument-hint: "[frage]"
disable-model-invocation: true
---

# /hilfe: Wo bin ich, was jetzt, was ist kaputt?

Wann brauchst du das? Immer wenn die Person nicht weiterweiß, etwas nicht funktioniert oder
sie eine Frage zur Bedienung hat. Sprich einfach, ohne Fachbegriffe, und erkläre, was du tust.

Argument: `$ARGUMENTS` (optional, eine Frage oder Problembeschreibung)

## 1. Lage ermitteln (immer, still)

Parallel ausführen:
- `node kit/werkzeuge/stand.mjs` (Phase, nächster Schritt, Tage bis Abgabe, Kapitel, Quellen)
- `node kit/werkzeuge/check.mjs --json` (Systemcheck)

## 2. Antworten je nach Anlass

**Mit Frage oder Problem (`$ARGUMENTS` nicht leer):**
1. `docs/probleme.md` und, falls passend, `docs/befehle.md` lesen.
2. Passt ein Punkt aus dem Systemcheck (`ok: false`) zum Problem, zuerst den beheben.
3. Die Frage direkt beantworten, in höchstens fünf Sätzen, mit dem konkreten nächsten Schritt.

**Ohne Frage:** Eine kurze Lagekarte ausgeben:

```
Du bist hier:   Phase 3 von 8, Recherche
Nächster Schritt: 12 Vorschläge im Dashboard sichten (Reiter Quellen)
Abgabe:         in 143 Tagen (28.02.2027), Tagesziel 310 Wörter
System:         alles in Ordnung  |  2 Punkte brauchen Aufmerksamkeit
```

Dann die für diese Phase passenden Befehle (höchstens vier), je mit einem Satz Nutzen:

| Phase | Befehle |
| --- | --- |
| einrichtung | /start |
| thema, expose, gliederung | /weiter, /recherche |
| recherche | /recherche, /quellen, /weiter |
| schreiben | /schreiben, /quellen, /pdf, /weiter |
| pruefen | /pruefen, /schreiben, /pdf |
| abgabe | /pdf, /pruefen alles, /sync |

Immer gültig: /sync (sichern), /dashboard (Überblick), /hilfe.

## 3. Reparieren

Für jeden Punkt mit `ok: false` und `reparatur`:
- **Ohne Rückfrage** reparieren, was nichts installiert und nichts nach außen schickt:
  Dashboard starten (`/dashboard`), fehlende Nutzerdateien anlegen
  (`node kit/werkzeuge/zustand.mjs init`).
- **Mit Interview** alles, was installiert oder sich anmeldet (winget, brew, `gh auth login`,
  `git config --global`). Bis zu vier Punkte in einem Interview-Aufruf, je Frage
  „<Punkt> fehlt. Soll ich das jetzt einrichten?“ mit „Ja, jetzt (Empfohlen)“, „Später“ und
  einer Beschreibung, wofür es gebraucht wird. Für Namen und E-Mail Beispielwerte als Option
  anbieten, die Person tippt den echten Wert ins Freitextfeld.
- Nach jeder Installation den Check erneut laufen lassen. Unter Windows sind neue Programme
  oft erst nach Neustart von VS Code sichtbar: dann genau das sagen.
- Nicht reparierbar (zum Beispiel kein Internet, kein Speicherplatz): in einem Satz erklären,
  was die Person selbst tun kann.

Hinweis „Speicherort“: Liegt das Projekt in OneDrive, iCloud oder Dropbox, das Risiko erklären
(doppelte Dateien, Sperren, Konflikte mit /sync) und anbieten, beim Umzug zu helfen. Nie selbst
verschieben.

## 4. Wenn gar nichts hilft

Einen kurzen Problembericht zusammenstellen, den die Person weitergeben kann: was sie wollte,
was passiert ist (Fehlermeldung wörtlich), Betriebssystem, Ergebnis von `check.mjs`,
Kit-Version aus `kit/VERSION`. Keine Zugangsdaten, keine Inhalte der Arbeit.

## 5. Abschluss (immer)

Interview mit einer Frage „Wie machen wir weiter?“ und passenden Optionen, zum Beispiel
„Nächster Schritt: <aus stand> (Empfohlen)“, „Dashboard öffnen“, „Andere Frage“.
