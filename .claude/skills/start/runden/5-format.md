# Runde 5: Format (bis 4 Fragen)

Ziel: `zitieren.stil`, Abschnitt `## Layout` (`vorlage`, `schrift`, `schriftgroesse`,
`zeilenabstand`, `raender` als oben/unten/innen/außen in cm wie `2.5/2.5/3/2.5`, `zweiseitig`,
`logo`, `verzeichnisse` kommagetrennt).

1. „Welcher Zitierstil?“ header „Zitierstil“ → `zitieren.stil`, Optionen nach Fachprofil:
   - Naturwissenschaft: „ACS (Empfohlen)“ `chem-acs`, „RSC“ `chem-rsc`,
     „Angewandte Chemie“ `chem-angew`, „Vorgabe der Gruppe“ (Freitext)
   - Technik/Informatik: „IEEE (Empfohlen)“ `ieee`, „Autor-Jahr“ `authoryear`, „APA“ `apa`
   - Wirtschaft/Sozial: „Harvard mit vgl. (Empfohlen)“ `harvard-de`, „APA 7“ `apa`
   - Geistes: „Chicago Autor-Jahr“ `chicago`, „Autor-Jahr“ `authoryear`, „Vorgabe“
   Eine Freitext-Vorgabe auf den nächsten bekannten Stil abbilden und das in der
   Zusammenfassung sagen. Unbekannte Stile baut das PDF nicht.
2. „Gibt es eine Vorlage oder ein Merkblatt für das Layout?“ header „Vorlage“
   - „Nein, nimm die Standardvorlage (Empfohlen)“: `vorlage: koma`, schlicht und hochschulneutral
   - „Ja, ein Merkblatt als PDF“: Person legt es nach `quellen/eingang/` (oder nennt den Pfad).
     Ränder, Schrift, Zeilenabstand, Pflichtbestandteile übertragen und per Interview
     bestätigen lassen. Bewertungskriterien darin nach `.arbeit/betreuung/bewertung.md`.
   - „Ja, eine LaTeX-Vorlage der Arbeitsgruppe“: nach `quellen/eingang/`. Ehrlich sagen: Das
     Kit baut mit seinen eigenen Vorlagen. Ränder, Schrift und Pakete werden übertragen (siehe
     `/pdf`, Abschnitt Format und Vorlage).
   - Nur wenn `hochschule.name` die TU Dresden ist: „Klasse tudscr der TU Dresden“ (`tudscr`),
     Hinweis: altes Corporate Design (Stand 2026-09), mit dem Lehrstuhl klären.
3. „Sollen Deckblatt und Verzeichnisse wie üblich angelegt werden?“ header „Verzeichnisse“
   - „Ja, Standard (Empfohlen)“: `abbildungen, tabellen, abkuerzungen, hilfsmittel, abstract,
     zusammenfassung, erklaerung`
   - „Ich wähle selbst“: Folgefrage mit multiSelect (zusätzlich `formelzeichen`,
     `sperrvermerk`, `danksagung`)
4. „Hast du ein Logo deiner Hochschule für das Deckblatt?“ header „Logo“
   - „Später“ / „Ja, lege ich nach abbildungen/logo.png“ (`logo: abbildungen/logo.png`) / „Kein Logo“
