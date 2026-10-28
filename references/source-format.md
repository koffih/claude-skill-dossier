# Source format

One Markdown file per language. GitHub-flavoured Markdown, plus a YAML front matter and `:::`
blocks. Everything not listed here is plain Markdown and renders as you expect (bold, italic, links,
inline code, bullet and numbered lists up to three levels, `- [ ]` task lists, tables, block quotes,
code blocks, `---` rules).

## Front matter

| Key | Use | Example |
|---|---|---|
| `title` | Cover title, short (under 70 characters) | `Booking service` |
| `kind` | Small label above the title | `Status report and roadmap` |
| `subtitle` | One sentence under the title: what the reader gets | |
| `short` | Running header on every page (defaults to the title) | `Booking service · Roadmap` |
| `client` | "Prepared for" on the cover, right side of the header | `Northwind Studio` |
| `author` | Author or firm | |
| `date` | ISO date, printed in the document's language | `2026-10-27` |
| `version` | Quote it: `"1.0"` | |
| `status` | Document information table | `For decision` |
| `confidential` | Footer and cover | `Confidential` |
| `lang` | `fr` or `en`: labels, dates, chapter word, spelling language | `en` |
| `paper` | `letter` (default) or `a4` | |
| `theme` | `sobre`, `chaleur`, `institution`, or a path to a theme JSON | |
| `brand` | Colour overrides: `{ accent: "#C8102E", accentDark: "#3A0A12", accentSoft: "#FBEAEC" }` | |
| `logo` | Path to a PNG or JPG, placed on the cover band (`logoWidth`, `logoHeight` in px) | |
| `file` | Output file name without extension | `booking-roadmap-en` |
| `history` | List of `{ version, date, author, change }` for the version table | |
| `numbering` | `false` to drop chapter and section numbers | |
| `allowDashes` | `true` to silence the long-dash warning | |
| `embedFonts` | `false` to not embed the fonts in the Word file (smaller file) | |

## Headings

- `#` is a chapter: new page, "CHAPTER n" label, large title, accent rule. Numbered, listed in the contents.
- `##` is a section: numbered `n.m`, listed in the contents.
- `###` and `####` are not numbered and not in the contents.

## Blocks

| Block | Renders as | Notes |
|---|---|---|
| `:::summary{title="..."}` | Large tinted box with a bold left bar, label "At a glance" / "En bref" | Once, in the first chapter. Do not give the chapter the same title as the box label. |
| `:::goal` | Thin-barred note "Chapter goal" under a chapter title | One sentence: what the chapter establishes |
| `:::kpis` | Row of key-figure tiles | One per line: `value \| label \| note`. 3 or 4 per row. Values short. |
| `:::callout{tone="info" title="..."}` | Tinted box with a coloured left bar | tones: `info`, `good`, `warn`, `bad`, `accent`, `muted` |
| `:::note`, `:::decision`, `:::warning`, `:::success` | Shortcuts for callout tones info, accent, warn, good | |
| `:::table{caption="..." widths="20,50,30" firstcol compact zebra=false keep=5}` | Wraps one Markdown table | `caption` numbers it ("Table 3"); `widths` in relative units; `firstcol` sets the first column in the heading font; `compact` one size smaller; `keep` = longest table kept on one page |
| `![Caption](figures/x.svg "width=80")` | Centred figure, numbered caption below | `width` in % of the text width. Also `:::figure{src="..." caption="..." width="80"}` |
| `:::signatures` | Signature blocks, one per line of names | For proposals and specifications |
| `:::pagebreak` or a line `\pagebreak` | Page break | Rarely needed: chapters break by themselves |
| `> quote` | Muted callout | |

Blocks can nest: a table or a figure inside a callout works.

## Inline status chips

`{{good:Done}}`, `{{warn:To confirm}}`, `{{bad:Blocking}}`, `{{info:Next}}`, `{{accent:New}}`,
`{{muted:Later}}`. A small tinted label, made for status and priority columns. Use the same words
for the same state across the whole document.

## Figures

Paths are relative to the source file. Types: `.svg`, `.mmd` (Mermaid), `.chart.json` (ECharts
option, optional `width` and `height` in px at the top level, the option under `option`), `.html`,
`.png`, `.jpg`. See `figures.md`.
