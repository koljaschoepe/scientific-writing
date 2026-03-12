# Zitationsstil: Chicago

> Dieser Stil wird geladen, wenn `config.yaml` den Wert `chicago` enthält.
> Basierend auf dem Chicago Manual of Style, 17. Auflage (Author-Date-Variante).

## Grundprinzip

Author-Date-System: Kurzbeleg im Text in Klammern, Vollbeleg im
Literaturverzeichnis. Ähnlich wie APA, aber mit eigenen Formatierungsregeln.

Hinweis: Chicago kennt auch eine Fußnoten-Variante (Notes-Bibliography).
Dieses Framework unterstützt die Author-Date-Variante.

---

## Indirektes Zitat (Paraphrase)

```
(Autor Jahr)
(Autor Jahr, Seitenangabe)
```

Beispiele:
```
Digitale Transformation erfordert strategisches Vorgehen (Mueller 2021).
Die Studie zeigt signifikante Ergebnisse (Schmidt und Weber 2023, 45).
```

Alternativ als narratives Zitat:
```
Mueller (2021) argumentiert, dass digitale Transformation strategisches Vorgehen erfordert.
```

## Direktes Zitat

In Anführungszeichen, mit Seitenangabe:
```
"Die fehlenden Strukturen stellen eine zentrale Herausforderung dar" (Weber 2024, 49).
```

Bei mehr als 100 Wörtern: eingerücktes Blockzitat ohne Anführungszeichen.

## Autorenanzahl

| Anzahl | Format |
|--------|--------|
| 1 Autor | `(Mueller 2022)` |
| 2 Autoren | `(Mueller und Schmidt 2022)` |
| 3 Autoren | `(Mueller, Schmidt und Weber 2022)` |
| 4+ Autoren | `(Mueller et al. 2022)` |

## Mehrere Quellen

Getrennt durch Semikolon:
```
(Mueller 2020; Schmidt 2021; Weber et al. 2023)
```

## Mehrere Werke eines Autors im selben Jahr

```
(Mueller 2025a)
(Mueller 2025b)
```

---

## Spezialfälle

### Organisation als Autor
```
(Weltgesundheitsorganisation 2023)
```

### Ohne Datum
```
(Mueller o. J.)
```

### Internetquellen
```
(Organisation Jahr)
```

### Sekundärquelle (VERMEIDEN)
```
(Originalautor Jahr, zitiert in Sekundärautor Jahr)
```

---

## Literaturverzeichnis

### Buch
```
Nachname, Vorname. Jahr. Titel des Werkes. Auflage. Ort: Verlag.
```

### Journal-Artikel
```
Nachname, Vorname, und Vorname Nachname. Jahr. "Titel des Artikels." Zeitschriftentitel Band, Nr. Heft: Seitenzahlen. https://doi.org/xxxxx.
```

### Sammelband-Beitrag
```
Nachname, Vorname. Jahr. "Titel des Beitrags." In Titel des Sammelbands, herausgegeben von Vorname Nachname, Seitenzahlen. Ort: Verlag.
```

### Internetquelle
```
Nachname, Vorname, oder Organisation. Jahr. "Titel." Zugriff am TT. Monat JJJJ. URL.
```

### Sortierung
- Alphabetisch nach Erstautor
- Gleicher Autor: chronologisch
- Gleicher Autor und Jahr: a, b, c
- Hängender Einzug (hanging indent)

### Chicago-Besonderheiten
- **Kein Komma** zwischen Autor und Jahr im Text: `(Mueller 2022)` nicht `(Mueller, 2022)`
- **Seitenzahlen ohne "S."**: `(Mueller 2022, 45)` nicht `(Mueller 2022, S. 45)`
- **"und" statt "&"** bei mehreren Autoren im Text
- **Volle Vornamen** im Literaturverzeichnis (nicht nur Initialen)

---

## Richtwerte

**Zitationsdichte nach Arbeitstyp** (aus config.projekt.typ):
- Dissertation: 8-12 Zitationen pro Seite
- Masterarbeit: 6-10 Zitationen pro Seite
- Bachelorarbeit: 5-10 Zitationen pro Seite
- Hausarbeit: 3-6 Zitationen pro Seite
- Seminararbeit: 3-5 Zitationen pro Seite

**Verhältnis:**
- **Überwiegend Paraphrasen** (indirekte Zitate bevorzugt)
- **Direkte Zitate sparsam** (nur bei prägnanten Formulierungen)
- **Verbreitung:** Geistes- und Sozialwissenschaften
