/**
 * Vishal Mani Portfolio - Main JavaScript
 * Handles data loading, rendering, and core functionality
 */

// DOM helpers - expose globally for use in inline scripts
window.$ = window.$ || (id => document.getElementById(id));
window.create = window.create || ((tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.append(...children.flat());
  return el;
});

const $ = id => document.getElementById(id);
const create = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.append(...children.flat());
  return el;
};

// Constants
const LV = ['Easy', 'Medium', 'Hard', 'Insane'];
const DATA_PATH = 'data';

// ============================================
// Difficulty Bars
// ============================================
function difficultyBars(level) {
  const isHard = level > 2;
  return create('span', { class: `df ${isHard ? 'hd' : ''}` }, [
    create('span', { class: 'bars' }, 
      LV.map((_, i) => create('i', { class: i < level ? 'on' : '' }))
    ),
    LV[level - 1] || ''
  ]);
}

// ============================================
// Data Loading
// ============================================
let profileData, projectsData, writeupsData, achievementsData, githubData;

async function loadJSON(file) {
  try {
    const res = await fetch(`${DATA_PATH}/${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Failed to load ${file}:`, e.message);
    return null;
  }
}

async function loadAllData() {
  const [p, pr, w, a, g] = await Promise.all([
    loadJSON('profile.json'),
    loadJSON('projects.json'),
    loadJSON('writeups.json'),
    loadJSON('achievements.json'),
    loadJSON('github.json')
  ]);
  profileData = p; projectsData = pr; achievementsData = a; githubData = g;
  // build-site.mjs writes { data: [...] }. Accept that or a plain list.
  writeupsData = Array.isArray(w) ? w : (w?.data || []);
  // The inner pages (projects, writeups, writeup) read their data from window.
  await ensureGithubRepos();
  Object.assign(window, { profileData, projectsData, writeupsData, achievementsData, githubData });
}

// If data/github.json is empty (the deploy fetch failed, or you are previewing locally),
// load the public repos straight from the GitHub API in the visitor's browser.
async function ensureGithubRepos() {
  if (githubData?.repos?.length) return;
  try {
    const owner = (profileData?.github || 'https://github.com/vishalmani-11').replace(/\/+$/, '').split('/').pop();
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed&type=owner`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!res.ok) return;
    const list = await res.json();
    const repos = list.filter(r => !r.fork && !r.archived && r.name.toLowerCase() !== `${owner.toLowerCase()}.github.io`);
    githubData = { ...(githubData || {}), repos };
  } catch (e) {
    console.warn('GitHub fallback failed:', e.message);
  }
}

// Link to a repo's README on GitHub. Works for any repo name and any capitalisation.
function repoReadmeUrl(name) {
  if (!name) return null;
  const gh = githubData?.repos?.find(r => r.name.toLowerCase() === String(name).toLowerCase());
  const owner = (profileData?.github || 'https://github.com/vishalmani-11').replace(/\/+$/, '');
  return `${gh?.html_url || `${owner}/${encodeURIComponent(name)}`}#readme`;
}

// ============================================
// Render Functions
// ============================================
function renderHero() {
  const tag = $('tagline');
  const footerTag = $('footer-tagline');
  if (tag && profileData?.tagline) {
    // For the hero tagline, use a shorter version if available, or truncate the full tagline
    const shortTagline = profileData.tagline.split('|')[0]?.trim() || profileData.tagline;
    tag.textContent = shortTagline.length > 100 ? shortTagline.substring(0, 100) + '...' : shortTagline;
  }
  if (footerTag && profileData?.tagline) {
    const shortTagline = profileData.tagline.split('|')[0]?.trim() || profileData.tagline;
    footerTag.textContent = shortTagline.length > 80 ? shortTagline.substring(0, 80) + '...' : shortTagline;
  }
}

function renderAbout() {
  const bio = $('bio');
  if (bio && profileData?.bio) {
    const paragraphs = profileData.bio.split('\n').filter(p => p.trim());
    bio.replaceChildren(...paragraphs.map(p => {
      const el = create('p');
      el.textContent = p;
      return el;
    }));
  }

  const education = $('education');
  if (education && profileData?.education) {
    education.textContent = `${profileData.education.college || 'TODO'} | ${profileData.education.course || 'TODO'} | ${profileData.education.years || 'TODO'}`;
  }

  const location = $('location');
  if (location && profileData?.location) location.textContent = profileData.location;

  const languages = $('languages');
  if (languages && profileData?.languages?.length) languages.textContent = profileData.languages.join(', ');

  const interests = $('interests');
  if (interests && profileData?.interests?.length) interests.textContent = profileData.interests.join(', ');
}

function renderSkills() {
  const container = $('skills');
  if (!container || !profileData?.skills) return;

  container.replaceChildren(...Object.entries(profileData.skills).map(([group, items]) => {
    if (!items?.length) return null;
    return create('div', { class: 'skill-group' }, [
      create('h4', {}, group),
      create('div', { class: 'skill-chips' }, 
        items.map(item => create('span', { class: 'skill-chip' }, item))
      )
    ]);
  }).filter(Boolean));
}

function renderStats() {
  const container = $('stats');
  if (!container) return;

  // Count only non-sample projects
  const featuredCount = projectsData?.filter(p => p.featured && !p.sample).length || 0;
  const writeupCount = writeupsData?.filter(w => !w.sample).length || 0;
  const achievementCount = achievementsData?.filter(a => !a.sample).length || 0;
  const tech = new Set();
  projectsData?.filter(p => !p.sample).forEach(p => p.tags?.forEach(t => tech.add(t)));

  container.replaceChildren(...[
    [featuredCount, 'Featured projects'],
    [writeupCount, 'Writeups published'],
    [achievementCount, 'Achievements'],
    [tech.size, 'Technologies used']
  ].map(([n, l]) => create('div', {}, [
    create('b', {}, String(n)),
    create('span', {}, l)
  ])));

  const footerStats = $('footer-stats');
  if (footerStats) {
    footerStats.textContent = `${featuredCount} projects, ${writeupCount} writeups`;
  }
}

function renderProjects() {
  const featured = $('featured-projects');
  const moreList = $('more-repos-list');
  if (!featured) return;

  if (!projectsData) {
    featured.replaceChildren(create('div', { class: 'error-message' }, 'Failed to load projects.'));
    return;
  }

  const featuredProjects = projectsData.filter(p => p.featured);
  const known = new Set(projectsData.map(p => String(p.repo || '').toLowerCase()));
  const autoRepos = (githubData?.repos || [])
    .filter(r => !known.has(r.name.toLowerCase()))
    .map(r => ({ repo: r.name, title: r.name, summary: r.description || '' }));
  const otherRepos = [...projectsData.filter(p => !p.featured), ...autoRepos];

  // Render featured projects
  featured.replaceChildren(...featuredProjects.map((p, i) => {
    const statusClass = p.status === 'Live' ? '' : 'soon';
    const isSample = p.sample;
    const title = isSample ? create('span', {}, [p.title || 'Untitled', create('span', { class: 'sample-badge' }, 'Sample')]) : p.title || 'Untitled';

    return create('a', {
      class: 'card',
      href: repoReadmeUrl(p.repo) || '#',
      ...(p.repo ? { target: '_blank', rel: 'noopener noreferrer' } : {})
    }, [
      create('div', { class: 'ct' }, [
        create('span', { class: 'n' }, String(i + 1).padStart(2, '0')),
        create('span', { class: `live ${statusClass}` }, [
          create('i', { class: 'led' }),
          p.status || 'Live'
        ])
      ]),
      create('h3', {}, title),
      create('p', {}, p.summary || 'No description'),
      create('div', { class: 'tags' }, (p.tags || []).map(tag => create('i', {}, tag))),
      create('div', { class: 'stt' }, [
        difficultyBars(p.difficulty || 1),
        create('span', {}, 'View')
      ])
    ]);
  }));

  // Render other repos
  if (moreList && otherRepos.length > 0) {
    moreList.replaceChildren(...otherRepos.map(repo => {
      const isSample = repo.sample;
      const title = isSample ? create('span', {}, [repo.title || repo.repo || 'Untitled', create('span', { class: 'sample-badge' }, 'Sample')]) : repo.title || repo.repo || 'Untitled';
      const ghRepo = githubData?.repos?.find(r => r.name.toLowerCase() === String(repo.repo || '').toLowerCase());

      return create('a', {
        class: 'repo-item',
        href: repoReadmeUrl(repo.repo) || '#',
        ...(repo.repo ? { target: '_blank', rel: 'noopener noreferrer' } : {})
      }, [
        create('h4', {}, title),
        create('p', {}, repo.summary || ghRepo?.description || 'No description'),
        create('div', { class: 'stt' }, [
          create('span', {}, ghRepo?.language || ''),
          create('span', {}, `${ghRepo?.stargazers_count || 0} stars`)
        ])
      ]);
    }));
  }
}

function renderWriteups() {
  const container = $('writeups-list');
  if (!container) return;

  if (!writeupsData) {
    container.replaceChildren(create('div', { class: 'error-message' }, 'Failed to load writeups.'));
    return;
  }

  const latest = writeupsData.filter(w => !w.sample).slice(0, 5);
  if (latest.length === 0) {
    container.replaceChildren(create('div', { class: 'empty-state' }, [
      create('h3', {}, 'No writeups yet'),
      create('p', {}, 'Writeups will appear here')
    ]));
    return;
  }

  container.replaceChildren(...latest.map(w => {
    const date = w.date ? new Date(w.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
    const isSample = w.sample;
    const title = isSample ? create('span', {}, [w.title || 'Untitled', create('span', { class: 'sample-badge' }, 'Sample')]) : w.title || 'Untitled';

    return create('a', { 
      class: 'row',
      href: `writeup.html?slug=${w.slug}`
    }, [
      create('span', { class: 'd' }, date),
      create('div', {}, [
        create('b', {}, title),
        create('small', {}, w.summary || '')
      ]),
      create('span', { class: 'c' }, w.platform || w.category || 'Uncategorized'),
      difficultyBars(w.difficulty || 1)
    ]);
  }));
}

function renderRecentActivity() {
  const container = $('recent-activity');
  if (!container) return;

  if (!githubData?.recent?.length) {
    container.replaceChildren(create('div', { class: 'empty-state' }, [
      create('h3', {}, 'No recent activity'),
      create('p', {}, 'Activity will appear here after GitHub data is fetched')
    ]));
    return;
  }

  container.replaceChildren(...githubData.recent.map(a => {
    const date = a.date ? new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
    return create('div', { class: 'row' }, [
      create('span', { class: 'd' }, date),
      create('div', {}, [
        create('b', {}, a.message || a.type || 'Activity'),
        create('small', {}, a.repo || '')
      ])
    ]);
  }));
}

function renderAchievements() {
  const container = $('achievements-list');
  if (!container) return;

  if (!achievementsData) {
    container.replaceChildren(create('div', { class: 'error-message' }, 'Failed to load achievements.'));
    return;
  }

  const validAchievements = achievementsData.filter(a => !a.sample);
  if (validAchievements.length === 0) {
    container.replaceChildren(create('div', { class: 'empty-state' }, [
      create('h3', {}, 'No achievements yet'),
      create('p', {}, 'Achievements will appear here')
    ]));
    return;
  }

  container.replaceChildren(...validAchievements.map(a => {
    const link = a.link ? create('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer' }, a.title) : create('b', {}, a.title);
    return create('div', { class: 'op' }, [
      create('span', { class: 'y' }, a.year || '???'),
      link,
      create('span', {}, a.detail || '')
    ]);
  }));
}

function renderContact() {
  const emailBtn = $('email-btn');
  const linkedinBtn = $('linkedin-btn');
  const resumeBtn = $('resume-btn');
  const footerGithub = $('footer-github');
  const footerLinkedin = $('footer-linkedin');
  const footerEmail = $('footer-email');

  if (emailBtn && profileData?.email) {
    emailBtn.href = `mailto:${profileData.email}`;
    emailBtn.textContent = 'Email me';
  } else if (emailBtn) {
    emailBtn.href = '#';
    emailBtn.textContent = 'Email';
  }

  if (linkedinBtn && profileData?.linkedin) {
    linkedinBtn.href = profileData.linkedin;
    linkedinBtn.textContent = 'LinkedIn';
  } else if (linkedinBtn) {
    linkedinBtn.href = '#';
    linkedinBtn.textContent = 'LinkedIn';
  }

  if (resumeBtn) {
    if (profileData?.resume) {
      resumeBtn.href = profileData.resume;
      resumeBtn.textContent = 'Resume';
    } else {
      resumeBtn.removeAttribute('href');
      resumeBtn.removeAttribute('target');
      resumeBtn.setAttribute('aria-disabled', 'true');
      resumeBtn.classList.add('disabled');
      resumeBtn.textContent = 'Resume (coming soon)';
    }
    resumeBtn.hidden = false;
  }

  if (footerGithub) {
    footerGithub.href = profileData?.github || 'https://github.com/vishalmani-11';
    footerGithub.textContent = 'GitHub';
  }

  if (footerLinkedin) {
    footerLinkedin.href = profileData?.linkedin || '#';
    footerLinkedin.textContent = 'LinkedIn';
  }

  if (footerEmail) {
    footerEmail.href = profileData?.email ? `mailto:${profileData.email}` : '#';
    footerEmail.textContent = 'Email';
  }
}

// ============================================
// Toggle More Repos
// ============================================
function toggleMoreRepos() {
  const list = $('more-repos-list');
  const btn = list?.previousElementSibling;
  if (list) {
    list.hidden = !list.hidden;
    if (btn) btn.textContent = list.hidden ? 'More repositories' : 'Hide repositories';
  }
}

// ============================================
// Network Canvas
// ============================================
function initNetworkCanvas() {
  const canvas = document.getElementById('net');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height, points = [];
  let rafId = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    points = Array.from({ length: Math.min(70, Math.floor(W / 16)) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    points.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    const cg = getComputedStyle(document.documentElement).getPropertyValue('--g').trim();
    const cr = getComputedStyle(document.documentElement).getPropertyValue('--r').trim();

    points.forEach((a, i) => {
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j], d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (d < 15000) {
          ctx.globalAlpha = 0.25 * (1 - d / 15000);
          ctx.strokeStyle = cg;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = i % 9 ? 0.7 : 1;
      ctx.fillStyle = i % 9 ? cg : cr;
      const s = i % 9 ? 2 : 3;
      ctx.fillRect(a.x - s/2, a.y - s/2, s, s);
    });

    if (!reducedMotion) rafId = requestAnimationFrame(draw);
  }

  window.redraw = () => {
    if (rafId) cancelAnimationFrame(rafId);
    draw();
  };

  resize(); draw();
  window.addEventListener('resize', () => { resize(); if (reducedMotion) redraw(); });
}

// ============================================
// Scroll Spy
// ============================================
function initScrollSpy() {
  const sections = ['top', 'about', 'projects', 'writeups', 'activity', 'achievements', 'contact'];
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.item[data-s]').forEach(item => {
          item.classList.toggle('on', item.dataset.s === e.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(id => {
    const el = $(id);
    if (el) io.observe(el);
  });
}

// ============================================
// Hero terminal: shows my real latest pushes and writeups
// ============================================
function timeAgo(iso) {
  const t = Date.parse(iso);
  if (!t) return '';
  const sec = Math.max(0, (Date.now() - t) / 1000);
  for (const [unit, size] of [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]]) {
    if (sec >= size) return `${Math.floor(sec / size)}${unit} ago`;
  }
  return 'just now';
}

function renderTerminal() {
  const body = $('term-body');
  if (!body) return;
  const trunc = (text, n) => (text || '').split('\n')[0].slice(0, n);
  const generated = githubData?.generatedAt;
  const synced = generated && !generated.startsWith('2026-01-01') ? `synced ${timeAgo(generated)}` : 'waiting for first sync';
  const chips = $('term-chips');
  if (chips) chips.replaceChildren(create('span', {}, '~/portfolio'), create('span', {}, 'branch: main'), create('span', { class: 'v' }, synced));

  let t = 0.3;
  const delay = () => `animation-delay:${t.toFixed(1)}s`;
  const line = (children, cls = '') => {
    body.append(create('div', { class: ('tl ' + cls).trim(), style: delay() }, children));
    t += 0.3;
  };
  const command = (text) => {
    body.append(create('div', { class: 'tl', style: delay() }, [
      create('span', { class: 'mu' }, '$ '),
      create('span', { class: 'ty g', style: delay() }, text)
    ]));
    t += 1.7;
  };

  body.replaceChildren();
  command('git log --oneline -5');
  const recent = (githubData?.recent || []).slice(0, 5);
  if (recent.length) {
    recent.forEach(r => line([
      create('span', { class: 'g' }, trunc(r.repo, 20)), ' ',
      trunc(r.message, 30), ' ',
      create('span', { class: 'mu' }, timeAgo(r.date))
    ]));
  } else {
    line('no public pushes yet. Your next commit will show up here.', 'mu');
  }
  line(' ');
  command('ls writeups | tail -3');
  const latest = (writeupsData || []).filter(w => !w.sample).slice(0, 3);
  if (latest.length) latest.forEach(w => line(`${w.slug}.md`));
  else line('no writeups yet.', 'mu');
  line(' ');
  line([create('span', { class: 'g' }, 'vishal@portfolio'), create('span', { class: 'mu' }, ':~$ '), create('span', { class: 'cur' })]);
}

// ============================================
// Initialize
// ============================================
async function init() {
  await loadAllData();
  // One section failing must not stop the others
  const safe = (fn) => { try { fn(); } catch (e) { console.error(e); } };
  [renderHero, renderTerminal, renderAbout, renderSkills, renderStats, renderProjects, renderWriteups,
   renderRecentActivity, renderAchievements, renderContact, initScrollSpy, initNetworkCanvas].forEach(safe);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
