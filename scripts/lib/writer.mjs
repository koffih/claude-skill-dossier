// Block tree to a designed .docx: cover, contents with page numbers, document
// information, chapters, callouts, key figures, styled tables, numbered figures.
import fs from 'fs';
import path from 'path';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, ShadingType, WidthType, TableLayoutType,
  VerticalAlign, LevelFormat, TabStopType, LeaderType, PageNumber, PageBreak,
  Bookmark, InternalHyperlink, ExternalHyperlink, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType,
} from 'docx';
import { plain } from './parse.mjs';
import { SKILL_DIR } from './browser.mjs';

const L = {
  fr: {
    summary: 'En bref', goal: 'Objectif du chapitre', toc: 'Sommaire', figure: 'Figure', table: 'Tableau',
    page: (n, t) => ['Page ', n, ' sur ', t], info: 'Informations sur le document', history: 'Historique des versions',
    client: 'Client', subject: 'Objet', version: 'Version', date: 'Date', author: 'Auteur', distribution: 'Diffusion',
    status: 'Statut', change: 'Modification', chapter: 'CHAPITRE', preparedFor: 'Préparé pour', by: 'par',
    signature: 'Signature', signName: 'Nom', signDate: 'Date', months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    lang: 'fr-CA', decimal: ',',
  },
  en: {
    summary: 'At a glance', goal: 'Chapter goal', toc: 'Contents', figure: 'Figure', table: 'Table',
    page: (n, t) => ['Page ', n, ' of ', t], info: 'Document information', history: 'Version history',
    client: 'Client', subject: 'Subject', version: 'Version', date: 'Date', author: 'Author', distribution: 'Distribution',
    status: 'Status', change: 'Change', chapter: 'CHAPTER', preparedFor: 'Prepared for', by: 'by',
    signature: 'Signature', signName: 'Name', signDate: 'Date', months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    lang: 'en-CA', decimal: '.',
  },
};

const PAPER = { letter: [12240, 15840], a4: [11906, 16838] };
const pt = n => Math.round(n * 2); // half-points
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };

export function longDate(iso, lang) {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mo, d] = m;
  const month = L[lang].months[Number(mo) - 1];
  return lang === 'fr' ? `${Number(d)} ${month} ${y}` : `${month} ${Number(d)}, ${y}`;
}

export async function writeDocx({ meta, blocks, theme, figures, cover, tocPages }) {
  const lang = (meta.lang || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';
  const T = L[lang];
  const C = theme.colors;
  const S = theme.sizes;
  const F = theme.fonts;
  const [PW, PH] = PAPER[meta.paper === 'a4' ? 'a4' : 'letter'];
  const mg = theme.layout.margins;
  const M = { top: in2(mg.top), bottom: in2(mg.bottom), left: in2(mg.left), right: in2(mg.right) };
  const CW = PW - M.left - M.right; // content width, DXA
  const CWpx = Math.round((CW / 1440) * 96);
  const numbering = meta.numbering !== false && theme.layout.numberHeadings;

  // ---------- counters and outline ----------
  let h1 = 0, h2 = 0, fig = 0, tab = 0, listInstance = 0, bm = 0;
  const outline = []; // {level, num, text, anchor}

  // ---------- inline runs ----------
  const run = (r, base = {}) => {
    const o = {
      text: r.text, bold: r.bold || base.bold, italics: r.italic || base.italic, strike: r.strike,
      font: r.code ? F.mono : base.font, size: base.size, color: base.color,
    };
    if (r.code) { o.size = pt((base.size ? base.size / 2 : S.body) - 1); o.shading = { type: ShadingType.CLEAR, fill: C.surface, color: 'auto' }; }
    if (r.chip) {
      const tone = r.chip;
      const fg = C[tone === 'muted' ? 'muted' : tone === 'accent' ? 'accentDark' : tone] || C.ink;
      const bg = C[tone === 'muted' ? 'surface' : tone === 'accent' ? 'accentSoft' : tone + 'Soft'] || C.surface;
      return new TextRun({ ...o, text: ` ${r.text} `, bold: true, font: F.heading, color: fg, shading: { type: ShadingType.CLEAR, fill: bg, color: 'auto' }, size: pt(S.table - 0.5) });
    }
    if (r.br) return new TextRun({ break: 1 });
    if (r.link) {
      return new ExternalHyperlink({ link: r.link, children: [new TextRun({ ...o, color: C.accent, underline: {} })] });
    }
    return new TextRun(o);
  };
  const runs = (inl, base) => inl.map(r => run(r, base));

  // ---------- paragraphs ----------
  const para = (inl, opts = {}) => new Paragraph({
    children: runs(inl, opts.base),
    spacing: { after: opts.after ?? 140, before: opts.before ?? 0, line: opts.line ?? 288 },
    alignment: opts.align,
    keepNext: opts.keepNext,
    indent: opts.indent,
    numbering: opts.numbering,
  });

  const caption = (label, n, text, before = 80) => new Paragraph({
    spacing: { before, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: `${label} ${n}  `, font: F.heading, size: pt(S.small), color: C.accentDark }),
      new TextRun({ text, size: pt(S.small), color: C.muted }),
    ],
  });

  // ---------- blocks ----------
  const render = (bs, ctx = {}) => bs.flatMap(b => block(b, ctx));

  function block(b, ctx) {
    switch (b.type) {
      case 'heading': return heading(b);
      case 'paragraph': return [para(b.inline, { after: ctx.tight ? 80 : 140, base: ctx.base })];
      case 'list': return list(b, 0, ctx);
      case 'table': return table(b, ctx);
      case 'figure': return figure(b);
      case 'callout': return callout(b.tone, b.title, b.blocks);
      case 'summary': return summary(b);
      case 'goal': return goal(b);
      case 'kpis': return kpis(b.items);
      case 'pagebreak': return [new Paragraph({ children: [new PageBreak()] })];
      case 'hr': return [new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.rule, space: 1 } } })];
      case 'code': return code(b);
      case 'signatures': return signatures(b.names);
      default: return [];
    }
  }

  function heading(b) {
    const text = plain(b.inline);
    const anchor = `h${++bm}`;
    if (b.level === 1) {
      h1++; h2 = 0;
      const num = numbering ? `${h1}` : '';
      outline.push({ level: 1, num, text, anchor });
      const first = h1 === 1;
      return [
        new Paragraph({
          pageBreakBefore: theme.layout.chapterNewPage ? true : (first ? true : undefined),
          spacing: { before: theme.layout.chapterNewPage ? 0 : 480, after: 60 },
          keepNext: true,
          children: [new TextRun({ text: numbering ? `${T.chapter} ${num}` : '', font: F.heading, size: pt(S.label), color: C.accent, characterSpacing: 40 })],
        }),
        new Paragraph({
          style: 'Heading1',
          keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 8 } },
          children: [new Bookmark({ id: anchor, children: [new TextRun(text)] })],
        }),
      ];
    }
    if (b.level === 2) {
      h2++;
      const num = numbering ? `${h1}.${h2}` : '';
      outline.push({ level: 2, num, text, anchor });
      return [new Paragraph({
        style: 'Heading2', keepNext: true,
        children: [new Bookmark({ id: anchor, children: [
          ...(num ? [new TextRun({ text: `${num}  `, color: C.accent })] : []), new TextRun(text)] })],
      })];
    }
    return [new Paragraph({ style: b.level === 3 ? 'Heading3' : 'Heading4', keepNext: true, children: runs(b.inline) })];
  }

  function list(b, level, ctx) {
    const out = [];
    const inst = ++listInstance;
    b.items.forEach(it => {
      const [first, ...rest] = it.blocks;
      const inl = first && first.type === 'paragraph' ? first.inline : [];
      const tail = first && first.type === 'paragraph' ? rest : it.blocks;
      if (it.task) {
        out.push(new Paragraph({
          spacing: { after: 90, line: 288 },
          indent: { left: 400 + level * 360, hanging: 400 },
          children: [new TextRun({ text: it.checked ? '☑' : '☐', font: F.symbol, color: C.accent, size: pt(S.body + 1.5) }), new TextRun({ text: '\t' }), ...runs(inl, ctx.base)],
          tabStops: [{ type: TabStopType.LEFT, position: 400 + level * 360 }],
        }));
      } else {
        out.push(new Paragraph({
          spacing: { after: 80, line: 288 },
          numbering: { reference: b.ordered ? 'ordered' : 'bullets', level: Math.min(level, 2), instance: b.ordered ? inst : undefined },
          children: runs(inl, ctx.base),
        }));
      }
      tail.forEach(k => {
        if (k.type === 'list') out.push(...list(k, level + 1, ctx));
        else if (k.type === 'paragraph') out.push(para(k.inline, { indent: { left: 400 + (level + 1) * 360 }, after: 80, base: ctx.base }));
        else out.push(...block(k, ctx));
      });
    });
    out.push(spacer(60));
    return out;
  }

  function colWidths(b, total) {
    const n = b.header.length;
    if (b.attrs.widths) {
      const ws = String(b.attrs.widths).split(',').map(Number);
      const sum = ws.reduce((a, c) => a + c, 0);
      const out = ws.map(w => Math.round((w / sum) * total));
      out[out.length - 1] += total - out.reduce((a, c) => a + c, 0);
      return out;
    }
    const len = i => Math.max(plain(b.header[i]).length, ...b.rows.map(r => plain(r[i] || []).length));
    const weights = Array.from({ length: n }, (_, i) => Math.min(Math.max(Math.sqrt(len(i)) * 10, 40), 160));
    const sum = weights.reduce((a, c) => a + c, 0);
    const out = weights.map(w => Math.round((w / sum) * total));
    out[out.length - 1] += total - out.reduce((a, c) => a + c, 0);
    return out;
  }

  function table(b, ctx) {
    const total = ctx.width || CW;
    const widths = colWidths(b, total);
    const size = pt(b.attrs.compact ? S.table - 0.5 : S.table);
    const align = i => ({ right: AlignmentType.RIGHT, center: AlignmentType.CENTER }[b.align[i]] || AlignmentType.LEFT);
    const cell = (inl, i, head, zebra, keepNext) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: head ? { type: ShadingType.CLEAR, fill: C.accentDark, color: 'auto' } : zebra ? { type: ShadingType.CLEAR, fill: C.surface, color: 'auto' } : undefined,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: NONE, left: NONE, right: NONE,
        bottom: head ? { style: BorderStyle.SINGLE, size: 4, color: C.accentDark } : { style: BorderStyle.SINGLE, size: 4, color: C.rule },
      },
      children: [new Paragraph({
        alignment: align(i), spacing: { after: 0, line: 264 }, keepNext: keepNext || undefined,
        children: runs(inl, head ? { bold: false, font: F.heading, color: 'FFFFFF', size } : { size, bold: b.attrs.firstcol && i === 0, font: b.attrs.firstcol && i === 0 ? F.heading : undefined }),
      })],
    });
    // small tables stay whole; longer ones may break, but never leave the header alone
    const keep = b.rows.length <= (b.attrs.keep !== undefined ? Number(b.attrs.keep) : 5);
    const rows = [
      new TableRow({ tableHeader: true, cantSplit: true, children: b.header.map((h, i) => cell(h, i, true, false, true)) }),
      ...b.rows.map((r, k) => new TableRow({ cantSplit: true, children: b.header.map((_, i) => cell(r[i] || [], i, false, b.attrs.zebra !== 'false' && k % 2 === 1, (keep && k < b.rows.length - 1) || (!keep && k === 0))) })),
    ];
    const out = [];
    if (b.attrs.caption) {
      tab++;
      out.push(new Paragraph({
        keepNext: true, spacing: { before: 120, after: 100 },
        children: [
          new TextRun({ text: `${T.table} ${tab}  `, font: F.heading, size: pt(S.small), color: C.accentDark }),
          new TextRun({ text: b.attrs.caption, size: pt(S.small), color: C.muted }),
        ],
      }));
    }
    out.push(new Table({
      width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
      borders: NO_BORDERS, rows,
    }));
    out.push(spacer(160));
    return out;
  }

  function figure(b) {
    const f = figures[b.src];
    if (!f) throw new Error(`Figure not rendered: ${b.src}`);
    fig++;
    const maxW = Math.round(CWpx * (b.width / 100));
    const w = Math.min(maxW, f.width * 1.0 > maxW ? maxW : Math.max(f.width, Math.round(maxW * 0.6)));
    const h = Math.round(w * (f.height / f.width));
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 40 },
        children: [new ImageRun({ type: f.type, data: fs.readFileSync(f.png), transformation: { width: w, height: h }, altText: { title: b.caption, description: b.caption, name: path.basename(b.src) } })],
      }),
      caption(T.figure, fig, b.caption),
    ];
  }

  function boxTable(children, { fill, left, leftSize = 24, top, pad = 200, width = CW }) {
    return new Table({
      width: { size: width, type: WidthType.DXA }, columnWidths: [width], layout: TableLayoutType.FIXED, borders: NO_BORDERS,
      rows: [new TableRow({ cantSplit: false, children: [new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
        margins: { top: pad - 40, bottom: pad - 80, left: pad + 40, right: pad },
        borders: {
          left: left ? { style: BorderStyle.SINGLE, size: leftSize, color: left } : NONE,
          top: top ? { style: BorderStyle.SINGLE, size: 12, color: top } : NONE, right: NONE, bottom: NONE,
        },
        children,
      })] })],
    });
  }

  function callout(tone, title, inner) {
    const fg = { accent: C.accentDark, muted: C.muted }[tone] || C[tone] || C.accentDark;
    const bar = { accent: C.accent, muted: C.rule }[tone] || C[tone] || C.accent;
    const fill = { accent: C.accentSoft, muted: C.surface }[tone] || C[tone + 'Soft'] || C.surface;
    const kids = [];
    if (title) kids.push(new Paragraph({ spacing: { after: 80 }, keepNext: true, children: [new TextRun({ text: title, font: F.heading, color: fg, size: pt(S.body + 0.5) })] }));
    kids.push(...render(inner, { tight: true, width: CW - 520 }));
    trimLast(kids);
    return [boxTable(kids, { fill, left: bar }), spacer(160)];
  }

  function summary(b) {
    const kids = [new Paragraph({
      spacing: { after: 120 }, keepNext: true,
      children: [new TextRun({ text: (b.title || T.summary).toUpperCase(), font: F.heading, color: C.accent, size: pt(S.label), characterSpacing: 40 })],
    })];
    kids.push(...render(b.blocks, { tight: true, width: CW - 560, base: { size: pt(S.body + 0.5) } }));
    trimLast(kids);
    return [boxTable(kids, { fill: C.accentSoft, left: C.accent, leftSize: 36, pad: 260 }), spacer(200)];
  }

  function goal(b) {
    const kids = [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: (b.title || T.goal).toUpperCase(), font: F.heading, color: C.accent, size: pt(S.label - 0.5), characterSpacing: 30 })] })];
    kids.push(...render(b.blocks, { tight: true, width: CW - 400, base: { color: C.muted } }));
    trimLast(kids);
    return [boxTable(kids, { left: C.accent, leftSize: 12, pad: 120 }), spacer(180)];
  }

  function kpis(items) {
    const out = [];
    const perRow = items.length === 4 ? 4 : Math.min(3, items.length);
    for (let i = 0; i < items.length; i += perRow) {
      const chunk = items.slice(i, i + perRow);
      const gap = 180;
      const tile = Math.floor((CW - gap * (perRow - 1)) / perRow);
      // the value must hold on one line: shrink the row's figures together if one is long
      const longest = Math.max(...chunk.map(it => (it.value || '').length));
      const fit = Math.floor(((tile - 320) / 20) / (longest * 0.6));
      const vsize = Math.max(12, Math.min(S.kpi, fit));
      const widths = [];
      chunk.forEach((_, k) => { if (k) widths.push(gap); widths.push(tile); });
      while (widths.length < perRow * 2 - 1) { widths.push(gap, tile); }
      const cells = [];
      for (let k = 0; k < perRow; k++) {
        if (k) cells.push(new TableCell({ width: { size: gap, type: WidthType.DXA }, borders: { top: NONE, bottom: NONE, left: NONE, right: NONE }, children: [new Paragraph({ children: [] })] }));
        const it = chunk[k];
        cells.push(new TableCell({
          width: { size: tile, type: WidthType.DXA },
          shading: it ? { type: ShadingType.CLEAR, fill: C.surface, color: 'auto' } : undefined,
          margins: { top: 140, bottom: 140, left: 180, right: 140 },
          borders: { top: it ? { style: BorderStyle.SINGLE, size: 18, color: C.accent } : NONE, bottom: NONE, left: NONE, right: NONE },
          children: it ? [
            new Paragraph({ spacing: { after: 40, line: 240 }, children: [new TextRun({ text: it.value, font: F.heading, size: pt(vsize), color: C.accentDark })] }),
            new Paragraph({ spacing: { after: it.note ? 30 : 0, line: 252 }, children: [new TextRun({ text: it.label, font: F.heading, size: pt(S.small + 0.5), color: C.ink })] }),
            ...(it.note ? [new Paragraph({ spacing: { after: 0, line: 252 }, children: [new TextRun({ text: it.note, size: pt(S.small), color: C.muted })] })] : []),
          ] : [new Paragraph({ children: [] })],
        }));
      }
      out.push(new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: widths.slice(0, cells.length), layout: TableLayoutType.FIXED, borders: NO_BORDERS,
        rows: [new TableRow({ cantSplit: true, children: cells })],
      }));
      out.push(spacer(140));
    }
    return out;
  }

  function code(b) {
    return [boxTable(b.text.split('\n').map(line => new Paragraph({ spacing: { after: 0, line: 252 }, children: [new TextRun({ text: line || ' ', font: F.mono, size: pt(S.small) })] })), { fill: C.surface, pad: 140 }),
      spacer(160)];
  }

  function signatures(names) {
    const w = Math.floor(CW / names.length);
    const cells = names.map(n => new TableCell({
      width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 0, right: 300 }, borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
      children: [
        new Paragraph({ spacing: { after: 700 }, children: [new TextRun({ text: n, font: F.heading })] }),
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.ink, space: 4 } }, spacing: { after: 40 }, children: [new TextRun({ text: T.signature, size: pt(S.small), color: C.muted })] }),
        new Paragraph({ spacing: { before: 300 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.ink, space: 4 } }, children: [new TextRun({ text: T.signDate, size: pt(S.small), color: C.muted })] }),
      ],
    }));
    return [new Table({ width: { size: w * names.length, type: WidthType.DXA }, columnWidths: names.map(() => w), layout: TableLayoutType.FIXED, borders: NO_BORDERS, rows: [new TableRow({ cantSplit: true, children: cells })] })];
  }

  function trimLast(kids) {
    // the box's own padding replaces the trailing spacer of its last block
    while (kids.length && kids[kids.length - 1] instanceof Paragraph && kids[kids.length - 1].__empty) kids.pop();
    // Word requires a table cell to end with a paragraph
    if (!(kids[kids.length - 1] instanceof Paragraph)) kids.push(new Paragraph({ spacing: { after: 0, line: 120 }, children: [] }));
  }

  // ---------- body first (fills the outline) ----------
  const body = render(blocks);

  // ---------- cover ----------
  const coverKids = [];
  coverKids.push(new Paragraph({
    spacing: { after: 0 },
    children: [new ImageRun({
      type: 'png', data: fs.readFileSync(cover.png),
      transformation: { width: Math.round((PW / 1440) * 96), height: Math.round((PH / 1440) * 96) },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
        behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE },
      },
      altText: { title: 'cover', description: 'cover art', name: 'cover' },
    })],
  }));
  if (meta.logo) {
    const logoPath = path.resolve(meta.__dir, meta.logo);
    const ext = path.extname(logoPath).slice(1).toLowerCase() === 'png' ? 'png' : 'jpg';
    coverKids.push(new Paragraph({ children: [new ImageRun({
      type: ext, data: fs.readFileSync(logoPath), transformation: { width: meta.logoWidth || 130, height: meta.logoHeight || 46 },
      floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: in2(mg.left) * 635 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0.7 * 914400 }, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
      altText: { title: 'logo', description: 'logo', name: 'logo' },
    })] }));
  }
  const bandTw = Math.round(PH * (theme.layout.coverBand || 0.36));
  const firstLine = bandTw - M.top + 620;
  coverKids.push(new Paragraph({
    spacing: { before: firstLine, after: 160 },
    children: [new TextRun({ text: (meta.kind || '').toUpperCase(), font: F.heading, size: pt(S.label + 1), color: C.accent, characterSpacing: 50 })],
  }));
  coverKids.push(new Paragraph({ spacing: { after: 220, line: 240 }, children: [new TextRun({ text: meta.title, font: F.heading, size: pt(S.title), color: C.ink })] }));
  if (meta.subtitle) coverKids.push(new Paragraph({ spacing: { after: 480, line: 300 }, children: [new TextRun({ text: meta.subtitle, size: pt(S.subtitle), color: C.muted })] }));
  if (meta.client) {
    coverKids.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: T.preparedFor.toUpperCase(), font: F.heading, size: pt(S.label), color: C.faint, characterSpacing: 30 })] }));
    coverKids.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: meta.client, font: F.heading, size: pt(S.h2), color: C.ink })] }));
  }
  const metaCells = [
    [T.version, String(meta.version || '1.0')],
    [T.date, longDate(meta.date, lang)],
    [T.author, meta.author || ''],
    [T.distribution, meta.confidential || ''],
  ].filter(([, v]) => v);
  const mw = Math.floor(CW / metaCells.length);
  coverKids.push(new Paragraph({ spacing: { before: meta.subtitle ? 1500 : 2200 }, children: [] }));
  coverKids.push(new Table({
    width: { size: mw * metaCells.length, type: WidthType.DXA }, columnWidths: metaCells.map(() => mw), layout: TableLayoutType.FIXED, borders: NO_BORDERS,
    rows: [new TableRow({ children: metaCells.map(([k, v]) => new TableCell({
      width: { size: mw, type: WidthType.DXA }, margins: { top: 100, bottom: 0, left: 0, right: 200 },
      borders: { top: { style: BorderStyle.SINGLE, size: 6, color: C.rule }, bottom: NONE, left: NONE, right: NONE },
      children: [
        new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: k.toUpperCase(), font: F.heading, size: pt(S.label - 0.5), color: C.faint, characterSpacing: 20 })] }),
        new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: v, size: pt(S.small + 1), color: C.ink })] }),
      ],
    })) })],
  }));

  // ---------- contents + document information ----------
  const front = [];
  front.push(new Paragraph({ style: 'TocTitle', children: [new TextRun(T.toc)] }));
  outline.forEach(o => {
    const pageNo = tocPages && tocPages[o.anchor] ? String(tocPages[o.anchor]) : '0';
    const isH1 = o.level === 1;
    front.push(new Paragraph({
      spacing: { before: isH1 ? 110 : 20, after: 20 },
      indent: { left: isH1 ? 0 : 560 },
      tabStops: [{ type: TabStopType.LEFT, position: isH1 ? 560 : 1220 }, { type: TabStopType.RIGHT, position: CW, leader: LeaderType.DOT }],
      children: [new InternalHyperlink({ anchor: o.anchor, children: [
        new TextRun({ text: o.num, font: F.heading, color: C.accent, size: pt(isH1 ? S.body + 0.5 : S.body - 0.5) }),
        new TextRun({ text: `\t${o.text}`, font: isH1 ? F.heading : undefined, color: isH1 ? C.ink : C.muted, size: pt(isH1 ? S.body + 0.5 : S.body - 0.5) }),
        new TextRun({ text: `\t${pageNo}`, font: F.heading, color: isH1 ? C.ink : C.muted, size: pt(isH1 ? S.body + 0.5 : S.body - 0.5) }),
      ] })],
    }));
  });
  front.push(spacer(240));

  const infoRows = [
    [T.client, meta.client], [T.subject, meta.subject || meta.subtitle || meta.title], [T.version, String(meta.version || '1.0')],
    [T.date, longDate(meta.date, lang)], [T.author, meta.author], [T.distribution, meta.confidential], [T.status, meta.status],
  ].filter(([, v]) => v);
  front.push(new Paragraph({ style: 'FrontTitle', keepNext: true, children: [new TextRun(T.info)] }));
  front.push(kvTable(infoRows));
  if (Array.isArray(meta.history) && meta.history.length) {
    front.push(spacer(120));
    front.push(new Paragraph({ style: 'FrontTitle', keepNext: true, children: [new TextRun(T.history)] }));
    front.push(...table({
      header: [[{ text: T.version }], [{ text: T.date }], [{ text: T.author }], [{ text: T.change }]], align: [],
      rows: meta.history.map(h => [[{ text: String(h.version) }], [{ text: longDate(h.date, lang) }], [{ text: h.author || '' }], [{ text: h.change || '' }]]),
      attrs: { widths: '9,19,32,40', compact: true },
    }, {}));
  }

  function kvTable(rows) {
    const w1 = Math.round(CW * 0.26), w2 = CW - w1;
    return new Table({
      width: { size: CW, type: WidthType.DXA }, columnWidths: [w1, w2], layout: TableLayoutType.FIXED, borders: NO_BORDERS,
      rows: rows.map(([k, v]) => new TableRow({ cantSplit: true, children: [
        new TableCell({ width: { size: w1, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 0, right: 120 }, borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule } },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: k, font: F.heading, size: pt(S.small + 0.5), color: C.muted })] })] }),
        new TableCell({ width: { size: w2, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 120, right: 0 }, borders: { top: NONE, left: NONE, right: NONE, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule } },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: String(v), size: pt(S.small + 0.5) })] })] }),
      ] })),
    });
  }

  // the chapter that follows opens its own page: a trailing spacer would spill onto an empty one
  while (front.length && front[front.length - 1].__empty) front.pop();

  // ---------- header and footer ----------
  const small = { size: pt(S.small - 0.5), color: C.faint };
  const header = new Header({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule, space: 6 } },
    children: [new TextRun({ text: meta.short || meta.title, font: F.heading, ...small, color: C.muted }), new TextRun({ text: `\t${meta.client || ''}`, ...small })],
  })] });
  const footer = new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    children: [new TextRun({ text: meta.confidential || '', ...small }), new TextRun({ ...small, children: ['\t', ...T.page(PageNumber.CURRENT, PageNumber.TOTAL_PAGES)] })],
  })] });

  // ---------- document ----------
  const fontData = f => fs.readFileSync(path.join(SKILL_DIR, 'assets/fonts', f));
  const embedded = (theme.embed || []).map(e => ({
    name: e.name, data: fontData(e.regular),
    ...(e.bold ? { bold: fontData(e.bold) } : {}), ...(e.italic ? { italic: fontData(e.italic) } : {}), ...(e.boldItalic ? { boldItalic: fontData(e.boldItalic) } : {}),
  }));
  const pageProps = { page: { size: { width: PW, height: PH }, margin: { ...M, header: in2(0.45), footer: in2(0.4) } } };

  const doc = new Document({
    creator: meta.author || '', title: meta.title, subject: meta.subtitle || '', description: meta.subtitle || '',
    fonts: meta.embedFonts === false ? undefined : embedded,
    styles: {
      default: {
        document: { run: { font: F.body, size: pt(S.body), color: C.ink, language: { value: T.lang } }, paragraph: { spacing: { line: 288, after: 140 } } },
      },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: F.heading, size: pt(S.h1), color: C.ink }, paragraph: { spacing: { after: 320, line: 252 }, outlineLevel: 0, keepNext: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: F.heading, size: pt(S.h2), color: C.ink }, paragraph: { spacing: { before: 380, after: 140, line: 264 }, outlineLevel: 1, keepNext: true } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: F.heading, size: pt(S.h3), color: C.accentDark }, paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 2, keepNext: true } },
        { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal',
          run: { font: F.heading, size: pt(S.body), color: C.ink }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true } },
        { id: 'TocTitle', name: 'Contents Title', basedOn: 'Normal', run: { font: F.heading, size: pt(S.h1 - 4), color: C.ink }, paragraph: { spacing: { after: 240 } } },
        { id: 'FrontTitle', name: 'Front Title', basedOn: 'Normal', run: { font: F.heading, size: pt(S.h3), color: C.accentDark }, paragraph: { spacing: { before: 120, after: 120 } } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '■', alignment: AlignmentType.LEFT, style: { run: { color: C.accent, size: pt(S.body - 4) }, paragraph: { indent: { left: 400, hanging: 300 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { color: C.muted }, paragraph: { indent: { left: 760, hanging: 300 } } } },
          { level: 2, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { run: { color: C.faint }, paragraph: { indent: { left: 1120, hanging: 300 } } } },
        ] },
        { reference: 'ordered', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { run: { color: C.accent, font: F.heading }, paragraph: { indent: { left: 400, hanging: 400 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: AlignmentType.LEFT, style: { run: { color: C.muted }, paragraph: { indent: { left: 800, hanging: 360 } } } },
          { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.', alignment: AlignmentType.LEFT, style: { run: { color: C.muted }, paragraph: { indent: { left: 1160, hanging: 360 } } } },
        ] },
      ],
    },
    sections: [
      { properties: { ...pageProps }, children: coverKids },
      { properties: { ...pageProps }, headers: { default: header }, footers: { default: footer }, children: [...front, ...body] },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  return { buffer: buf, outline, counts: { chapters: h1, figures: fig, tables: tab } };
}

function spacer(after) {
  const p = new Paragraph({ spacing: { after }, children: [] });
  p.__empty = true;
  return p;
}

function in2(x) { return Math.round(x * 1440); }
