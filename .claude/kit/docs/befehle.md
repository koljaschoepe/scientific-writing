# Alle Befehle

> Elf Befehle, mehr braucht es nicht. Alles andere kannst du Claude einfach sagen.
> Stand: 2026-10-01

| Befehl | Was er tut | Wann |
| --- | --- | --- |
| `/start` | Richtet dein Projekt per Interview ein und legt deinen Zeitplan an. Später: Einstellungen ändern | ganz am Anfang, bei geänderten Vorgaben |
| `/weiter` | Macht den nächsten sinnvollen Schritt und fragt am Ende, ob du das Ergebnis freigibst | immer, wenn du nicht weißt, was jetzt dran ist |
| `/recherche [thema]` | Sucht Literatur und legt Vorschläge im Dashboard ab | Recherche-Phase, später für Lücken |
| `/quellen` | Nimmt deine gewählten Quellen auf: Literaturverzeichnis, PDF, wichtige Zitate mit Seite | nachdem du im Dashboard Quellen genommen hast |
| `/schreiben [nr]` | Plant und schreibt ein Unterkapitel oder verbessert deinen Text | Schreibphase |
| `/pruefen [nr\|alles\|final]` | Prüft wie eine Gutachterin: Zitate, Argumentation mit Notenschätzung, Sprache, Fachliches, Umfang | nach jedem Hauptkapitel, vor der Abgabe |
| `/pdf [entwurf\|expose\|docx]` | Baut das PDF, einen Entwurf, das Exposé oder eine Word-Datei | zum Anschauen, für die Betreuung |
| `/sync` | Sichert alles und gleicht mit GitHub ab | am Ende jedes Arbeitstags |
| `/update` | Holt eine neue Version des Kits, deine Arbeit und eigene Befehle bleiben unberührt | wenn ein Update gemeldet wird |
| `/hilfe [frage]` | Erklärt und repariert Technik, hilft beim Rückgängigmachen | wenn etwas hakt |
| `/dashboard [anpassen …]` | Öffnet das Dashboard, baut es um oder legt einen eigenen Befehl an | Überblick, Umbau |

Bis auf `/start`, `/sync`, `/update` und `/dashboard` startet Claude jeden Befehl auch von
selbst, wenn deine Bitte dazu passt. „Mach weiter“ genügt also für `/weiter`.

## Einstellungen ändern

Alles steht lesbar in `.arbeit/einstellungen.md` (im Dashboard ein Klick auf die
Einstellungen). Du kannst die Datei selbst ändern oder Claude sagen, was anders sein soll:
„Die Arbeit soll 70 bis 90 Seiten haben“, „Semikolons sind bei mir erlaubt“, „Abgabe ist
jetzt der 15. März“.

## Word für die Betreuung

Kommentiert deine Betreuung lieber in Word als im PDF: `/pdf docx`. Claude baut
`Arbeit.docx` aus deinen Kapiteln, mit Literaturverzeichnis. Die Kommentare trägst du danach
in den Chat oder legst die Datei in `quellen/eingang/`.

## Rückgängig machen

- **Im Dashboard:** nach jeder Aktion unten „Rückgängig“.
- **Was Claude geändert hat:** in VS Code der Rewind-Knopf am Eingabefeld (in der Konsole
  zweimal Esc).
- **Grenze:** Rewind holt keine Dateien zurück, die ein Hilfsagent (etwa beim Kapitelschreiben)
  oder ein Befehl im Terminal geschrieben hat. Dafür gibt es `/sync`: Jeder gesicherte Stand
  lässt sich zurückholen. Vor jeder Überarbeitung liegt außerdem eine Kopie in
  `kapitel/.versionen/`. Frag im Zweifel `/hilfe`.

## Beispiele für freie Aufträge

Du musst keinen Befehl kennen. Diese Sätze funktionieren genauso:

- „Erklär mir, was ein Graph Neural Network ist, wie für jemanden aus der Chemie.“
- „Such mir drei Übersichtsartikel zu maschinellem Lernen in der Retrosynthese.“
- „Ich habe Kapitel 3.2 selbst geschrieben, schau drüber und mach es besser.“
- „Mach mir aus `daten/ergebnisse/messung.csv` eine Abbildung für Kapitel 4.“
- „Bereite mein Gespräch mit meiner Betreuung am Donnerstag vor.“
- „Was fehlt noch bis zur Abgabe?“

Claude antwortet kurz: ein Satz Ergebnis, ein paar Stichpunkte, dann klickbare Links zu den
geänderten Dateien.
