/**
 * import-htb.mjs
 * Turns the Markdown files in my HTB-Writeups repo into portfolio writeups.
 * Runs in GitHub Actions before scripts/build-site.mjs. Node 20, no packages.
 *
 * Reads:   .htb-writeups/HackTheBox/**.md   (checked out by the workflow)
 * Writes:  writeups/htb-<name>.md           (generated, never committed)
 * Config:  data/htb-publish.json            ("exclude": paths to skip)
 *
 * This script never fails the deploy. If anything is missing it prints a
 * warning and exits with code 0, so the site still builds.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, posix } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, '.htb-writeups');
const BASE_DIR = 'HackTheBox';
const OUT = join(ROOT, 'writeups');
const CONFIG = join(ROOT, 'data', 'htb-publish.json');
const RAW_FALLBACK = 'https://raw.githubusercontent.com/vishalmani-11/HTB-Writeups';
const MARK = 'generated: htb-import';
const LEVELS = { easy: 1, medium: 2, hard: 3, insane: 4, fortresses: 3 };
const LEVEL_NAMES = ['', 'Easy', 'Medium', 'Hard', 'Insane'];
const GENERIC = /^(readme|index|writeup|writeups|report|notes?)$/i;

function git(args) {
  return execFileSync('git', ['-C', SRC, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function walk(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) found.push(full);
  }
  return found;
}

const toPosix = (p) => p.split('\\').join('/');
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'writeup';
const titleCase = (s) => s.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
const stripMd = (s) =>
  oneLine(
    s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[`*_~]/g, '')
      .replace(/\s#+\s*$/, '')
  );

// "BedSide_report" -> "BedSide", "Orion_Writeup" -> "Orion"
function cleanName(file) {
  const base = file.replace(/\.md$/i, '');
  const cleaned = base.replace(/[_\-\s]*(writeups?|reports?)\b/gi, '').replace(/[_\-]+/g, ' ').trim();
  return titleCase(cleaned || base.replace(/[_\-]+/g, ' '));
}

function parseFrontMatter(text) {
  const m = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: text.slice(m[0].length) };
}

function firstParagraph(body) {
  let inFence = false;
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t) continue;
    if (t.startsWith('```')) { inFence = !(t.length > 3 && t.endsWith('```') && t.split('\n').length > 1); continue; }
    if (inFence) { if (t.includes('```')) inFence = false; continue; }
    if (/^(#|>|[-*+] |\d+[.)] |\||!\[|<|---|===)/.test(t)) continue;
    const plain = stripMd(t);
    if (plain.length < 12) continue;
    return plain.length > 160 ? plain.slice(0, 157).trimEnd() + '...' : plain;
  }
  return '';
}

function firstCommitDate(rel) {
  try {
    const lines = git(['log', '--diff-filter=A', '--follow', '--format=%aI', '--', rel]).split('\n').filter(Boolean);
    if (lines.length) return lines[lines.length - 1].slice(0, 10);
  } catch { /* fall through */ }
  try {
    const last = git(['log', '-1', '--format=%aI', '--', rel]);
    if (last) return last.slice(0, 10);
  } catch { /* fall through */ }
  return new Date().toISOString().slice(0, 10);
}

// raw.githubusercontent.com base for the HTB repo, read from the checkout so a renamed account still works
function rawBase() {
  try {
    const m = git(['remote', 'get-url', 'origin']).match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}`;
  } catch { /* fall through */ }
  return RAW_FALLBACK;
}

function defaultBranch() {
  try {
    const b = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (b && b !== 'HEAD') return b;
  } catch { /* fall through */ }
  try { return git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, ''); } catch { /* fall through */ }
  return 'main';
}

// Relative image links -> raw.githubusercontent.com links in the HTB repo
function makeRawUrl(url, fileRel, branch) {
  const u = url.trim();
  if (!u || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u)) return url;
  const m = u.match(/^([^?#]*)(.*)$/);
  let path = m[1];
  try { path = decodeURI(path); } catch { /* keep as is */ }
  const resolved = posix.normalize(posix.join(posix.dirname(fileRel), path));
  if (resolved.startsWith('..') || resolved.startsWith('/')) return url;
  return `${rawBase()}/${encodeURIComponent(branch)}/${resolved.split('/').map(encodeURIComponent).join('/')}${m[2]}`;
}

function rewriteImage(token, fileRel, branch) {
  if (token.startsWith('!')) {
    return token.replace(/^(!\[[^\]]*\]\()\s*(<[^>]+>|[^)\s]+)([\s\S]*)$/, (all, head, target, tail) =>
      head + makeRawUrl(target.replace(/^<|>$/g, ''), fileRel, branch) + tail);
  }
  return token.replace(/(\bsrc\s*=\s*)(["'])(.*?)\2/i, (all, head, q, url) => head + q + makeRawUrl(url, fileRel, branch) + q);
}

// Any standalone 32-character hex string (HTB flags, MD5 hashes) is hidden.
const redact = (text) => text.replace(/(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/gi, '[redacted]');

function processBody(body, fileRel, branch) {
  const IMG = /(!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>)/gi;
  return body.split(IMG).map((part, i) => (i % 2 ? rewriteImage(part, fileRel, branch) : redact(part))).join('');
}

function main() {
  if (!existsSync(join(SRC, BASE_DIR))) {
    console.warn(`import-htb: ${BASE_DIR} folder not found in .htb-writeups. Skipping (the site builds with local writeups only).`);
    return;
  }
  mkdirSync(OUT, { recursive: true });

  // Remove files from an earlier run, never hand-written ones
  for (const f of readdirSync(OUT)) {
    if (!/^htb-.*\.md$/.test(f)) continue;
    try { if (readFileSync(join(OUT, f), 'utf8').includes(MARK)) unlinkSync(join(OUT, f)); } catch { /* ignore */ }
  }

  let exclude = [];
  try { exclude = (JSON.parse(readFileSync(CONFIG, 'utf8')).exclude || []).map((p) => toPosix(p).toLowerCase()); }
  catch { console.warn('import-htb: data/htb-publish.json not readable, nothing is excluded.'); }

  const branch = defaultBranch();
  const used = new Set();
  const files = walk(join(SRC, BASE_DIR)).sort();
  let written = 0, skipped = 0;

  for (const abs of files) {
    const fileRel = toPosix(abs.slice(SRC.length + 1)); // HackTheBox/Easy/Cap.md
    if (exclude.includes(fileRel.toLowerCase())) { skipped++; console.log(`  excluded: ${fileRel}`); continue; }

    const parts = fileRel.split('/').slice(1); // [Easy, Cap.md] or [Hard, NanoCorp, README.md]
    const fileName = parts[parts.length - 1];
    const folders = parts.slice(0, -1);
    const levelKey = (folders[0] || '').toLowerCase();
    const difficulty = LEVELS[levelKey] || 2;
    const isFortress = levelKey === 'fortresses';
    const subFolder = folders.length > 1 ? folders[folders.length - 1] : '';

    // A file named README/index inside a folder is named after the folder
    let display = GENERIC.test(fileName.replace(/\.md$/i, '')) ? (subFolder || cleanName(fileName)) : cleanName(fileName);
    if (subFolder && !GENERIC.test(fileName.replace(/\.md$/i, '')) && !display.toLowerCase().includes(subFolder.toLowerCase())) {
      display = `${subFolder} ${display}`;
    }

    const raw = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const { meta, body: rawBody } = parseFrontMatter(raw);
    const h1 = rawBody.match(/^#[ \t]+(.+)$/m);
    const title = redact(oneLine(meta.title || (h1 ? stripMd(h1[1]) : '') || display));

    let slug = 'htb-' + kebab(display);
    if (used.has(slug) || existsSync(join(OUT, slug + '.md'))) {
      if (existsSync(join(OUT, slug + '.md')) && !used.has(slug)) {
        // a hand-written writeup with this slug already exists, so it wins
        skipped++; console.log(`  skipped (local file wins): ${slug}`); continue;
      }
      slug = `htb-${kebab(folders[0] || 'x')}-${kebab(display)}`;
      if (used.has(slug)) { skipped++; console.warn(`  skipped (duplicate slug): ${fileRel}`); continue; }
    }
    used.add(slug);

    const body = processBody(rawBody, fileRel, branch).replace(/^\n+/, '');
    const lower = rawBody.toLowerCase();
    const count = (w) => (lower.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
    const tags = ['htb', isFortress ? 'fortress' : (LEVEL_NAMES[difficulty] || 'medium').toLowerCase()];
    if (count('windows') >= 3) tags.push('windows');
    if (count('linux') >= 3) tags.push('linux');
    if (/half|incomplete|wip/i.test(fileName)) tags.push('incomplete');

    // The summary is shown on the list page and in the RSS feed, so hide hashes there too
    const summary = redact(oneLine(meta.summary || firstParagraph(rawBody) ||
      (isFortress ? 'Hack The Box Fortress writeup.' : `Hack The Box ${LEVEL_NAMES[difficulty]} machine writeup.`)));

    const front = [
      '---',
      `title: ${title}`,
      `date: ${meta.date || firstCommitDate(fileRel)}`,
      `category: ${meta.category || (isFortress ? 'Fortress' : 'Machine')}`,
      `platform: ${meta.platform || 'HackTheBox'}`,
      `difficulty: ${difficulty}`,
      `tags: [${(meta.tags ? meta.tags.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim()).filter(Boolean) : tags).join(', ')}]`,
      `summary: ${summary}`,
      MARK,
      '---',
      ''
    ].join('\n');

    writeFileSync(join(OUT, slug + '.md'), front + '\n' + body);
    written++;
    console.log(`  ${slug}.md  <-  ${fileRel}`);
  }
  console.log(`import-htb: wrote ${written} writeup(s), skipped ${skipped}.`);
}

try {
  main();
} catch (error) {
  console.warn('import-htb: something went wrong, continuing without it:', error.message);
}
process.exitCode = 0;
