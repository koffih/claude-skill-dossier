#!/usr/bin/env node
// Floor checks on a dossier source: what a machine can decide before anyone reads it.
// Errors block the build; warnings are read and either fixed or knowingly kept.
//
//   node check.mjs <source.md>
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSource, plain } from './lib/parse.mjs';

const FILLER = {
  fr: ['ce document présente', 'ce document a pour objectif', 'il est important de noter', 'il convient de noter', 'il est à noter',
    'dans le cadre de', 'en termes de', 'au niveau de', 'force est de constater', 'n\'hésitez pas', 'afin de garantir une',
    'solution robuste', 'de manière significative', 'tirer parti', 'à l\'ère du numérique', 'véritable', 'incontournable',
    'en conclusion', 'pour conclure', 'comme mentionné précédemment', 'il va sans dire'],
  en: ['this document outlines', 'this document presents', 'it is important to note', 'it is worth noting', 'in order to ensure',
    'robust solution', 'leverage', 'seamless', 'cutting-edge', 'state-of-the-art', 'in today\'s', 'game-changer', 'delve',
    'in conclusion', 'as mentioned earlier', 'needless to say', 'holistic', 'synergy'],
};
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b|à compléter|\?\?\?|\[\.\.\.\]/i;

export function lint(meta, blocks, dir) {
  const errors = [];
  const warnings = [];
  const lang = (meta.lang || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';

  for (const k of ['title', 'date', 'author']) if (!meta[k]) errors.push(`front matter: "${k}" is missing`);
  for (const k of ['client', 'kind', 'version', 'confidential']) if (!meta[k]) warnings.push(`front matter: "${k}" is empty (cover and document information stay thin)`);
  if (meta.title && meta.title.length > 70) warnings.push('title over 70 characters: move the detail to the subtitle');

  // chapters and what they carry
  const chapters = [];
  let cur = null;
  const visit = (bs, top) => bs.forEach(b => {
    if (top && b.type === 'heading' && b.level === 1) { cur = { title: plain(b.inline), blocks: [], first: null }; chapters.push(cur); return; }
    if (top && cur) { cur.blocks.push(b); if (!cur.first) cur.first = b; }
  });
  visit(blocks, true);

  if (!chapters.length) errors.push('no chapter: the document needs "# " headings');
  if (!blocks.some(b => b.type === 'summary')) warnings.push('no :::summary block: open the first chapter with the answer, the numbers and what is expected of the reader');

  const exhibits = new Set(['figure', 'table', 'kpis']);
  const deep = (bs, pred) => bs.some(b => pred(b) || (b.blocks && deep(b.blocks, pred)) || (b.items && b.items.some(it => deep(it.blocks || [], pred))));
  chapters.forEach((c, i) => {
    if (!deep(c.blocks, b => exhibits.has(b.type))) warnings.push(`chapter ${i + 1} "${c.title}": no figure, table or key figures`);
    if (c.first && c.first.type === 'heading') warnings.push(`chapter ${i + 1} "${c.title}": opens on a subheading; open with the point of the chapter`);
    const words = countWords(c.blocks);
    if (words > 1400) warnings.push(`chapter ${i + 1} "${c.title}": ${words} words; split it or move detail to an appendix`);
  });

  // text quality
  const texts = [];
  const gather = (bs, where) => bs.forEach(b => {
    if (b.type === 'paragraph') texts.push({ text: plain(b.inline), where, kind: 'p' });
    if (b.type === 'heading') texts.push({ text: plain(b.inline), where, kind: 'h' });
    if (b.type === 'list') {
      if (b.items.length > 9) warnings.push(`${where}: a list of ${b.items.length} items; group it or make it a table`);
      b.items.forEach(it => gather(it.blocks || [], where));
    }
    if (b.type === 'table') {
      if (b.header.length > 6) warnings.push(`${where}: table with ${b.header.length} columns; over 6 does not fit a portrait page`);
      [b.header, ...b.rows].forEach(r => r.forEach(c => texts.push({ text: plain(c), where, kind: 'cell' })));
      b.rows.forEach(r => { if (r.length !== b.header.length) warnings.push(`${where}: a table row has ${r.length} cells for ${b.header.length} columns`); });
    }
    if (b.type === 'figure') {
      if (!b.src) errors.push(`${where}: figure without src`);
      else if (!fs.existsSync(path.resolve(dir, b.src))) errors.push(`${where}: figure file not found: ${b.src}`);
      if (!b.caption || b.caption.split(/\s+/).length < 3) errors.push(`${where}: figure "${b.src}" needs a caption that says what it shows`);
    }
    if (b.type === 'kpis') b.items.forEach(k => {
      if ((k.value || '').length > 14) warnings.push(`${where}: key figure "${k.value}" is long; a tile holds a number, not a sentence`);
      if (!k.label) errors.push(`${where}: key figure "${k.value}" has no label`);
    });
    if (b.blocks) gather(b.blocks, where);
  });
  let where = 'before chapter 1';
  blocks.forEach(b => {
    if (b.type === 'heading' && b.level === 1) where = `chapter "${plain(b.inline)}"`;
    gather([b], where);
  });

  const allowDashes = meta.allowDashes === true;
  for (const t of texts) {
    const low = t.text.toLowerCase();
    if (PLACEHOLDER.test(t.text)) errors.push(`${t.where}: placeholder left in "${clip(t.text)}"`);
    for (const f of FILLER[lang]) if (low.includes(f)) warnings.push(`${t.where}: filler "${f}" in "${clip(t.text)}"`);
    if (!allowDashes && /[—–]/.test(t.text)) warnings.push(`${t.where}: long dash in "${clip(t.text)}"; use a colon, a comma or parentheses`);
    if (t.kind === 'p') {
      const w = t.text.split(/\s+/).filter(Boolean).length;
      if (w > 110) warnings.push(`${t.where}: paragraph of ${w} words; cut it, one idea per paragraph`);
      for (const s of t.text.split(/(?<=[.!?])\s+/)) {
        const sw = s.split(/\s+/).filter(Boolean).length;
        if (sw > 38) warnings.push(`${t.where}: sentence of ${sw} words: "${clip(s)}"`);
      }
    }
    if (t.kind === 'cell' && t.text.split(/\s+/).length > 45) warnings.push(`${t.where}: table cell of ${t.text.split(/\s+/).length} words; a cell is not a paragraph`);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

function countWords(bs) {
  let n = 0;
  const walk = x => x.forEach(b => {
    if (b.inline) n += plain(b.inline).split(/\s+/).length;
    if (b.rows) b.rows.forEach(r => r.forEach(c => { n += plain(c).split(/\s+/).length; }));
    if (b.blocks) walk(b.blocks);
    if (b.items) b.items.forEach(it => walk(it.blocks || []));
  });
  walk(bs);
  return n;
}
function clip(s) { return s.length > 70 ? s.slice(0, 67) + '...' : s; }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('usage: check.mjs <source.md>'); process.exit(2); }
  const { meta, blocks } = parseSource(fs.readFileSync(file, 'utf8'));
  const r = lint(meta, blocks, path.dirname(path.resolve(file)));
  r.warnings.forEach(w => console.log(`warn   ${w}`));
  r.errors.forEach(e => console.log(`ERROR  ${e}`));
  console.log(`${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  process.exit(r.errors.length ? 1 : 0);
}
