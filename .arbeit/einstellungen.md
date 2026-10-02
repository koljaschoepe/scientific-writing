# Einstellungen

<!--
Deine Einstellungen an einer Stelle. Claude füllt sie beim Einrichten (/start) aus
und ändert sie, wenn du es sagst („Abgabe ist jetzt der 15. März“). Du kannst sie auch
selbst bearbeiten: nur den Teil hinter dem Doppelpunkt ändern. Leer heißt „nicht gesetzt“,
dann gilt der Standard des Kits. Alles zwischen <!- - und - -> ist Erklärung und wird ignoriert.
-->

## Arbeit
- titel:
- untertitel:
- typ: diplomarbeit
<!-- seminararbeit, hausarbeit, projektarbeit, bachelorarbeit, masterarbeit, diplomarbeit, dissertation -->
- sprache: de
<!-- de oder en -->
- fachprofil: naturwissenschaft
<!-- naturwissenschaft, technik-informatik, wirtschaft-sozial, geistes -->
- fachgebiet:
- methodik:
- seiten:
<!-- Umfang des Textteils in Seiten, als Bereich: 60-80. Jederzeit änderbar. -->
- abgabe:
<!-- Abgabedatum als JJJJ-MM-TT -->
- beginn:
- eingerichtet: nein

## Person
- name:
- matrikel:
- email:

## Hochschule
- name:
- fakultaet:
- institut:
- studiengang:
- ort:
- bibliothek:
<!-- Katalog oder Discovery-Suche der Hochschulbibliothek (Link), für die Recherche -->
- betreuer:
- erstgutachter:
- zweitgutachter:
- ki_regeln: unbekannt
<!-- erlaubt, eingeschraenkt, verboten oder unbekannt: was die Prüfungsordnung zu KI sagt -->
- ki_quelle:
<!-- Wo das steht (Link oder Dokument) -->

## Zitieren
- stil: chem-acs
<!-- chem-acs, chem-rsc, chem-angew, ieee, numeric, apa, harvard-de, authoryear, chicago -->
- sprache_quellen:

## Stil
<!-- Diese Schalter gelten für Claude beim Schreiben und für die Stilprüfung. -->
- ich_form: nein
<!-- ja: „ich“ und „wir“ sind erlaubt -->
- gedankenstriche: nein
<!-- nein, sparsam oder ja -->
- semikolons: nein
- satz_max_woerter: 30
<!-- längere Sätze meldet die Stilprüfung -->
- kommas_max: 3
<!-- mehr Kommas in einem Satz meldet die Stilprüfung -->
- schreibmodus: claude-schreibt
<!-- claude-schreibt, gemeinsam oder ich-schreibe -->

## Layout
- vorlage: koma
<!-- koma (Standard) oder tudscr (Corporate Design TU Dresden) -->
- schrift:
<!-- leer = Standardschrift. Sonst eine installierte Schrift, z. B. Libertinus Serif -->
- schriftgroesse: 11
- zeilenabstand: 1.5
- raender: 2.5/2.5/3/2.5
<!-- oben/unten/innen/außen in cm -->
- zweiseitig: nein
- logo:
<!-- Pfad zum Logo, z. B. abbildungen/logo.png. Leer = abbildungen/logo.* falls vorhanden -->
- verzeichnisse: abbildungen, tabellen, abkuerzungen, hilfsmittel, abstract, zusammenfassung, erklaerung
<!-- Auswahl aus: abbildungen, tabellen, abkuerzungen, formelzeichen, hilfsmittel, abstract, zusammenfassung, erklaerung, sperrvermerk, danksagung -->

## Technik
- python: uv
- zotero: nein
- playwright: ja
- abo: pro
<!-- pro oder max: wie viele Prüfungen parallel laufen dürfen -->
- dashboard_port: 4711
- editor: automatisch
<!-- automatisch, vscode oder cursor: welcher Editor Links aus Dashboard und Chat öffnet -->
