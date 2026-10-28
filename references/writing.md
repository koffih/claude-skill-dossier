# Writing a document people act on

The reader of a business document is busy, reads the first page carefully, skims the rest, and
comes back to one table when they have to act. Write for that reader.

## The first page carries the document

- The summary box says **the answer, the numbers that matter, and what the reader must do**. A
  reader who stops there must be able to act.
- Three or four key figures under it. A key figure is a number with its unit and a label, never a
  sentence: `≈ €38 · server per month`, not `Moderate hosting costs`.
- Then the requests, numbered, each starting with a verb in bold: **Settle the payment...**,
  **Create two accounts...**.
- When two kinds of reader share the document, a reading guide names the chapters for each.

## Every chapter

- Opens with its goal (one sentence) and a lead paragraph that states the chapter's point.
- Has one exhibit: a figure, a table or key figures. Prose that lists items with the same attributes
  (name, state, owner, cost) is a table waiting to happen.
- Ends when its point is made. No closing recap, no "in conclusion".

## Sentences and paragraphs

- The point first, the reasons after. "Yes, with three conditions" before the conditions.
- Numbers instead of adjectives: "3 open ports", not "a minimal attack surface"; "about half of
  sales lost", not "a significant impact".
- One idea per paragraph, three sentences at most in the body, under 25 words a sentence on average.
  The checker warns over 110 words a paragraph and 38 words a sentence.
- Plain words the reader uses. Technical terms only where the technical reader needs them, explained
  once on first use ("an EFVP, the privacy impact assessment Law 25 requires").
- Say who does what: "Maria designates...", "We prepare...". Passive voice hides the owner.
- State uncertainty once, where it applies, with what would settle it: "about 500 calls a day
  according to the contract, to be confirmed". Never spread hedges over every sentence.
- Bold marks what a skimming reader must catch: two or three phrases per page, not whole sentences.

## Words to cut

The checker flags these; rewrite the sentence rather than swap the word.

- French: ce document présente, il est important de noter, il convient de, dans le cadre de, en
  termes de, au niveau de, force est de constater, solution robuste, de manière significative, tirer
  parti, véritable, incontournable, en conclusion.
- English: this document outlines, it is important to note, it is worth noting, in order to ensure,
  robust solution, leverage, seamless, cutting-edge, state-of-the-art, game-changer, delve, holistic,
  synergy, in conclusion.

## Typography

- No long dashes (— or –) by default: use a colon, a comma or parentheses. Set `allowDashes: true`
  if the house style wants them.
- French: a space before `: ; ? !` and inside « guillemets »; numbers with a space as thousands
  separator (`20 000`), comma as decimal; amounts as `38 €`, `190 $ US`.
- English: `€38`, `US$190`; dates as `October 27, 2026`; Oxford comma or not, but the same everywhere.
- The same thing keeps the same name everywhere: if chapter 3 says "staff account", chapter 11 does
  not say "employee login".

## Tables

- One row per item, one column per attribute, units in the header.
- Sort by what the reader scans for: priority, then date (newest first for logs).
- A status column uses chips (`{{good:Done}}`) with a fixed vocabulary.
- A cell is a phrase, not a paragraph (the checker warns over 45 words).
- Six columns at most on a portrait page.

## Translating

Translate the source, not the output. Translate the figures too (labels are in the SVG files: keep
one file per language, `archi-fr.svg`, `archi-en.svg`). Adapt, do not transpose: amounts, dates,
quotation marks and chapter titles follow the target language ("Synthèse" becomes "Executive
summary", not "Synthesis").
