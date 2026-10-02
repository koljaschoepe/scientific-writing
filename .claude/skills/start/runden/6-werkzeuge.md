# Runde 6: Werkzeuge (bis 4 Fragen, nur relevante)

Ziel: Abschnitt `## Technik` (`python`, `zotero`, `playwright`, `abo`), `hochschule.bibliothek`.

1. Nur wenn `arbeit.methodik` computational, gemischt oder empirisch-quantitativ ist:
   „Gehört Programmieren oder Datenauswertung zu deiner Arbeit?“ header „Code“
   - „Ja, richte es ein (Empfohlen)“: `uv init code`, dann `uv add numpy pandas matplotlib`
     (Chemie zusätzlich `rdkit`, bei ML `scikit-learn`), `python: uv`. Erklären: „Du musst
     nichts über Python wissen, ich übernehme das.“
   - „Später“ / „Nein“
2. „Nutzt du Zotero für Literatur?“ header „Zotero“
   - „Nein, Claude verwaltet die Quellen (Empfohlen)“ / „Ja“ (`zotero: ja`, Anleitung aus
     `.claude/kit/leitfaeden/recherche.md`, Abschnitt Zotero)
3. „Soll ich dir den Browser-Zugang zur Bibliothek einrichten?“ header „Bibliothek“
   - „Ja, jetzt (Empfohlen)“: Katalog- oder Login-Seite der Bibliothek der Hochschule per
     Websuche finden, Adresse per Interview bestätigen lassen, nach `hochschule.bibliothek`.
     Playwright öffnet sie, die Person meldet sich selbst an. Du tippst nie Passwörter.
   - „Später“: kommt bei der ersten Recherche
4. Nur wenn der Systemcheck Probleme meldet: „Einige Programme fehlen noch (<Liste in
   Klartext>). Soll ich sie jetzt reparieren?“ header „Reparieren“: „Ja (Empfohlen)“,
   „Später mit /hilfe“.

Abo nicht abfragen. `abo: pro` bleibt, solange die Person nichts anderes sagt. Es bestimmt,
wie viele Hilfsagenten gleichzeitig laufen.
