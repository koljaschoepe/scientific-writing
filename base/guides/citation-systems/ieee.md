# Zitationsstil: IEEE

> Dieser Stil wird geladen, wenn `config.yaml` den Wert `ieee` enthält.
> Basierend auf dem IEEE Reference Guide.

## Grundprinzip

Numerisches System: Quellen werden im Text durch Nummern in eckigen Klammern
referenziert. Die Nummern verweisen auf das Literaturverzeichnis in der
Reihenfolge ihres ersten Auftretens.

---

## Zitationsformat im Text

### Einzelne Quelle
```
[1]
```

Beispiele:
```
Die Studie zeigt signifikante Ergebnisse [1].
Wie in [1] dargelegt, sind die Ergebnisse signifikant.
Mueller [1] zeigt, dass die Ergebnisse signifikant sind.
```

### Mehrere Quellen
```
[1], [3]           -> einzelne, nicht aufeinanderfolgende
[1]-[3]            -> aufeinanderfolgende Bereich
[1], [3], [5]-[7]  -> Kombination
```

### Mit Seitenangabe
```
[1, S. 45]
[1, Kap. 3]
[1, Abb. 2]
```

---

## Nummerierung

- Quellen werden in der **Reihenfolge ihres ersten Auftretens** nummeriert
- Jede Quelle erhält genau EINE Nummer
- Bei erneutem Verweis wird die gleiche Nummer verwendet
- KEINE alphabetische Sortierung im Literaturverzeichnis

---

## Spezialfälle

### Mehrere Werke eines Autors
Erhalten separate Nummern in der Reihenfolge ihres Auftretens.

### Internetquellen
```
Wie in [5] beschrieben...
```
Im Verzeichnis: URL + Abrufdatum

### Standards und Normen
```
Gemäß [8]...
```
Im Verzeichnis: Normnummer + Titel

---

## Literaturverzeichnis

Einträge werden NICHT alphabetisch, sondern nach Reihenfolge des
ersten Auftretens nummeriert.

### Buch
```
[1] V. Nachname, Titel des Werkes, X. Aufl. Ort: Verlag, Jahr.
```

### Journal-Artikel
```
[2] V. Nachname und V. Nachname, "Titel des Artikels," Zeitschriftentitel, Bd. X, Nr. Y, S. X-Y, Monat Jahr.
```

### Konferenzbeitrag
```
[3] V. Nachname, "Titel," in Proc. Konferenzname, Ort, Jahr, S. X-Y.
```

### Internetquelle
```
[4] V. Nachname/Organisation, "Titel." URL (abgerufen: TT.MM.JJJJ).
```

### Autorenformat
- Bis 6 Autoren: alle auflisten
- Mehr als 6: erste 3 + "et al."
- Vornamen als Initialen: V. Nachname

---

## Richtwerte

**Zitationsdichte nach Arbeitstyp** (aus config.projekt.typ):
- Dissertation: 8-12 Zitationen pro Seite
- Masterarbeit: 6-10 Zitationen pro Seite
- Bachelorarbeit: 5-10 Zitationen pro Seite
- Hausarbeit: 3-6 Zitationen pro Seite
- Seminararbeit: 3-5 Zitationen pro Seite

**Hinweis:** IEEE-Zitationen sind kompakter als bei Harvard/APA. Trotzdem gelten
die gleichen Richtwerte für die Belegdichte. Die Nummern stören den Lesefluss weniger.

**Verbreitung:** Ingenieurwissenschaften, Informatik, Technik
