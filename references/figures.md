# Figures

A figure earns its place when its shape carries the point: things tied to each other, an order, a
branch, a change over time, parts of a whole. A list of items with attributes is a table, not a
figure. Every major chapter has one exhibit; a figure is the strongest when the content has a shape.

## Which exhibit for which content

| Content | Exhibit | File |
|---|---|---|
| Parts of a system and what talks to what | Architecture diagram: external actors on top, the system as a container, its parts inside, shared foundation at the bottom | `.svg` |
| Steps with a decision or a loop | Flow: boxes, one diamond per decision, labelled branches | `.svg` or `.mmd` |
| Steps in a straight line, with a state each | Roadmap bands: done (good colour), in progress (accent), to come (neutral); a gate diamond under the step that unlocks the rest | `.svg` |
| Who talks to whom in time | Sequence diagram | `.mmd` |
| States and transitions | State diagram | `.mmd` |
| Entities and relations | ER diagram | `.mmd` |
| Dated milestones | Timeline to scale, or a Gantt from rows | `.chart.json` or `.mmd` (`gantt`) |
| A quantity over time, items compared, parts of a whole | Chart: line, bars, stacked bars only when parts sum to a whole | `.chart.json` |
| Items placed on two axes (impact and effort, risk and value) | 2x2 matrix with named quadrants | `.svg` |
| Three or four headline numbers | Key-figure tiles (`:::kpis`), not a chart | source |
| Five values or fewer, no time axis | A table, not a chart | source |

## Hand-drawn SVG: the norms

- `viewBox="0 0 760 H"` with `width="760" height="H"`. It is scaled to the text width (about 640 px
  on Letter), so a 13 px label prints at about 11 px. **Minimum 11.5 px**, names 13 to 15 px,
  weight 600 for names.
- Colours only through the theme variables, so a theme or brand change recolours every figure:
  `var(--ink)` text, `var(--muted)` secondary text, connectors and arrowheads, `var(--faint)` box
  borders, `var(--rule)` quiet lines, `var(--surface)` container fill, `var(--paper)` box fill,
  `var(--accent)` and `var(--accent-soft)` the one highlighted thing, `var(--accent-dark)` a strong
  band with white text, `var(--good)`, `var(--warn)`, `var(--bad)` and their `-soft` fills for
  states. Text in SVG gets the document font automatically.
- **One highlight per figure.** Emphasis works by contrast: one accented box among neutral ones is
  found at once; four are not. Say in the caption what the highlight means.
- Boxes `rx="10"`, stroke 1.3 to 1.4, the highlighted one 2.2. Connectors 1.4 with one arrowhead
  marker defined in `<defs>`.
- **Svg does not wrap.** Break lines yourself. A 13 px semibold name needs about 7.5 px per
  character: a 160 px box holds about 18 characters of name, 22 of an 11.5 px line. Count before you
  build; a word on the border is the most common defect.
- Edge labels sit beside their line with a clear gap, never on it; when the gap between two boxes is
  narrower than the label, move the boxes apart.
- No title inside the figure: the caption below carries it, numbered.
- One file per language (`archi-fr.svg`, `archi-en.svg`).

## Mermaid (`.mmd`)

Rendered with the theme's colours and font. Good for flows of up to about ten nodes, sequences,
states, ER diagrams, Gantt. Keep labels short; Mermaid lays out by itself, so check the render: wide
flows print small (`flowchart TB` instead of `LR` when it gets too wide, or `"width=80"` on the
image).

## Charts (`.chart.json`)

An ECharts option, rendered in SVG then rasterised at 3x:

```json
{
  "width": 720, "height": 340,
  "option": {
    "xAxis": { "type": "category", "data": ["Jan", "Feb", "Mar"] },
    "yAxis": { "type": "value", "name": "Bookings" },
    "series": [{ "name": "2026", "type": "bar", "data": [42, 51, 66] }]
  }
}
```

The theme sets the palette (accent first), the font and the grid. Rules: one message per chart and
the caption says it ("Saturday carries twice the bookings of a weekday"); label units on the axis;
no 3D, no pie with more than four slices, no dual axis unless the two series share a meaning; start
bar axes at zero.

## Captions

The caption states the finding, not the topic: "Every paid purchase becomes a ledger entry, with no
manual entry", not "Payment process". If a colour carries meaning, the caption says it ("In orange,
the only case that goes back to the front desk"). The checker refuses a figure without a caption of
at least three words.

## Look at the render

Every figure is saved to `out/figures/<name>.png`: open it before looking at the page. Check cut
words, labels on lines, arrows through text, and whether it reads at the printed size.
