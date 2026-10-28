# Review: look at every page before it leaves

The build gives `out/contact.png` (all pages) and `out/pages/page-NN.png` (each page at 110 dpi).
Read the contact sheet first for rhythm, then every page for detail. Fix the source, rebuild, look
again. Stop when a round finds nothing.

## On the contact sheet

- [ ] No blank page, and no page holding only a few lines or one stray table.
- [ ] Chapters open on a new page with their label, title and rule.
- [ ] Every chapter shows an exhibit (figure, table or tiles): no wall of text pages.
- [ ] The cover reads at thumbnail size: kind, title, subtitle, client.
- [ ] The contents fit on one page with the document information, or two at most.

## On each page

- [ ] Contents: every heading has a page number, and the numbers match the pages.
- [ ] Summary box: answer, numbers, expectation. It does not repeat the chapter title as its label.
- [ ] Key figures on one line each; the row aligned.
- [ ] Tables: no word cut inside a cell (`EXF-00` / `1`), no column of one word per line, header
  repeated after a page break, no table cut after its first row.
- [ ] Status chips use the same words for the same state everywhere.
- [ ] Figures: readable at print size (labels at least about 9 pt on the page), no cut label, no
  label on a line, caption states the finding.
- [ ] Callouts: not two in a row; each says something the text around it does not.
- [ ] Numbers agree between the summary, the body, the tables and the figures (count them).
- [ ] Names agree: the same product, person, plan or step keeps the same name throughout.
- [ ] Dates and amounts in the document's language format.
- [ ] Header and footer present on every page but the cover; page n of N right.

## Fixes that usually work

| Symptom | Fix |
|---|---|
| Half-empty page before a chapter | Shorten the chapter's end, compact a table (`compact`), narrow a figure (`"width=85"`) |
| Table alone on the next page | Let it break with `keep=0` (never kept whole), or tighten what precedes it |
| Long table split badly | Sort it so the important rows come first; split it into two tables by area |
| Key figure wraps | Shorter value (`≈ €38`), unit in the label |
| Figure too small to read | Fewer boxes, larger font in the SVG, or `flowchart TB` for Mermaid |
| Same label twice in a row | Rename the chapter ("Executive summary") or give the box a `title` |

## Reader test (for documents that matter)

Give the PDF path to a sub-agent that has no context, with this prompt:

> Read this document as its recipient would. Answer in this order: 1. What does the author want
> you to do or decide, and by when? 2. What three facts would you remember? 3. What would you ask
> the author before acting? 4. Which page, table or figure was unclear, and why? 5. Any number or
> name that contradicts another?

If its first answer is not the document's request, the summary is not doing its job. Fix what it
trips on, rebuild, and run the grid again.
