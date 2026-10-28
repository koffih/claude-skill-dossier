// Source format: Markdown with a YAML front matter and ::: directives.
// Output: { meta, blocks }, a small block tree the writer turns into Word.
import { marked } from 'marked';
import YAML from 'yaml';

const OPEN = /^:::([a-z][\w-]*)\s*(\{(.*)\})?\s*$/i;
const CLOSE = /^:::\s*$/;
const CHIP = /\{\{(good|warn|bad|info|accent|muted):([^}]+)\}\}/g;

export function parseSource(text) {
  let meta = {};
  let body = text.replace(/\r\n/g, '\n');
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    meta = YAML.parse(fm[1]) || {};
    body = body.slice(fm[0].length);
  }
  return { meta, blocks: parseBody(body) };
}

export function parseAttrs(s) {
  const out = {};
  if (!s) return out;
  const re = /([\w-]+)(?:=("([^"]*)"|'([^']*)'|([^\s"']+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[3] ?? m[4] ?? m[5];
    out[m[1]] = v === undefined ? true : v;
  }
  return out;
}

function parseBody(text) {
  const lines = text.split('\n');
  const blocks = [];
  let buf = [];
  const flush = () => {
    if (buf.length) blocks.push(...fromMarkdown(buf.join('\n')));
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OPEN);
    if (!m) { buf.push(lines[i]); continue; }
    flush();
    const name = m[1].toLowerCase();
    const attrs = parseAttrs(m[3]);
    let depth = 1;
    const inner = [];
    for (i++; i < lines.length; i++) {
      if (OPEN.test(lines[i])) depth++;
      else if (CLOSE.test(lines[i]) && --depth === 0) break;
      inner.push(lines[i]);
    }
    if (depth !== 0) throw new Error(`Directive :::${name} is never closed`);
    blocks.push(directive(name, attrs, inner.join('\n')));
  }
  flush();
  return blocks;
}

function directive(name, attrs, inner) {
  switch (name) {
    case 'summary':
      return { type: 'summary', title: attrs.title, blocks: parseBody(inner) };
    case 'goal':
      return { type: 'goal', title: attrs.title, blocks: parseBody(inner) };
    case 'callout':
    case 'note':
    case 'decision':
    case 'warning':
    case 'success': {
      const tone = attrs.tone || { note: 'info', decision: 'accent', warning: 'warn', success: 'good' }[name] || 'info';
      return { type: 'callout', tone, title: attrs.title, blocks: parseBody(inner) };
    }
    case 'kpis':
      return {
        type: 'kpis',
        items: inner.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const [value, label, note] = l.split('|').map(s => s.trim());
          return { value, label: label || '', note: note || '' };
        }),
      };
    case 'figure':
      return { type: 'figure', src: attrs.src, caption: attrs.caption || inner.trim(), width: Number(attrs.width) || 100, attrs };
    case 'table': {
      const inside = parseBody(inner);
      const table = inside.find(b => b.type === 'table');
      if (!table) throw new Error(':::table must contain a Markdown table');
      table.attrs = { ...table.attrs, ...attrs };
      return table;
    }
    case 'pagebreak':
      return { type: 'pagebreak' };
    case 'signatures':
      return { type: 'signatures', names: inner.split('\n').map(s => s.trim()).filter(Boolean) };
    default:
      throw new Error(`Unknown directive :::${name}`);
  }
}

function fromMarkdown(md) {
  const tokens = marked.lexer(md, { gfm: true });
  return tokens.map(blockToken).filter(Boolean);
}

function blockToken(t) {
  switch (t.type) {
    case 'space':
      return null;
    case 'heading':
      return { type: 'heading', level: t.depth, inline: inline(t.tokens), raw: t.text };
    case 'paragraph': {
      const only = t.tokens.filter(x => !(x.type === 'text' && !x.text.trim()));
      if (only.length === 1 && only[0].type === 'image') {
        const im = only[0];
        const w = /width=(\d+)/.exec(im.title || '');
        return { type: 'figure', src: im.href, caption: im.text, width: w ? Number(w[1]) : 100, attrs: {} };
      }
      if (/^\\pagebreak\s*$/.test(t.text)) return { type: 'pagebreak' };
      return { type: 'paragraph', inline: inline(t.tokens) };
    }
    case 'list':
      return {
        type: 'list',
        ordered: t.ordered,
        start: t.start || 1,
        items: t.items.map(it => {
          const kids = it.tokens.map(blockToken).filter(Boolean);
          // marked wraps a tight item's text in a "text" block token
          return { task: it.task, checked: it.checked, blocks: kids };
        }),
      };
    case 'text':
      return { type: 'paragraph', inline: inline(t.tokens || [{ type: 'text', text: t.text }]) };
    case 'table':
      return {
        type: 'table',
        align: t.align,
        header: t.header.map(c => inline(c.tokens)),
        rows: t.rows.map(r => r.map(c => inline(c.tokens))),
        attrs: {},
      };
    case 'blockquote':
      return { type: 'callout', tone: 'muted', blocks: t.tokens.map(blockToken).filter(Boolean) };
    case 'code':
      return { type: 'code', text: t.text, lang: t.lang };
    case 'hr':
      return { type: 'hr' };
    case 'html':
      return t.text.trim() ? { type: 'paragraph', inline: [{ text: t.text.trim() }] } : null;
    default:
      return { type: 'paragraph', inline: [{ text: t.raw || '' }] };
  }
}

// Inline tokens to runs: { text, bold, italic, code, strike, link, chip }
export function inline(tokens = [], style = {}) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'strong':
        out.push(...inline(t.tokens, { ...style, bold: true }));
        break;
      case 'em':
        out.push(...inline(t.tokens, { ...style, italic: true }));
        break;
      case 'del':
        out.push(...inline(t.tokens, { ...style, strike: true }));
        break;
      case 'codespan':
        out.push({ ...style, text: unescape(t.text), code: true });
        break;
      case 'link':
        out.push(...inline(t.tokens, { ...style, link: t.href }));
        break;
      case 'br':
        out.push({ ...style, text: '', br: true });
        break;
      case 'image':
        out.push({ ...style, text: t.text });
        break;
      case 'text':
      case 'escape':
        if (t.tokens && t.tokens.length && t.type === 'text') out.push(...inline(t.tokens, style));
        else out.push(...chips(unescape(t.text), style));
        break;
      default:
        out.push(...chips(unescape(t.raw || t.text || ''), style));
    }
  }
  return out;
}

function chips(text, style) {
  const out = [];
  let last = 0;
  let m;
  CHIP.lastIndex = 0;
  while ((m = CHIP.exec(text))) {
    if (m.index > last) out.push({ ...style, text: text.slice(last, m.index) });
    out.push({ ...style, text: m[2], chip: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ ...style, text: text.slice(last) });
  return out;
}

function unescape(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function plain(runs) {
  return runs.map(r => r.text).join('');
}
