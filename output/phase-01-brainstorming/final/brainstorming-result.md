---
phase: 1
status: draft
datum: 2026-03-14
---

# Brainstorming-Ergebnis

## Themenvorschläge

### Thema 1: Strukturierungsstrategien zur Kontextfenster-Optimierung bei LLMs
**Beschreibung:** Untersuchung verschiedener Strategien (Chunking, Kompression, Priorisierung, Zusammenfassung) zur Strukturierung des Kontextfensters bei Large Language Models. Systematischer Vergleich anhand publizierter Benchmarks und Herstellerdokumentation.
**Forschungsfrage:** Welche Strategien zur Strukturierung des Kontextfensters erzielen anhand publizierter Benchmarks und Herstellerdokumentation die höchste Ausgabequalität bei Large Language Models?
**Methodik:** Empirisch-quantitativ, systematischer kriterienbasierter Vergleich
**Eignung:** Gut
**Begründung:** Aktuelles Thema mit ausreichend verfügbarer Literatur und Herstellerdokumentation. Der Umfang ist für 10-15 Seiten gut abgrenzbar. Öffentliche Benchmarks und Dokumentationen von OpenAI, Anthropic und Google ermöglichen eine fundierte quantitative Analyse ohne eigene Infrastruktur.

## Empfohlenes Thema

**Arbeitstitel:** Strukturierungsstrategien zur Optimierung der Kontextfensternutzung bei Large Language Models -- Ein systematischer Vergleich
**Forschungsfrage:** Welche Strategien zur Strukturierung des Kontextfensters (Chunking, Kompression, Priorisierung, Zusammenfassung) erzielen anhand publizierter Benchmarks und Herstellerdokumentation die höchste Ausgabequalität bei Large Language Models?
**Unterfragen:**
1. Welche Strukturierungsstrategien werden in der aktuellen Literatur und Herstellerdokumentation beschrieben?
2. Anhand welcher Metriken lässt sich die Effektivität dieser Strategien quantitativ vergleichen?
**Methodik:** Systematischer kriterienbasierter Vergleich auf Basis von Herstellerdokumentation (OpenAI, Anthropic, Google) und wissenschaftlichen Publikationen. Quantitative Auswertung anhand definierter Vergleichskriterien (z.B. Antwortqualität, Informationsretention, Effizienz).
**Kapitelmodell:** Seminararbeit Variante A (3 Kapitel mit Unterkapiteln)
**Abgrenzung:** Kein eigenes Training oder Fine-Tuning von Modellen. Kein Vergleich der LLMs untereinander. Fokus liegt ausschließlich auf Kontextmanagement-Strategien, nicht auf Modellarchitekturen.

## Vorgeschlagene Kapitelstruktur

```
1. Einleitung
   1.1 Problemstellung
   1.2 Zielsetzung
2. Hauptteil
   2.1 Grundlagen: Large Language Models und Kontextfenster
   2.2 Strukturierungsstrategien im Überblick
   2.3 Systematischer Vergleich anhand definierter Metriken
3. Fazit
```

## Nächste Schritte
1. Gliederung mit Unterkapiteln und Seitengewichtung erstellen
2. Quellen aus Herstellerdokumentation und wissenschaftlichen Papers sammeln
3. Vergleichskriterien und Metriken definieren

## Offene Fragen
- Welche konkreten Benchmarks eignen sich am besten für den Vergleich?
- Sollen auch kommerzielle Tools (z.B. LangChain, LlamaIndex) als Strategien einbezogen werden?
- Wie viele Strategien sollen verglichen werden (3-5 erscheint realistisch für den Umfang)?
