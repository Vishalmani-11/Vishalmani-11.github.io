/**
 * fetch-github.mjs - Fetch GitHub data
 * Node 20, no dependencies
 * On ANY error: keep existing file and exit 0
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const USER = process.env.GH_USER || 'vishalmani-11';
const OUT_DIR = 'data';
const OUT_FILE = `${OUT_DIR}/github.json`;
const API_BASE = 'https://api.github.com';
const EXCLUDE_REPOS = ['vishalmani-11.github.io'];

const token = process.env.GITHUB_TOKEN;
const headers = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
};

async function api(url) {
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    console.warn('Rate limited; keeping existing github.json');
    process.exit(0);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function main() {
  try {
    if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

    let existing = null;
    if (existsSync(OUT_FILE)) {
      try { existing = await readFile(OUT_FILE, 'utf-8'); }
      catch {}
    }

    const profile = await api(`${API_BASE}/users/${USER}`);
    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const url = `${API_BASE}/users/${USER}/repos?per_page=100&page=${page}&type=owner`;
      const data = await api(url);
      if (!Array.isArray(data) || data.length === 0) { hasMore = false; break; }
      repos.push(...data.filter(r => !EXCLUDE_REPOS.includes(r.name) && !r.fork && !r.archived));
      if (data.length < 100) hasMore = false;
      else page++;
    }

    const reposWithLangs = [];
    for (const repo of repos) {
      try {
        const res = await fetch(repo.languages_url, { headers });
        if (res.ok) {
          const langs = await res.json();
          reposWithLangs.push({ ...repo, languages: langs });
        } else {
          reposWithLangs.push(repo);
        }
        if (res.status === 403 || res.status === 429) {
          console.warn('Rate limited; keeping existing github.json');
          process.exit(0);
        }
      } catch {
        reposWithLangs.push(repo);
      }
    }

    let recent = [];
    try {
      const events = await api(`${API_BASE}/users/${USER}/events/public?per_page=10`);
      recent = events.filter(e => e.type === 'PushEvent').slice(0, 5).map(e => ({
        type: e.type,
        repo: e.repo?.name || 'unknown',
        message: getMessage(e.payload),
        date: e.created_at
      }));
    } catch {}

    const totalStars = reposWithLangs.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const totalForks = reposWithLangs.reduce((s, r) => s + (r.forks_count || 0), 0);

    const data = {
      generatedAt: new Date().toISOString(),
      user: {
        login: profile.login,
        name: profile.name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        followers: profile.followers,
        public_repos: profile.public_repos,
        html_url: profile.html_url
      },
      repos: reposWithLangs,
      totals: { repos: reposWithLangs.length, stars: totalStars, forks: totalForks },
      recent
    };

    await writeFile(OUT_FILE, JSON.stringify(data, null, 2));
    console.log('Successfully updated github.json');

  } catch (e) {
    console.warn('Fetch failed, keeping existing github.json:', e.message);
    process.exit(0);
  }
}

function getMessage(payload) {
  if (!payload?.commits) return 'New commits pushed';
  if (payload.commits.length === 1) return payload.commits[0].message.split('\n')[0];
  return `${payload.commits.length} commits pushed`;
}

main();
