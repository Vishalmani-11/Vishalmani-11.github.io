/**
 * build-site.mjs - Build writeups.json, sitemap.xml, feed.xml
 * Node 20, no dependencies
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

const ROOT = process.cwd();
const WRITEUPS_DIR = `${ROOT}/writeups`;
const DATA_DIR = `${ROOT}/data`;
const SITE_URL = 'https://VishalM.github.io';

async function main() {
  try {
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });

    const files = await readdir(WRITEUPS_DIR);
    const writeupFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'));

    const writeups = [];
    for (const file of writeupFiles) {
      try {
        const content = await readFile(`${WRITEUPS_DIR}/${file}`, 'utf-8');
        const writeup = parseWriteup(file, content);
        if (writeup) writeups.push(writeup);
      } catch (e) {
        console.warn(`Error processing ${file}:`, e.message);
      }
    }

    writeups.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Write writeups.json as a direct array (not wrapped in {data: ...})
    await writeFile(`${DATA_DIR}/writeups.json`, JSON.stringify(writeups, null, 2));
    console.log(`Generated writeups.json with ${writeups.length} writeups`);

    await writeFile('sitemap.xml', generateSitemap(writeups));
    console.log('Generated sitemap.xml');

    await writeFile('feed.xml', generateFeed(writeups));
    console.log('Generated feed.xml');

  } catch (e) {
    console.error('Build failed:', e.message);
    process.exitCode = 1;
  }
}

function parseWriteup(filename, content) {
  const slug = filename.replace('.md', '');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    console.warn(`Missing front matter in ${filename}`);
    return null;
  }

  const fm = {};
  for (const line of match[1].split('\n')) {
    const ci = line.indexOf(':');
    if (ci > 0) {
      const key = line.slice(0, ci).trim();
      let value = line.slice(ci + 1).trim();
      
      // Parse different value types
      if (value.startsWith('[') && value.endsWith(']')) {
        try { 
          value = JSON.parse(value); 
        } catch { 
          value = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean); 
        }
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(value)) {
        value = Number(value);
      }
      
      fm[key] = value;
    }
  }

  if (!fm.title) console.warn(`Missing title in ${filename}`);
  if (!fm.date) console.warn(`Missing date in ${filename}`);

  // Ensure sample flag is set correctly
  const isSample = fm.sample === true;
  
  return { slug, ...fm, sample: isSample };
}

function generateSitemap(writeups) {
  const urls = [
    { loc: SITE_URL, changefreq: 'daily', priority: 1.0 },
    { loc: `${SITE_URL}/index.html`, changefreq: 'daily', priority: 1.0 },
    { loc: `${SITE_URL}/projects.html`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${SITE_URL}/writeups.html`, changefreq: 'weekly', priority: 0.8 }
  ];
  writeups.forEach(w => urls.push({
    loc: `${SITE_URL}/writeup.html?slug=${w.slug}`,
    changefreq: 'weekly',
    priority: 0.7
  }));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

function generateFeed(writeups) {
  const latest = writeups.slice(0, 20);
  const lastUpdated = latest[0]?.date || new Date().toISOString();
  const items = latest.map(w => {
    const date = w.date ? new Date(w.date).toISOString() : new Date().toISOString();
    const desc = escapeXml(w.summary || '');
    const title = escapeXml(w.title || 'Untitled');
    const link = `${SITE_URL}/writeup.html?slug=${w.slug}`;
    const category = escapeXml(w.category || 'Uncategorized');
    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${desc}</description>
      <pubDate>${date}</pubDate>
      <category>${category}</category>
      <guid>${link}</guid>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vishal Mani Writeups</title>
    <link>${SITE_URL}/</link>
    <description>Security CTF writeups by Vishal Mani</description>
    <language>en-US</language>
    <pubDate>${new Date(lastUpdated).toISOString()}</pubDate>
    <lastBuildDate>${new Date().toISOString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

function escapeXml(t) {
  return (t || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main();
