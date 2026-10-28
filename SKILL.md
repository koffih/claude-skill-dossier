---
name: dossier
description: "Produce a client-ready, designed document as Word (.docx) and PDF: status report, proposal, functional specification, audit, roadmap, decision memo, procedure. Cover page, contents with real page numbers, document information and version history, chapter openers, executive summary box, key-figure tiles, styled tables with status chips, numbered figures drawn as SVG, Mermaid or data charts in the theme's colours, header and footer; then every page is rendered and looked at before delivery, in one or several languages. Use when a document leaves the house (sent to a client, a board, a partner, an investor, a public body), when the user asks for a Word or PDF version to send, a professional or beautiful document, or says a document looks poor, plain or generic. French triggers (fais-moi un document Word, version Word a envoyer a ma cliente, document professionnel, rapport client, bilan, feuille de route, cahier des charges, proposition commerciale, compte rendu officiel, dossier de presentation, audit, version anglaise du document, les documents sont pauvres, rends ce document plus beau, document PDF a envoyer)."
argument-hint: "[what the document is, who reads it, languages] [--unattended]"
---

# Dossier: documents a client keeps, reads and acts on

A document that leaves the house is judged in the first ten seconds: the cover, the contents, the
first page of text. It is then read for one thing: **what does the author want me to know, decide or
do?** This skill produces documents that answer that question on the first page, and that look like
the work of a firm that cares, in Word and in PDF, from one plain-text source.

The method has six steps. The detail lives in `references/`: load a file at the step that needs it,
not before.

| Step | What | Reference |
|---|---|---|
| 0 | Brief: reader, decision, type, languages, brand | this file |
| 1 | Plan: chapters, the point of each, the exhibit of each | `references/document-types.md` |
| 2 | Write the source | `references/source-format.md`, `references/writing.md` |
| 3 | Draw the figures | `references/figures.md` |
| 4 | Build | this file |
| 5 | Look at every page, fix, rebuild | `references/review.md` |
| 6 | Deliver | this file |

`references/design.md` covers themes, brand colours and when to change the layout.

## Setup, once per machine

```bash
<skill-dir>/install.sh --deps-only   # npm packages of the engine + the bundled fonts
```

Needs Node 18+, Chrome or Chromium (figures, cover, contact sheet), LibreOffice (PDF) and Poppler
(`pdftoppm`, `pdftotext`). The engine finds Chrome by itself; set `CHROME_PATH` otherwise. Without
LibreOffice the build stops after the Word file (`--no-pdf`): the contents then show `0` for page numbers, so say so.

## Step 0: the brief

Before writing a line, settle five things. Infer what the conversation already says; ask only what
is missing and changes the document, **one question at a time**, each with your recommendation.
With `--unattended`, take the recommendation and state it in the delivery message.

1. **The reader.** Name them (Maria, the board, the technical advisor). A document for two readers
   says which chapters are for whom, in a reading guide on the first page.
2. **What the reader must do after reading.** Approve, pay, provide access, choose between options,
   just know. This sentence becomes the summary box.
3. **The type**: status report, proposal, specification, audit, roadmap, decision memo, procedure.
   Each has a structure in `references/document-types.md`.
4. **Languages.** One source file per language, figures included. Never machine-translate a built
   document: translate the source, then build.
5. **Brand.** The client's colours or logo if the document goes out under their name; otherwise
   pick the theme that fits the sector (`references/design.md`).

When the content already exists (a page, a chat, notes, an earlier document), collect it first and
work from it: the facts are the user's, the structure and the finish are yours.

## Step 1: the plan

Write the chapter list before the text. For each chapter: its title, **its point in one sentence**,
and **its exhibit** (a figure, a table, key figures). A chapter whose point you cannot write in one
sentence is two chapters or none. A chapter with nothing to show is usually prose that wants to be a
table.

The first chapter is always the summary: the answer, the three or four numbers that matter, what is
expected of the reader. The last chapter is what happens next: requests, decisions, owners.

Show the plan to the user when the document is long or the stakes are high; otherwise go on.

## Step 2: the source

One Markdown file per language, front matter on top, `:::` blocks for what plain Markdown cannot
say. Everything is in `references/source-format.md`; the essentials:

```markdown
---
title: Booking service
kind: Status report and roadmap
subtitle: One sentence that says what the reader gets.
client: Client name
author: Your firm
date: 2026-10-27
version: "1.0"
confidential: Confidential
lang: en
theme: sobre
---

# Summary

:::summary
The answer, in three to five sentences, with the numbers and what is expected.
:::

:::kpis
4 | projects | on one server
≈ US$190 | per month | services
:::

# A chapter

:::goal
What this chapter establishes, in one sentence.
:::

Lead paragraph with the point of the chapter.

![Caption that states the finding, not the topic.](figures/flow.svg)

:::table{caption="What the table shows" widths="20,55,25" firstcol}
| Item | Detail | Status |
|---|---|---|
| Access | Key-only login | {{good:In place}} |
:::
```

Write it with the rules of `references/writing.md`: the point first, numbers instead of adjectives,
one idea per paragraph, no filler, a table as soon as items share attributes.

## Step 3: the figures

Each figure is a file next to the source: `.svg` drawn by hand (architecture, flow, roadmap, matrix),
`.mmd` for Mermaid (sequence, state, simple flows), `.chart.json` for data (ECharts option), `.html`
for anything else, `.png`/`.jpg` for photos and screenshots. SVG and HTML figures use the theme's
CSS variables (`var(--accent)`, `var(--ink)`...), so they match the document in any theme. Norms,
sizes and the choice of exhibit are in `references/figures.md`.

## Step 4: build

```bash
node <skill-dir>/scripts/build.mjs path/to/source.md [--out DIR] [--theme NAME|file.json]
```

It checks the source (errors stop the build, warnings are listed), renders the figures and the
cover, writes the Word file, converts it to PDF, finds the page of every heading, writes those
numbers into the contents, rebuilds, and renders every page to PNG plus a contact sheet. Output in
`out/` next to the source (one `--out` per language, or the page images overwrite each other):

- `<file>.docx` and `<file>.pdf`: the deliverables;
- `contact.png`: all pages side by side; `pages/page-NN.png`: each page;
- `report.json`: page count, contents with pages, warnings.

`node <skill-dir>/scripts/check.mjs source.md` runs the checks alone. Read every warning: fix it, or
keep it knowingly and say why.

## Step 5: look at it

**A document you have not looked at is not finished.** Open `contact.png`, then each page image, and
run the grid in `references/review.md`: blank or half-empty pages, a table cut after one row, a figure
too small to read, a word cut in a narrow column, a callout that repeats its chapter title, numbers
that disagree between the summary and the body. Fix the source, rebuild, look again. Two or three
rounds is normal.

For an important document, give the PDF to a fresh sub-agent with no context and ask it what the
author wants from the reader, what it would ask before acting, and what it found unclear. Fix what
it trips on.

## Step 6: deliver

- Hand over the `.docx` and the `.pdf` by full path (or attach them), one pair per language.
- Keep the source and its figures next to them: the next revision starts there, not from the Word file.
- Say in two lines what the document asks of its reader, and list anything you marked
  "to be confirmed" so the user checks it before sending.
- Validate the Word file when it goes to an important client: the `docx` skill of
  `anthropics/skills` ships `scripts/office/validate.py` (needs `defusedxml` and `lxml`).

## Pitfalls already paid for

- **Exporting a docs page to Word is not a document.** A chat-built page exported as `.docx` has no
  cover, no contents and no design. Build from a source with this skill instead.
- **A blank page after the front matter**: a trailing empty paragraph spills over, then the first
  chapter breaks the page again. The writer drops it; keep it that way when you edit it.
- **Tables kept whole leave half-empty pages.** Only tables of five rows or less are kept on one page;
  longer ones may break, never leaving the header alone (`keep=N` on `:::table` to change it).
- **LibreOffice recompresses images to JPEG** and leaves a grey veil around figures: the build asks
  for lossless export. Do not remove that option.
- **Mermaid measures labels before the font loads** and cuts them: the renderer waits for the font.
- **A key figure longer than about eight characters wraps.** The writer shrinks the row's values
  together; still prefer short values (`≈ 190 $ US`, not `about 190 US dollars`).
- **A narrow ID column breaks `EXF-001` in two.** Give ID columns 12 % or more.
- **The snap LibreOffice cannot read `/tmp`** or hidden folders: build inside a normal folder of the home directory.
