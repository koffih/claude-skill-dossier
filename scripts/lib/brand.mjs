// House brands: a firm's logo, colours, fonts and footer, kept outside the skill, applied by name.
//
// A brand is a folder holding brand.json and its files (logo, fonts):
//   $DOSSIER_HOME/brands/<name>/brand.json      (DOSSIER_HOME defaults to ~/.config/dossier)
// $DOSSIER_HOME/config.json may name a default: { "defaultBrand": "acme" }.
//
// Which brand applies, first match wins:
//   1. --brand NAME | --brand none           on the command line
//   2. brand: NAME  | brand: none            in the front matter (a map there stays a colour override)
//   3. defaultBrand of config.json
//   4. none: the plain themes of the skill, no logo
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

export const DOSSIER_HOME = process.env.DOSSIER_HOME || path.join(os.homedir(), '.config', 'dossier');
const NONE = new Set(['none', 'aucune', 'sans', 'neutre', 'neutral', 'off', 'false']);

export function brandName(cli, meta) {
  if (cli) return NONE.has(String(cli).toLowerCase()) ? null : cli;
  if (meta.brand === false) return null;
  if (typeof meta.brand === 'string') return NONE.has(meta.brand.toLowerCase()) ? null : meta.brand;
  const cfg = path.join(DOSSIER_HOME, 'config.json');
  if (fs.existsSync(cfg)) {
    const d = JSON.parse(fs.readFileSync(cfg, 'utf8')).defaultBrand;
    if (d && !NONE.has(String(d).toLowerCase())) return d;
  }
  return null;
}

export function loadBrand(name) {
  if (!name) return null;
  const dir = path.join(DOSSIER_HOME, 'brands', name);
  const file = path.join(dir, 'brand.json');
  if (!fs.existsSync(file)) throw new Error(`Brand not found: ${file} (use --brand none for a document without a brand)`);
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const abs = p => (p ? path.resolve(dir, p) : undefined);
  for (const k of ['logo', 'logoOnDark']) if (b[k]) {
    b[k] = abs(b[k]);
    if (!fs.existsSync(b[k])) throw new Error(`Brand ${name}: ${k} missing at ${b[k]}`);
  }
  b.embed = (b.embed || []).map(e => ({ ...e, dir: abs(e.dir || 'fonts') }));
  b.name = b.name || name;
  b.dir = dir;
  return b;
}

// Theme of a branded document: the brand's base theme, then its colours, fonts and sizes.
export function brandTheme(base, brand) {
  if (!brand) return base;
  return {
    ...base,
    name: `${base.name}+${brand.name}`,
    colors: { ...base.colors, ...Object.fromEntries(Object.entries(brand.colors || {}).map(([k, v]) => [k, String(v).replace('#', '')])) },
    fonts: { ...base.fonts, ...(brand.fonts || {}) },
    sizes: { ...base.sizes, ...(brand.sizes || {}) },
    layout: { ...base.layout, ...(brand.layout || {}) },
    embed: brand.embed && brand.embed.length ? brand.embed : base.embed,
  };
}

// LibreOffice draws the PDF with the fonts installed on the machine, not those embedded in the
// Word file: a brand font missing from the system silently falls back to another one.
export function installBrandFonts(brand) {
  if (!brand || !brand.embed.length || process.platform === 'win32') return;
  const target = process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Fonts')
    : path.join(os.homedir(), '.local', 'share', 'fonts', `dossier-${brand.name}`);
  fs.mkdirSync(target, { recursive: true });
  let added = false;
  for (const e of brand.embed) for (const k of ['regular', 'bold', 'italic', 'boldItalic']) {
    if (!e[k]) continue;
    const to = path.join(target, path.basename(e[k]));
    if (!fs.existsSync(to)) { fs.copyFileSync(path.join(e.dir, e[k]), to); added = true; }
  }
  if (added && process.platform !== 'darwin') { try { execFileSync('fc-cache', ['-f', target], { stdio: 'ignore' }); } catch {} }
}
