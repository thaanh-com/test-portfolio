#!/usr/bin/env node
/**
 * Portfolio Build Script
 * ----------------------
 * Reads content from /content/home/ and /content/details/, generates:
 *   - /assets/content/home/...     (copied + resized images/videos)
 *   - /assets/content/details/...  (same for detail pages)
 *   - /assets/home.json            (manifest for index.html)
 *   - /assets/details/<slug>.json  (manifest per detail page)
 *   - /<slug>/index.html           (detail pages served at /<slug>/)
 *
 * No runtime npm deps are strictly required: if `sharp` is installed it will
 * generate responsive image variants; otherwise originals are copied as-is.
 *
 * Filename convention inside a project folder:
 *   NN-LAYOUT[-VARIANT].ext
 *   e.g. 01-w-xl.jpg, 02-hh-l.jpg, 03-hh-r.jpg, 04-qqq-1.jpg, 05-text.md
 *
 * Sort order:
 *   Home projects sorted by folder prefix DESCENDING (highest = top of page).
 *   Files inside a project sorted by prefix ASCENDING.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets', 'content');
const MANIFEST_DIR = path.join(ROOT, 'assets');
const DETAIL_TEMPLATE = path.join(ROOT, 'detail.html');

const RESPONSIVE_WIDTHS = [500, 800, 1080, 1600, 2000];
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);

// Try to load sharp dynamically. Works when npm deps are installed; falls back
// to "copy only" when not (e.g. local sandbox without network). GitHub Actions
// runs `npm ci` before building so sharp will be present there.
let sharp = null;
try {
  const mod = await import('sharp');
  sharp = mod.default || mod;
} catch {
  console.warn('[build] sharp not available — responsive variants will not be generated.');
}

// ---- Layout registry --------------------------------------------------------
const LAYOUTS = {
  'w-xl':     { slots: null },
  'w':        { slots: null },
  'h':        { slots: null },
  'w-16-9':   { slots: null },
  'hh':       { slots: ['l', 'r'] },
  'hh-small': { slots: ['l', 'r'] },
  'ww':       { slots: ['l', 'r'] },
  'qqq':      { slots: ['1', '2', '3'] },
  'hhh':      { slots: ['1', '2', '3'] },
  // hw: 'l' is the tall portrait. Either a single 'r' or the pair 'r-top' + 'r-bottom'.
  'hw':       { slots: ['l', 'r', 'r-top', 'r-bottom'] },
};
const LAYOUT_NAMES_SORTED = Object.keys(LAYOUTS).sort((a, b) => b.length - a.length);

// ---- Minimal frontmatter parser (no deps) ----------------------------------
// Supports:
//   ---
//   key: value                (strings, numbers, booleans)
//   key: "quoted value"
//   parent:
//     child: value
//   parent:
//     - item
//     - item
//   list: [a, b]
//   ---
//   body content here ...
function parseMatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  return { data: parseYamlSubset(m[1]), content: m[2] };
}

function parseYamlSubset(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root, isArray: false }];

  function coerce(v) {
    v = v.trim();
    if (v === '') return '';
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    // Strip matching quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
    return v;
  }

  function parseInline(v) {
    v = v.trim();
    // Flow array: [a, b]
    if (v.startsWith('[') && v.endsWith(']')) {
      return v.slice(1, -1).split(',').map(s => coerce(s));
    }
    // Flow object: {key: value, key2: value2}
    if (v.startsWith('{') && v.endsWith('}')) {
      const obj = {};
      const inner = v.slice(1, -1);
      // naive split by comma — doesn't handle nested commas in strings
      const parts = [];
      let depth = 0, cur = '', inStr = null;
      for (const ch of inner) {
        if (inStr) { cur += ch; if (ch === inStr) inStr = null; continue; }
        if (ch === '"' || ch === "'") { inStr = ch; cur += ch; continue; }
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
        if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) parts.push(cur);
      for (const p of parts) {
        const idx = p.indexOf(':');
        if (idx === -1) continue;
        const key = p.slice(0, idx).trim().replace(/^["']|["']$/g, '');
        const val = parseInline(p.slice(idx + 1));
        obj[key] = val;
      }
      return obj;
    }
    return coerce(v);
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.match(/^(\s*)/)[1].length;
    const line = rawLine.trim();

    // Pop stack levels deeper than current indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const top = stack[stack.length - 1];

    if (line.startsWith('- ')) {
      // Array item
      const val = line.slice(2).trim();
      if (!Array.isArray(top.obj)) {
        // Replace parent's last key with an array
        throw new Error('Array item but context is not an array: ' + rawLine);
      }
      if (val.includes(':') && !(val.startsWith('{') || val.startsWith('['))) {
        // Inline mapping as array item: "- key: value"
        const obj = {};
        const idx = val.indexOf(':');
        const key = val.slice(0, idx).trim();
        const v = val.slice(idx + 1).trim();
        obj[key] = v ? parseInline(v) : null;
        top.obj.push(obj);
        stack.push({ indent: indent + 2, obj, isArray: false });
      } else {
        top.obj.push(parseInline(val));
      }
    } else {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().replace(/^["']|["']$/g, '');
      const val = line.slice(idx + 1).trim();

      if (val === '') {
        // Nested object or array follows (indent will be greater on next line)
        // Peek ahead to decide if it's an array or object.
        let next = null;
        for (let j = i + 1; j < lines.length; j++) {
          if (!lines[j].trim() || lines[j].trim().startsWith('#')) continue;
          next = lines[j];
          break;
        }
        if (next && next.trim().startsWith('- ')) {
          const arr = [];
          if (Array.isArray(top.obj)) top.obj.push({ [key]: arr });
          else top.obj[key] = arr;
          stack.push({ indent, obj: arr, isArray: true });
        } else {
          const obj = {};
          if (Array.isArray(top.obj)) top.obj.push({ [key]: obj });
          else top.obj[key] = obj;
          stack.push({ indent, obj, isArray: false });
        }
      } else {
        const parsed = parseInline(val);
        if (Array.isArray(top.obj)) top.obj.push({ [key]: parsed });
        else top.obj[key] = parsed;
      }
    }
  }
  return root;
}

// ---- Helpers ----------------------------------------------------------------

function log(...args) { console.log('[build]', ...args); }

async function rmrf(dir) { await fs.rm(dir, { recursive: true, force: true }); }
async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

function parseName(name) {
  const m = name.match(/^(\d+)-(.+?)(\.[^.]+)$/);
  if (!m) return null;
  const order = parseInt(m[1], 10);
  const rest = m[2];
  const ext = m[3].slice(1).toLowerCase();

  if (rest === 'text' && ext === 'md') return { order, kind: 'text', ext };

  for (const lname of LAYOUT_NAMES_SORTED) {
    const ldef = LAYOUTS[lname];
    if (ldef.slots === null) {
      if (rest === lname) return { order, kind: 'media', layout: lname, slot: null, ext };
    } else {
      for (const slot of ldef.slots) {
        if (rest === `${lname}-${slot}`) return { order, kind: 'media', layout: lname, slot, ext };
      }
    }
  }
  return null;
}

function groupSections(parsedFiles) {
  const out = [];
  let i = 0;
  while (i < parsedFiles.length) {
    const f = parsedFiles[i];
    if (f.parsed.kind === 'text') { out.push({ type: 'text', file: f }); i++; continue; }
    const layoutName = f.parsed.layout;
    const ldef = LAYOUTS[layoutName];
    if (ldef.slots === null) {
      out.push({ type: 'section', layout: layoutName, items: [{ slot: null, file: f }] });
      i++;
    } else {
      const items = [];
      const seen = new Set();
      while (
        i < parsedFiles.length &&
        parsedFiles[i].parsed.kind === 'media' &&
        parsedFiles[i].parsed.layout === layoutName &&
        !seen.has(parsedFiles[i].parsed.slot)
      ) {
        items.push({ slot: parsedFiles[i].parsed.slot, file: parsedFiles[i] });
        seen.add(parsedFiles[i].parsed.slot);
        i++;
      }
      out.push({ type: 'section', layout: layoutName, items });
    }
  }
  return out;
}

async function processImage(srcAbs, outDir, baseName, ext) {
  await ensureDir(outDir);
  const originalOutName = `${baseName}.${ext}`;
  const originalOutPath = path.join(outDir, originalOutName);
  await fs.copyFile(srcAbs, originalOutPath);

  let origWidth = 0;
  const variants = [{ name: originalOutName, width: null }];

  if (sharp) {
    const meta = await sharp(srcAbs, { failOn: 'none' }).metadata();
    origWidth = meta.width || 0;
    variants[0].width = origWidth;
    for (const w of RESPONSIVE_WIDTHS) {
      if (w >= origWidth) continue;
      const variantName = `${baseName}-p-${w}.${ext}`;
      const variantPath = path.join(outDir, variantName);
      await sharp(srcAbs, { failOn: 'none' })
        .resize({ width: w, withoutEnlargement: true })
        .toFile(variantPath);
      variants.push({ name: variantName, width: w });
    }
  } else {
    variants[0].width = 2000; // placeholder when sharp unavailable
  }
  return { variants, originalWidth: origWidth };
}

async function processVideo(srcAbs, outDir, baseName, ext) {
  await ensureDir(outDir);
  const outName = `${baseName}.${ext}`;
  await fs.copyFile(srcAbs, path.join(outDir, outName));
  return { fileName: outName };
}

async function scanProject(projectAbsPath, assetsRelBase) {
  const folderName = path.basename(projectAbsPath);
  const folderMatch = folderName.match(/^(\d+)-(.+)$/);
  const order = folderMatch ? parseInt(folderMatch[1], 10) : 0;
  const slug = folderMatch ? folderMatch[2] : folderName;

  const metaPath = path.join(projectAbsPath, 'meta.md');
  let metaData = {};
  let metaBody = '';
  if (await exists(metaPath)) {
    const raw = await fs.readFile(metaPath, 'utf8');
    const parsed = parseMatter(raw);
    metaData = parsed.data || {};
    metaBody = (parsed.content || '').trim();
  }

  const entries = await fs.readdir(projectAbsPath, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name === 'meta.md') continue;
    if (e.name.startsWith('.')) continue;
    const parsed = parseName(e.name);
    if (!parsed) {
      console.warn(`  ⚠ skipping unrecognised file: ${folderName}/${e.name}`);
      continue;
    }
    files.push({ name: e.name, absPath: path.join(projectAbsPath, e.name), parsed });
  }
  files.sort((a, b) => a.parsed.order - b.parsed.order);

  const assetOutAbs = path.join(ASSETS_DIR, assetsRelBase, folderName);
  for (const f of files) {
    if (f.parsed.kind !== 'media') continue;
    const baseName = path.basename(f.name, `.${f.parsed.ext}`);
    if (IMAGE_EXTS.has(f.parsed.ext)) {
      const processed = await processImage(f.absPath, assetOutAbs, baseName, f.parsed.ext);
      f.output = {
        kind: 'image',
        relPath: `/assets/content/${assetsRelBase}/${folderName}/${processed.variants[0].name}`,
        variants: processed.variants.map(v => ({
          url: `/assets/content/${assetsRelBase}/${folderName}/${v.name}`,
          width: v.width,
        })),
        originalWidth: processed.originalWidth,
      };
    } else if (VIDEO_EXTS.has(f.parsed.ext)) {
      const processed = await processVideo(f.absPath, assetOutAbs, baseName, f.parsed.ext);
      f.output = {
        kind: 'video',
        relPath: `/assets/content/${assetsRelBase}/${folderName}/${processed.fileName}`,
      };
    } else {
      console.warn(`  ⚠ unsupported ext .${f.parsed.ext} for ${f.name}`);
    }
  }

  for (const f of files) {
    if (f.parsed.kind !== 'text') continue;
    const raw = await fs.readFile(f.absPath, 'utf8');
    f.text = parseMatter(raw).content.trim();
  }

  const grouped = groupSections(files);
  const blocks = grouped.map(g => {
    if (g.type === 'text') return { type: 'text', text: g.file.text };
    const items = g.items.map(it => {
      const out = it.file.output;
      if (!out) return null;
      if (out.kind === 'image') {
        return {
          slot: it.slot,
          kind: 'image',
          src: out.relPath,
          variants: out.variants,
          originalWidth: out.originalWidth,
        };
      }
      return { slot: it.slot, kind: 'video', src: out.relPath };
    }).filter(Boolean);
    return { type: 'section', layout: g.layout, items };
  });

  return { slug, order, meta: metaData, metaBody, blocks };
}

// ---- Home build -------------------------------------------------------------
async function buildHome() {
  const homeDir = path.join(CONTENT_DIR, 'home');
  if (!(await exists(homeDir))) { log('no /content/home/ folder, skipping'); return null; }
  const entries = await fs.readdir(homeDir, { withFileTypes: true });
  const projects = [];

  let about = null;
  const aboutPath = path.join(homeDir, 'about.md');
  if (await exists(aboutPath)) {
    const raw = await fs.readFile(aboutPath, 'utf8');
    const parsed = parseMatter(raw);
    about = { ...parsed.data, body: parsed.content.trim() };
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const projectPath = path.join(homeDir, e.name);
    log(`home/${e.name}`);
    const proj = await scanProject(projectPath, 'home');
    const sections = proj.blocks.filter(b => b.type === 'section');
    const metaText = (proj.metaBody || '').trim();
    projects.push({
      slug: proj.slug,
      order: proj.order,
      id: proj.meta?.id || proj.slug,
      title: proj.meta?.title || '',
      metaText,
      button: proj.meta?.button
        ? { label: proj.meta.button.label, href: proj.meta.button.href, newTab: !!proj.meta.button.newTab }
        : null,
      linkHref: proj.meta?.linkHref || null,
      sections,
    });
  }

  projects.sort((a, b) => b.order - a.order);
  const manifest = { about, projects };
  await ensureDir(MANIFEST_DIR);
  await fs.writeFile(path.join(MANIFEST_DIR, 'home.json'), JSON.stringify(manifest, null, 2));
  log(`wrote home.json with ${projects.length} projects`);
  return manifest;
}

// ---- Details build ----------------------------------------------------------
async function buildDetails() {
  const detailsDir = path.join(CONTENT_DIR, 'details');
  if (!(await exists(detailsDir))) { log('no /content/details/ folder, skipping'); return []; }
  const entries = await fs.readdir(detailsDir, { withFileTypes: true });
  const detailsManifestDir = path.join(MANIFEST_DIR, 'details');
  await ensureDir(detailsManifestDir);

  const templateExists = await exists(DETAIL_TEMPLATE);
  const template = templateExists ? await fs.readFile(DETAIL_TEMPLATE, 'utf8') : null;

  const slugs = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const projectPath = path.join(detailsDir, e.name);
    log(`details/${e.name}`);
    const proj = await scanProject(projectPath, 'details');

    const manifest = {
      slug: proj.slug,
      title: proj.meta?.title || proj.slug,
      intro: proj.meta?.intro || '',
      footer: {
        title: proj.meta?.footerTitle || proj.meta?.title || proj.slug,
        body: (proj.metaBody || '').trim(),
      },
      bodyClass: proj.meta?.bodyClass || 'body-3',
      blocks: proj.blocks,
    };

    const manifestPath = path.join(detailsManifestDir, `${proj.slug}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    if (template) {
      const outDir = path.join(ROOT, proj.slug);
      await ensureDir(outDir);
      const html = template
        .replaceAll('__PROJECT_SLUG__', proj.slug)
        .replaceAll('__PROJECT_TITLE__', manifest.title)
        .replaceAll('__PROJECT_TITLE_HTML__', escapeHtml(manifest.title));
      await fs.writeFile(path.join(outDir, 'index.html'), html);
    }
    slugs.push(proj.slug);
  }
  log(`wrote ${slugs.length} detail manifests: ${slugs.join(', ')}`);
  return slugs;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// ---- Main -------------------------------------------------------------------
async function main() {
  log('cleaning previous build output');
  await rmrf(ASSETS_DIR);
  await rmrf(path.join(MANIFEST_DIR, 'details'));
  await fs.rm(path.join(MANIFEST_DIR, 'home.json'), { force: true });

  log(`content dir: ${CONTENT_DIR}`);
  await buildHome();
  await buildDetails();
  log('done');
}

main().catch(err => { console.error('[build] FAILED:', err); process.exit(1); });
