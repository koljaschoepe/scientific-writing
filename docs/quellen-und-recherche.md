# Quellen und Recherche

> Wie Claude und du gemeinsam Literatur finden, auswählen und auswerten.
> Stand: 2026-09-30

## Der Weg einer Quelle

```
gefunden  ->  Vorschlag im Dashboard  ->  du entscheidest  ->  ausgewertet  ->  zitiert
(/recherche)   (mit Begründung)          (nehmen/verwerfen)   (/quellen)       (/schreiben)
```

1. **Finden.** `/recherche` sucht in Fachdatenbanken (Crossref, Semantic Scholar), über deinen
   Uni-Zugang in der SLUB und bei Verlagen, in Google Scholar und im Web. Jede Fundstelle wird
   gegen ihre DOI geprüft. Erfundene Quellen kommen so nicht durch.
2. **Vorschlagen.** Jede Quelle landet im Reiter Quellen mit zwei Sätzen Inhalt, einer
   Begründung, warum sie passt, dem Kapitel, in das sie gehört, und einer Relevanz von 1 bis 5.
3. **Entscheiden.** Du klickst nehmen, verwerfen oder später. Sterne (0 bis 3) und Notizen
   helfen Claude, deinen Geschmack zu lernen. Markierungen wie „Kernquelle“ oder
   „Gegenposition“ können beide Seiten setzen.
4. **Auswerten.** `/quellen` holt für genommene Quellen den Volltext, trägt sie in
   `quellen/literatur.bib` ein und zieht die wichtigen Aussagen mit Seitenzahl und
   Originalwortlaut nach `quellen/zitate/`.
5. **Zitieren.** Beim Schreiben nutzt Claude ausschließlich ausgewertete Quellen.

## Eigene Quellen

- **PDF hast du schon:** im Dashboard hochladen oder in `quellen/eingang/` legen, dann
  `/quellen`. Claude erkennt Titel, Autoren und DOI selbst.
- **Nur eine DOI oder einen Link:** Claude einfach schicken („Nimm 10.1021/acs.jcim.9b00237 auf“).
- **Zotero:** Sammlung als BibTeX exportieren (am besten mit Better BibTeX), Datei in
  `quellen/eingang/` legen, `/quellen`.

## Uni-Zugang (SLUB, Verlage)

Viele Artikel sind nur über die Uni frei. Claude nutzt dafür einen eigenen Browser, in dem du
dich einmal selbst anmeldest (Uni-Login). Deine Zugangsdaten tippst nur du, Claude speichert
sie nicht, und das Browserprofil liegt außerhalb deines Projekts. Details:
[installation-windows.md](installation-windows.md#einmalig-zugang-zur-uni-bibliothek-slub).

Bitte fair bleiben: Claude lädt Volltexte einzeln für deine Arbeit, kein massenhaftes
Herunterladen. Das verbieten die Lizenzbedingungen der Verlage.

## Zitattreue

Aus der Erfahrung mit der Vorgänger-Arbeit dieses Kits: Die häufigsten Fehler sind keine
Formfehler, sondern verschobene Aussagen. Deshalb gilt:
- Zu jedem Zitat wird der **Originalwortlaut** gespeichert, auch bei englischen Quellen.
- Übersetzte Zitate stehen nie als wörtliches Zitat in der Arbeit, sondern als Paraphrase.
- `/pruefen` vergleicht jede Aussage mit dem Original im PDF, nicht mit einer Übersetzung.
