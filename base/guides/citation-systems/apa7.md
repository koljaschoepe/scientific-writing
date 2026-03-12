# Zitationsstil: APA 7

> Dieser Stil wird geladen, wenn `config.yaml` den Wert `apa7` enthält.
> Basierend auf dem Publication Manual der APA, 7. Auflage.

## Grundprinzip

Autor-Jahr-System mit Kurzbeleg im Text und Vollbeleg im Literaturverzeichnis.

---

## Indirektes Zitat (Paraphrase)

```
(Autor, Jahr)
(Autor, Jahr, S. X)
```

Beispiele:
```
Digitale Transformation erfordert strategisches Vorgehen (Mueller, 2021).
Die Studie zeigt signifikante Unterschiede (Schmidt & Weber, 2023, S. 45).
```

Alternativ als narratives Zitat:
```
Mueller (2021) argumentiert, dass digitale Transformation strategisches Vorgehen erfordert.
Laut Schmidt und Weber (2023) zeigen sich signifikante Unterschiede.
```

## Direktes Zitat

Mit Seitenangabe, in Anführungszeichen:

```
(Autor, Jahr, S. X)
```

Beispiel:
```
"Die fehlenden Strukturen stellen eine zentrale Herausforderung dar" (Weber, 2024, S. 49).
```

Bei mehr als 40 Wörtern: eingerücktes Blockzitat ohne Anführungszeichen.

## Autorenanzahl

| Anzahl | Erstnennung | Folgend |
|--------|------------|---------|
| 1 Autor | `(Mueller, 2022)` | `(Mueller, 2022)` |
| 2 Autoren | `(Mueller & Schmidt, 2022)` | `(Mueller & Schmidt, 2022)` |
| 3+ Autoren | `(Mueller et al., 2022)` | `(Mueller et al., 2022)` |

APA 7 Änderung: Ab 3 Autoren IMMER "et al." (auch bei Erstnennung).

## Mehrere Quellen

Chronologisch, getrennt durch Semikolon:
```
(Mueller, 2020; Schmidt, 2021; Weber et al., 2023)
```

## Mehrere Werke eines Autors im selben Jahr

```
(Mueller, 2025a)
(Mueller, 2025b)
```

---

## Spezialfälle

### Organisation als Autor
Erstnennung:
```
(Weltgesundheitsorganisation [WHO], 2023)
```
Folgend:
```
(WHO, 2023)
```

### Ohne Datum
```
(Mueller, o. D.)
```

### Internetquellen
```
(Organisation, Jahr)
```

### Gesetze
```
(Datenschutz-Grundverordnung [DSGVO], 2016, Art. 4 Nr. 7)
```

### Sekundärquelle (VERMEIDEN)
```
(Originalautor, Jahr, zitiert nach Sekundärautor, Jahr)
```

---

## Literaturverzeichnis

### Buch
```
Nachname, V. (Jahr). Titel des Werkes (X. Aufl.). Verlag.
```

### Journal-Artikel
```
Nachname, V. & Nachname, V. (Jahr). Titel des Artikels. Zeitschriftentitel, Band(Heft), Seitenzahlen. https://doi.org/xxxxx
```

### Sammelband-Beitrag
```
Nachname, V. (Jahr). Titel des Beitrags. In V. Herausgeber (Hrsg.), Titel des Sammelbands (S. X-Y). Verlag.
```

### Internetquelle
```
Nachname, V. oder Organisation. (Jahr, Tag. Monat). Titel. URL
```

### Sortierung
- Alphabetisch nach Erstautor
- Gleicher Autor: chronologisch
- Gleicher Autor und Jahr: a, b, c
- Hängender Einzug (hanging indent)

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
- **DOI immer angeben** wenn verfügbar
