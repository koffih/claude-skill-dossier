# Design: themes, brand, layout

The layout is fixed on purpose: a client should recognise a well-made document, not admire an
experiment. What changes from one document to the next is the theme, the brand colours and the logo.

## What every document gets

- **Cover**: a dark band with quiet concentric arcs, a short accent rule, the kind in small capitals,
  the title, the subtitle, "Prepared for", and a row of version, date, author, distribution.
- **Contents** with real page numbers (two-pass build) and links to each heading, then the
  **document information** table and the **version history**.
- **Chapters** open on a new page with "CHAPTER n", a large title and a thin accent rule. Sections
  are numbered `n.m`.
- **Running header** (short title, client) and **footer** (distribution, "Page n of N").
- Body in IBM Plex Sans 10.5 pt at 1.2 line spacing; headings in Plex SemiBold. The fonts are
  embedded in the Word file, so the client's Word shows them even if not installed.
- Tables: dark header row, light zebra rows, horizontal rules only, header repeated on each page.

## Themes

| Theme | Colours | Fits |
|---|---|---|
| `sobre` (default) | Graphite and steel blue | Consulting, audits, specifications, IT |
| `chaleur` | Deep plum and warm coral | Culture, dance, hospitality, events, retail, wellness |
| `institution` | Navy and teal | Public bodies, finance, legal, health, boards |

A theme is a JSON file in `themes/`: `colors` (hex without `#`), `fonts`, `sizes` (pt), `layout`
(`chapterNewPage`, `numberHeadings`, `coverBand` as a share of the page height, `margins` in inches),
`embed` (font files from `assets/fonts`). A project theme can extend a built-in one:

```json
{ "extends": "sobre", "colors": { "accent": "C8102E", "accentDark": "3A0A12", "accentSoft": "FBEAEC" } }
```

For a one-off brand, `brand:` in the front matter overrides the colours without a file.

## Choosing brand colours

- `accentDark` carries the cover band and table headers with white text: contrast with white must
  be at least 7:1 (use a near-black version of the brand colour).
- `accent` carries labels, numbers and rules on white: at least 4.5:1 against white.
- `accentSoft` is a tint for boxes behind ink text: very light (L above 94 %).
- Status colours (`good`, `warn`, `bad`, `info`) keep their meaning across brands; do not recolour
  them to the brand.

## House brands

A house brand applies a firm's identity to every document it signs, without touching the source:
logo on the cover band and in the running header, a coloured band at the top edge of each page, the
firm's fonts embedded in the Word file, its colours, its footer line and its author line.

```
~/.config/dossier/
  config.json                 { "defaultBrand": "acme" }      (optional)
  brands/acme/
    brand.json
    logo.png                  dark logo, transparent, for white backgrounds
    logo-on-dark.png          white version for the cover band
    fonts/*.ttf               full foundry files, with their licence
```

```json
{
  "name": "acme",
  "legalName": "Acme Inc.",
  "theme": "institution",
  "author": "Jane Doe, Acme Inc.",
  "footer": "Acme Inc.  ·  acme.example",
  "logo": "logo.png",
  "logoOnDark": "logo-on-dark.png",
  "logoHeight": 34,
  "topBar": [{ "color": "0A182F", "share": 85 }, { "color": "048D7C", "share": 15 }],
  "colors": { "ink": "0A182F", "accent": "037566", "accentDark": "0A182F", "accentSoft": "E6F4F2" },
  "fonts": { "body": "Acme Sans", "heading": "Acme Sans SemiBold" },
  "embed": [
    { "name": "Acme Sans", "regular": "AcmeSans-Regular.ttf", "bold": "AcmeSans-Bold.ttf", "italic": "AcmeSans-Italic.ttf", "boldItalic": "AcmeSans-BoldItalic.ttf" },
    { "name": "Acme Sans SemiBold", "regular": "AcmeSans-SemiBold.ttf" }
  ]
}
```

- `theme` is the base the brand colours go over; `--theme` or `theme:` in the source still win for
  the base, the brand colours always apply on top.
- `author` and `confidential` fill the front matter only where the source leaves them empty.
- `fonts` names must be the family names inside the files (`fc-scan`); `embed` paths are relative to
  `fonts/`. The build copies them into the user's font folder, because LibreOffice draws the PDF with
  installed fonts, not embedded ones.
- Which brand applies: `--brand`, then `brand:` in the source (`none` for no brand), then
  `defaultBrand`, else none.

Building one from a firm's invoices or website: take the logo file, the two or three colours that
recur, and the typeface. Check text colours for 4.5:1 on white; keep the exact colour for the band.

## When to break the defaults

- Short memo (under 5 pages): `chapterNewPage: false` in a project theme, so chapters follow on.
- No numbering for a letter-like document: `numbering: false`.
- A4 for Europe and Africa, Letter for North America (`paper:`).
- A client template is imposed: this skill is the wrong tool; fill their `.dotx` with the `docx` skill.
