# Runde 2: Du und deine Hochschule (4 Fragen)

Ziel: `person.name`, `person.email`, `hochschule.name`, `hochschule.ort`, `hochschule.fakultaet`,
`hochschule.institut`.

1. „Wie heißt du?“ header „Name“: „Aus Git übernehmen“ (`git config user.name`), „Später klären“.
2. „An welcher Hochschule?“ header „Hochschule“: Name über Freitext, „Später klären“. Ort
   ableiten, wenn eindeutig.
3. „Welche Fakultät bzw. welches Institut?“ header „Institut“: Freitext, „Später klären“.
4. „Deine E-Mail-Adresse?“ header „E-Mail“: „Aus Git übernehmen“ (`git config user.email`),
   „Später klären“. Beschreibung: wird für höfliche Anfragen an Literaturdatenbanken gebraucht
   und steht auf dem Deckblatt nur, wenn du willst.

Matrikelnummer (`person.matrikel`) und Studiengang (`hochschule.studiengang`) nur aus Freitext
übernehmen, nicht aktiv abfragen. Sie stehen später in der Datei.
