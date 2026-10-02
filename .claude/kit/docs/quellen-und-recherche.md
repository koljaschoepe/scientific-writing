# Quellen und Recherche

> Wie Claude und du gemeinsam Literatur finden, auswählen und auswerten.
> Stand: 2026-10-01

## Der Weg einer Quelle

```
gefunden  ->  Vorschlag im Dashboard  ->  du entscheidest  ->  ausgewertet  ->  zitiert
(/recherche)   (mit Begründung)          (nehmen/verwerfen)   (/quellen)       (/schreiben)
```

1. **Finden.** `/recherche` sucht in Fachdatenbanken (Crossref, Semantic Scholar), über deinen
   Uni-Zugang im Katalog deiner Bibliothek und bei Verlagen, in Google Scholar und im Web. Jede Fundstelle wird
   gegen ihre DOI geprüft. Erfundene Quellen kommen so nicht durch.
2. **Vorschlagen.** Jede Quelle landet im Reiter Quellen mit zwei Sätzen Inhalt, einer
   Begründung, warum sie passt, dem Kapitel, in das sie gehört, und einer Relevanz von 1 bis 5.
3. **Entscheiden.** Du klickst nehmen, verwerfen oder später. Sterne (0 bis 3) und Notizen
   helfen Claude, deinen Geschmack zu lernen. Markierungen wie „Kernquelle“ oder
   „Gegenposition“ können beide Seiten setzen.
4. **Auswerten.** `/quellen` holt für genommene Quellen den Volltext, trägt sie in
   `quellen/literatur.bib` ein und zieht die Kernaussage und die wichtigen Stellen mit
   Seitenzahl und Originalwortlaut nach `quellen/notizen/`. Die Seitenzahl ist die gedruckte
   Seite wie im Heft, nicht die Seite im PDF-Programm.
5. **Zitieren.** Beim Schreiben nutzt Claude ausschließlich ausgewertete Quellen.

## Eigene Quellen

- **PDF hast du schon:** im Dashboard hochladen oder in `quellen/eingang/` legen, dann
  `/quellen`. Claude erkennt Titel, Autoren und DOI selbst.
- **Nur eine DOI oder einen Link:** Claude einfach schicken („Nimm 10.1021/acs.jcim.9b00237 auf“).
- **Zotero:** Mit dem Zusatz Better BibTeX die Sammlung automatisch direkt nach
  `quellen/literatur.bib` exportieren lassen („Keep updated“). Oder einmalig als `.bib`
  exportieren, in `quellen/eingang/` legen, `/quellen`.
- **Zitat direkt aus dem PDF:** Quelle im Dashboard öffnen, Textstelle markieren, „Als Zitat“.
  Seite und Wortlaut werden gespeichert, Claude ergänzt beim nächsten `/quellen` den Rest.
- **Wo steht eine Quelle schon?** Im Reiter Quellen eine Zeile aufklappen: Zitate mit Seite,
  die Kapitel, in denen sie zitiert ist, und die Kernaussage. Ein Klick führt jeweils hin.

## Uni-Zugang (Bibliothek, Verlage)

Viele Artikel sind nur über die Uni frei. Claude nutzt dafür einen eigenen Browser, in dem du
dich einmal selbst anmeldest (Uni-Login). Deine Zugangsdaten tippst nur du, Claude speichert
sie nicht, und das Browserprofil liegt außerhalb deines Projekts. Details:
[installation-windows.md](installation-windows.md#einmalig-zugang-zur-uni-bibliothek).

Bitte fair bleiben: Claude lädt Volltexte einzeln für deine Arbeit, kein massenhaftes
Herunterladen. Das verbieten die Lizenzbedingungen der Verlage.

## Zitattreue

Aus der Erfahrung mit der Vorgänger-Arbeit dieses Kits: Die häufigsten Fehler sind keine
Formfehler, sondern verschobene Aussagen. Deshalb gilt:
- Zu jedem Zitat wird der **Originalwortlaut** gespeichert, auch bei englischen Quellen.
- Übersetzte Zitate stehen nie als wörtliches Zitat in der Arbeit, sondern als Paraphrase.
- `/pruefen` vergleicht jede Aussage mit dem Original im PDF, nicht mit einer Übersetzung.
