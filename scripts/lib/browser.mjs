// Headless Chrome for everything drawn: figures (SVG, Mermaid, charts, HTML),
// the cover background and the contact sheet of rendered pages.
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.resolve(HERE, '..', '..');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function findChrome() {
  const hit = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!hit) throw new Error('No Chrome or Chromium found. Set CHROME_PATH.');
  return hit;
}

let browserPromise = null;
export async function browser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: findChrome(),
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}
export async function closeBrowser() {
  if (browserPromise) (await browserPromise).close();
  browserPromise = null;
}

// CSS variables every figure can use: fill="var(--accent)", font-family="var(--font)".
export function themeCss(theme) {
  const c = theme.colors;
  const faces = [
    `@font-face{font-family:'Doc';font-weight:400;src:url('${fontUrl(theme, 'regular')}')}`,
    `@font-face{font-family:'Doc';font-weight:400;font-style:italic;src:url('${fontUrl(theme, 'italic')}')}`,
    `@font-face{font-family:'Doc';font-weight:600;src:url('${fontUrl(theme, 'semibold')}')}`,
    `@font-face{font-family:'Doc';font-weight:700;src:url('${fontUrl(theme, 'bold')}')}`,
  ].join('\n');
  const vars = Object.entries(c).map(([k, v]) => `--${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:#${v};`).join('');
  return `${faces}
:root{${vars}--font:'Doc','${theme.fonts.body}',sans-serif;}
html,body{margin:0;padding:0;background:#fff;font-family:var(--font);color:var(--ink);-webkit-font-smoothing:antialiased}
svg text{font-family:var(--font)}
#stage{display:inline-block;padding:0}`;
}

function fontUrl(theme, face) {
  const e0 = theme.embed[0];
  const e1 = theme.embed[1] || e0;
  const file = { regular: e0.regular, italic: e0.italic || e0.regular, bold: e0.bold || e0.regular, semibold: e1.regular }[face];
  return pathToFileURL(path.join(SKILL_DIR, 'assets/fonts', file)).href;
}

async function shoot(html, outPng, { scale = 3, selector = '#stage', width = 1200 } = {}) {
  const b = await browser();
  const page = await b.newPage();
  try {
    await page.setViewport({ width, height: 800, deviceScaleFactor: scale });
    const tmp = outPng.replace(/\.png$/, '.render.html');
    fs.writeFileSync(tmp, html);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction('window.__ready !== false', { timeout: 30000 });
    const el = await page.$(selector);
    if (!el) throw new Error(`Nothing to capture in ${tmp}`);
    const box = await el.boundingBox();
    await el.screenshot({ path: outPng, omitBackground: false });
    fs.unlinkSync(tmp);
    return { width: Math.round(box.width), height: Math.round(box.height) };
  } finally {
    await page.close();
  }
}

// Renders one figure source to PNG. Returns { png, width, height } in CSS px.
export async function renderFigure(src, outPng, theme) {
  const ext = src.toLowerCase().match(/\.(chart\.json|svg|mmd|html|png|jpe?g)$/)?.[1];
  if (!ext) throw new Error(`Unsupported figure type: ${src}`);
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    const html = `<html><body><img id="stage" src="${pathToFileURL(src).href}"></body></html>`;
    // keep the original pixels, only measure
    const dims = await shoot(html, outPng + '.probe.png', { scale: 1, width: 4000 });
    fs.unlinkSync(outPng + '.probe.png');
    fs.copyFileSync(src, outPng.replace(/\.png$/, '.' + ext));
    return { png: outPng.replace(/\.png$/, '.' + ext), type: ext === 'png' ? 'png' : 'jpg', ...dims };
  }
  const css = themeCss(theme);
  const text = fs.readFileSync(src, 'utf8');
  let html;
  if (ext === 'svg') {
    const svg = text.replace(/<\?xml[^>]*>/, '');
    html = `<html><head><style>${css}</style></head><body><div id="stage">${svg}</div></body></html>`;
  } else if (ext === 'html') {
    html = `<html><head><style>${css}</style></head><body><div id="stage">${text}</div></body></html>`;
  } else if (ext === 'mmd') {
    const lib = pathToFileURL(path.join(SKILL_DIR, 'node_modules/mermaid/dist/mermaid.min.js')).href;
    const c = theme.colors;
    const cfg = {
      startOnLoad: false,
      theme: 'base',
      fontFamily: 'Doc',
      themeVariables: {
        fontFamily: 'Doc', fontSize: '15px',
        primaryColor: '#' + c.accentSoft, primaryBorderColor: '#' + c.accent, primaryTextColor: '#' + c.ink,
        secondaryColor: '#' + c.surface, tertiaryColor: '#' + c.paper, lineColor: '#' + c.muted,
        noteBkgColor: '#' + c.warnSoft, noteBorderColor: '#' + c.warn, clusterBkg: '#' + c.surface, clusterBorder: '#' + c.rule,
        edgeLabelBackground: '#ffffff', actorBkg: '#' + c.accentSoft, actorBorder: '#' + c.accent,
      },
      flowchart: { curve: 'basis', padding: 14, htmlLabels: true },
    };
    html = `<html><head><style>${css}</style><script src="${lib}"></script></head><body>
<div id="stage"></div>
<script>window.__ready=false;mermaid.initialize(${JSON.stringify(cfg)});
Promise.all(['400 15px Doc','600 15px Doc'].map(f=>document.fonts.load(f))).then(()=>mermaid.render('fig', ${JSON.stringify(text)})).then(r=>{
const st=document.getElementById('stage');st.innerHTML=r.svg;const svg=st.querySelector('svg');const vb=svg.viewBox.baseVal;
svg.style.maxWidth='none';svg.setAttribute('width',Math.ceil(vb.width));svg.setAttribute('height',Math.ceil(vb.height));window.__ready=true;})
.catch(e=>{document.getElementById('stage').innerText='MERMAID ERROR '+e.message;window.__ready=true;});</script></body></html>`;
  } else if (ext === 'chart.json') {
    const spec = JSON.parse(text);
    const lib = pathToFileURL(path.join(SKILL_DIR, 'node_modules/echarts/dist/echarts.min.js')).href;
    const c = theme.colors;
    const palette = [c.accent, c.accentDark, c.good, c.warn, c.faint, c.bad].map(x => '#' + x);
    const w = spec.width || 720, h = spec.height || 360;
    const option = spec.option || spec;
    delete option.width; delete option.height;
    html = `<html><head><style>${css}</style><script src="${lib}"></script></head><body>
<div id="stage" style="width:${w}px;height:${h}px"></div>
<script>window.__ready=false;
const ch=echarts.init(document.getElementById('stage'),null,{renderer:'svg'});
const base={color:${JSON.stringify(palette)},animation:false,textStyle:{fontFamily:'Doc',color:'#${c.ink}',fontSize:13},
 grid:{left:16,right:24,top:40,bottom:16,containLabel:true}};
const opt=Object.assign(base, ${JSON.stringify(option)});
ch.setOption(opt);setTimeout(()=>{window.__ready=true},300);</script></body></html>`;
  }
  const dims = await shoot(html, outPng);
  return { png: outPng, type: 'png', ...dims };
}

// Full-page cover art: a band in the dark accent with quiet arcs, a thin accent rule.
export async function renderCover(outPng, theme, paper) {
  const c = theme.colors;
  const [wIn, hIn] = paper === 'a4' ? [8.27, 11.69] : [8.5, 11];
  const W = Math.round(wIn * 96), H = Math.round(hIn * 96);
  const band = Math.round(H * (theme.layout.coverBand || 0.36));
  const arcs = [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${W * 0.92}" cy="${band * 0.15}" r="${120 + i * 70}" fill="none" stroke="#${c.accent}" stroke-opacity="${0.42 - i * 0.06}" stroke-width="${i === 0 ? 2 : 1.2}"/>`).join('');
  const html = `<html><head><style>html,body{margin:0}</style></head><body>
<svg id="stage" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><clipPath id="b"><rect width="${W}" height="${band}"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<rect width="${W}" height="${band}" fill="#${c.accentDark}"/>
<g clip-path="url(#b)">${arcs}</g>
<rect x="0" y="${band}" width="${Math.round(W * 0.28)}" height="6" fill="#${c.accent}"/>
<rect x="0" y="${H - 10}" width="${W}" height="10" fill="#${c.accentDark}"/>
</svg></body></html>`;
  const dims = await shoot(html, outPng, { scale: 2.5, width: W + 20 });
  return { png: outPng, ...dims, bandPx: band };
}

// One image with every rendered page side by side, to judge the whole at a glance.
export async function contactSheet(pagePngs, outPng, cols = 4) {
  const imgs = pagePngs.map((p, i) => `<figure><img src="${pathToFileURL(p).href}"><figcaption>${i + 1}</figcaption></figure>`).join('');
  const html = `<html><head><style>
body{margin:0;background:#E7E9EC;font:600 14px sans-serif;color:#555}
#stage{display:grid;grid-template-columns:repeat(${cols},300px);gap:18px;padding:18px}
figure{margin:0}img{width:300px;display:block;box-shadow:0 1px 4px rgba(0,0,0,.25);background:#fff}
figcaption{text-align:center;padding-top:4px}</style></head><body><div id="stage">${imgs}</div></body></html>`;
  return shoot(html, outPng, { scale: 1, width: cols * 320 + 40 });
}
