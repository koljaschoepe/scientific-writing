# Style guide: English academic writing

> Loaded when `arbeit/projekt.json → arbeit.sprache` is `en`. Stand: 2026-09-30
> The German guides in `../schreiben/` still apply where they are language independent
> (paragraph structure, transitions via concept names, citation rules).

## Principles

- Clear, concise, precise. One idea per sentence, one topic per paragraph.
- Topic sentence first, then evidence, then interpretation, then link (MEAL).
- Prefer active voice where the field accepts it. In chemistry "we" is common in papers,
  in theses only if the supervisor agrees (record the decision in `arbeit/stil.md`).
  Otherwise use impersonal constructions: "The results show ...", "This work investigates ...".
- Tense: present for established knowledge and for what the thesis does ("Chapter 3
  describes"), past for your own methods and results ("The samples were heated").

## Hard thresholds (same as German)

- Split sentences longer than about 30 words or with four or more commas.
- No more than two nominalisations ending in -tion/-ment/-ness per sentence.
- The same content word at most three times per paragraph (fixed terms excepted).
- No dashes as parenthesis, no semicolons, colons rarely.

## Avoid

| Avoid | Use |
| --- | --- |
| very, really, quite, extremely | a number or a precise adjective |
| a lot of, lots of | many, much, a large number of |
| get, got | obtain, become, receive |
| big, huge, tremendous | large, substantial, considerable |
| prove (for data) | show, demonstrate, indicate, suggest |
| it is interesting to note that | delete |
| due to the fact that | because |
| in order to | to |
| novel, groundbreaking, revolutionary | new, first, (or state what is new) |
| contractions (don't, it's) | do not, it is |
| delve, leverage, utilize, intricate, pivotal, tapestry, crucial (overused) | examine, use, complex, key, important |

The last row lists words that readers increasingly associate with AI-generated text.
Use them only when no plainer word fits.

## Hedging

Match certainty to evidence: "shows" (strong), "indicates" (good), "suggests" (weak),
"may" (speculative). Never "proves" for empirical data.

## Numbers and units

- SI units with a space: 25 °C, 5.0 mmol (the template sets this via siunitx).
- Decimal point, not comma. Thousands separator thin space: 12 500.
- Spell out numbers one to nine in running text unless followed by a unit.

## British or American

Pick one (default: American, as in ACS journals) and keep it consistent. Record the
choice in `arbeit/stil.md`.
