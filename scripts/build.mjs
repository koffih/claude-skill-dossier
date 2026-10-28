#!/usr/bin/env node
// dossier build: Markdown source -> designed .docx + .pdf + page images for review.
//
//   node build.mjs <source.md> [--out DIR] [--theme NAME|FILE.json] [--brand NAME|none] [--no-pdf] [--force]
//
// --brand applies a house brand (logo, colours, fonts, footer) from ~/.config/dossier/brands;
// without it the front matter `brand:` or the default of ~/.config/dossier/config.json decides.
//
// Two passes: the first PDF tells on which page each heading lands, the second
// writes those numbers into the contents. Exit code 1 on a blocking check.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { parseSource } from './lib/parse.mjs';
import { writeDocx } from './lib/writer.mjs';
import { renderFigure, renderCover, renderBar, contactSheet, closeBrowser, SKILL_DIR } from './lib/browser.mjs';
import { brandName, loadBrand, brandTheme, installBrandFonts } from './lib/brand.mjs';
import { lint } from './check.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const flag = k => args.includes(k);
const src = args.find(a => !a.startsWith('--') && ![opt('--out'), opt('--theme'), opt('--brand')].includes(a));
if (!src) { console.error('usage: build.mjs <source.md> [--out DIR] [--theme NAME|FILE] [--brand NAME|none] [--no-pdf] [--force]'); process.exit(2); }

const srcPath = path.resolve(src);
const srcDir = path.dirname(srcPath);
const { meta, blocks } = parseSource(fs.readFileSync(srcPath, 'utf8'));
meta.__dir = srcDir;
const lang = (meta.lang || 'fr').slice(0, 2);

const brand = loadBrand(brandName(opt('--brand'), meta));
if (brand) {
  // the brand signs the document unless the source names someone else
  for (const k of ['author', 'confidential']) if (!meta[k] && brand[k]) meta[k] = brand[k];
  installBrandFonts(brand);
  console.log(`  brand  ${brand.name}`);
} else console.log('  brand  none');
meta.__brand = brand;
const theme = loadTheme(opt('--theme') || meta.theme || (brand && brand.theme) || 'sobre');
const outDir = path.resolve(opt('--out') || path.join(srcDir, 'out'));
fs.mkdirSync(path.join(outDir, 'figures'), { recursive: true });
const slug = meta.file || slugify(`${meta.title}-${lang}`);

// 1. checks on the source
const report = lint(meta, blocks, srcDir);
report.warnings.forEach(w => console.log(`  warn   ${w}`));
report.errors.forEach(e => console.log(`  ERROR  ${e}`));
if (report.errors.length && !flag('--force')) { console.log(`\n${report.errors.length} blocking issue(s). Fix them or pass --force.`); process.exit(1); }

try {
  // 2. figures and cover
  const figures = {};
  for (const f of collect(blocks, 'figure')) {
    const abs = path.resolve(srcDir, f.src);
    const base = path.basename(f.src).replace(/\.(chart\.json|svg|mmd|html|png|jpe?g)$/i, '');
    figures[f.src] = await renderFigure(abs, path.join(outDir, 'figures', `${base}.png`), theme);
    console.log(`  figure ${f.src} -> ${figures[f.src].width}x${figures[f.src].height}px`);
  }
  const cover = await renderCover(path.join(outDir, 'figures', '_cover.png'), theme, meta.paper);
  if (brand && brand.topBar) cover.bar = await renderBar(path.join(outDir, 'figures', '_bar.png'), brand.topBar, meta.paper);

  // 3. pass one, find the pages, pass two
  const docxPath = path.join(outDir, `${slug}.docx`);
  const pdfPath = path.join(outDir, `${slug}.pdf`);
  let res = await writeDocx({ meta, blocks, theme, figures, cover, tocPages: null });
  fs.writeFileSync(docxPath, res.buffer);
  if (flag('--no-pdf')) { console.log(`\nWord: ${docxPath}`); process.exit(0); }
  toPdf(docxPath, outDir);
  let pages = headingPages(pdfPath, res.outline, lang);
  for (let pass = 2; pass <= 3; pass++) {
    res = await writeDocx({ meta, blocks, theme, figures, cover, tocPages: pages });
    fs.writeFileSync(docxPath, res.buffer);
    toPdf(docxPath, outDir);
    const again = headingPages(pdfPath, res.outline, lang);
    const same = Object.keys(again).every(k => again[k] === pages[k]);
    pages = again;
    if (same) break;
  }
  const missing = res.outline.filter(o => !pages[o.anchor]).map(o => `${o.num} ${o.text}`);
  if (missing.length) console.log(`  warn   page not found for: ${missing.join(' | ')}`);

  // 4. page images and contact sheet, for the visual review
  const pagesDir = path.join(outDir, 'pages');
  fs.rmSync(pagesDir, { recursive: true, force: true });
  fs.mkdirSync(pagesDir);
  execFileSync('pdftoppm', ['-png', '-r', '110', pdfPath, path.join(pagesDir, 'page')]);
  const pngs = fs.readdirSync(pagesDir).filter(f => f.endsWith('.png')).sort().map(f => path.join(pagesDir, f));
  await contactSheet(pngs, path.join(outDir, 'contact.png'));

  const summary = {
    source: srcPath, docx: docxPath, pdf: pdfPath, contact: path.join(outDir, 'contact.png'), pages: pngs.length,
    ...res.counts, warnings: report.warnings, toc: res.outline.map(o => ({ num: o.num, text: o.text, page: pages[o.anchor] || null })),
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${pngs.length} pages, ${res.counts.chapters} chapters, ${res.counts.figures} figures, ${res.counts.tables} captioned tables, ${report.warnings.length} warnings`);
  console.log(`Word:    ${docxPath}\nPDF:     ${pdfPath}\nReview:  ${path.join(outDir, 'contact.png')} then ${pagesDir}/page-NN.png`);
} finally {
  await closeBrowser();
}

function loadTheme(name) {
  const file = name.endsWith('.json') ? path.resolve(srcDir, name) : path.join(SKILL_DIR, 'themes', `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`Theme not found: ${file}`);
  const t = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = t.extends ? JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'themes', `${t.extends}.json`), 'utf8')) : null;
  const merged = base ? { ...base, ...t, colors: { ...base.colors, ...t.colors }, sizes: { ...base.sizes, ...t.sizes }, layout: { ...base.layout, ...t.layout }, fonts: { ...base.fonts, ...t.fonts } } : t;
  const branded = brandTheme(merged, brand);
  if (meta.brand && typeof meta.brand === 'object') Object.assign(branded.colors, Object.fromEntries(Object.entries(meta.brand).map(([k, v]) => [k, String(v).replace('#', '')])));
  return branded;
}

function collect(bs, type, out = []) {
  for (const b of bs) {
    if (b.type === type) out.push(b);
    if (b.blocks) collect(b.blocks, type, out);
    if (b.items) b.items.forEach(it => it.blocks && collect(it.blocks, type, out));
  }
  return out;
}

function toPdf(docx, dir) {
  const bin = ['soffice', 'libreoffice', '/snap/bin/libreoffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice']
    .find(b => { try { execFileSync('sh', ['-c', `command -v "${b}"`], { stdio: 'ignore' }); return true; } catch { return fs.existsSync(b); } });
  if (!bin) throw new Error('LibreOffice not found: install it to get the PDF, or use --no-pdf');
  const profile = path.join(dir, '.lo-profile');
  execFileSync(bin, [`-env:UserInstallation=file://${profile}`, '--headless', '--convert-to', 'pdf:writer_pdf_Export:{"UseLosslessCompression":{"type":"boolean","value":"true"},"ReduceImageResolution":{"type":"boolean","value":"false"},"ExportBookmarks":{"type":"boolean","value":"true"}}', '--outdir', dir, docx], { stdio: 'ignore', timeout: 240000 });
}

function headingPages(pdf, outline, lang) {
  const txt = execFileSync('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 64 << 20 }).toString();
  const pages = txt.split('\f').map(p => p.split('\n').map(norm));
  const label = lang === 'en' ? 'CHAPTER' : 'CHAPITRE';
  const found = {};
  let from = 0;
  for (const o of outline) {
    let hit = -1;
    if (o.level === 1 && o.num) {
      // letter-spaced labels may come out as "C H A P I T R E 1": compare without spaces
      const want = norm(`${label} ${o.num}`).replace(/ /g, '');
      hit = pages.findIndex((p, i) => i >= from && p.some(l => l.replace(/ /g, '') === want));
      if (hit < 0) {
        const t = norm(o.text).slice(0, 34);
        hit = pages.findIndex((p, i) => i > from && p.some(l => l.startsWith(t)));
      }
    } else {
      const want = norm(`${o.num} ${o.text}`).slice(0, 34);
      hit = pages.findIndex((p, i) => i >= from && p.some(l => l.startsWith(want)));
    }
    if (hit >= 0) { found[o.anchor] = hit + 1; from = hit; }
  }
  return found;
}

function norm(s) { return s.replace(/\s+/g, ' ').trim().toLowerCase(); }
function slugify(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70); }
