const $ = id => document.getElementById(id);
const get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

(async () => {
  const [profile, projects, writeups] = await Promise.all([get('data/profile.json'), get('data/projects.json'), get('data/writeups.json')]);

  if (profile) {
    if (profile.email) $('email-btn').href = 'mailto:' + profile.email;
    if (profile.linkedin) $('linkedin-btn').href = profile.linkedin;
    if (profile.github) $('github-btn').href = profile.github;
    if (profile.location) $('loc').textContent = profile.location;
    if (profile.resume) { const r = $('resume-btn'); r.href = profile.resume; r.hidden = false; }
  }

  if (projects) {
    $('proj-count').textContent = projects.length;
    const grid = $('projects-grid');
    projects.filter(p => p.featured).slice(0, 4).forEach((p, i) => {
      const a = el('a', 'card pc');
      a.href = p.demo || ('https://github.com/vishalmani-11/' + p.repo);
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      const t = el('div', 't');
      t.style.background = `linear-gradient(135deg, hsl(${(i * 47 + 260) % 360} 45% 34%), hsl(${(i * 47 + 310) % 360} 45% 14%))`;
      t.append(el('b', '', (p.title || '?').trim().slice(0, 2)), el('i', '', (p.tags && p.tags[0]) || 'Project'));
      const b = el('div', 'b');
      b.append(el('h3', '', p.title || 'Untitled'), el('p', '', p.summary || ''));
      a.append(t, b);
      grid.append(a);
    });
  }

  if (writeups) {
    const list = $('writeups-list');
    writeups.slice(0, 3).forEach(w => {
      const a = el('a', 'row');
      a.href = 'writeup.html?slug=' + encodeURIComponent(w.slug);
      const d = el('div');
      d.append(el('h3', '', w.title), el('span', '', w.summary || ''));
      a.append(d, el('span', 'tag', (w.platform === 'HackTheBox' ? 'HTB' : w.platform || '') + ' ' + (w.category || '')));
      list.append(a);
    });
  }
})();

(async () => {
  const p = await get('data/profile.json');
  const box = document.getElementById('skills-list');
  if (p && p.skills && box) {
    Object.entries(p.skills).filter(([, v]) => v.length).forEach(([k, list]) => {
      const row = el('div', 'chips'); row.append(el('h3', '', k));
      list.forEach(s => row.append(el('span', 'chip', s)));
      box.append(row);
    });
  }
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  document.querySelectorAll('section').forEach(s => { s.classList.add('rv'); io.observe(s); });
})();
