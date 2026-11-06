# Vishal Mani Portfolio

A complete, data-driven personal portfolio website with auto-update from GitHub.

**Live URL:** https://vishalmani-11.github.io
**GitHub Repo:** vishalmani-11/vishalmani-11.github.io

---

## Setup

### 1. Create or use the repository

Create a repository named `vishalmani-11.github.io` or use the existing one.

### 2. Enable GitHub Pages via Actions

Go to: **Settings > Pages > Source** and select **"GitHub Actions"**

### 3. Run the workflow

- Go to the **Actions** tab
- Select the "Deploy Portfolio to GitHub Pages" workflow
- Click **"Run workflow"** to trigger it manually

The workflow will:
- Build writeups.json from your .md files
- Fetch your GitHub data
- Deploy the site

### 4. Edit your data

Edit these files with your real information:
- `data/profile.json` - Your name, bio, email, LinkedIn, location, education, skills, languages, interests
- `data/projects.json` - Your projects and repositories
- `data/achievements.json` - Your achievements and certificates

Add your own writeups:
1. Create a file in `writeups/<slug>.md`
2. Use the format from `writeups/_template.md`
3. The `build-site.mjs` script will automatically include it

Files starting with `_` are ignored.

### 5. Add a custom domain (optional)

1. Purchase a domain
2. Create a CNAME record pointing to `vishalmani-11.github.io`
3. In **Settings > Pages**, enter your custom domain
4. Enable HTTPS in the same settings

---

## Important Notes

**GitHub pauses scheduled workflows after 60 days without repository activity.**

To keep auto-updates working:
- Push a small change every 60 days, or
- Manually run the workflow from the Actions tab

---

## Project Structure

```
vishalmani-11.github.io/
├── index.html              # Home page
├── projects.html           # All projects page
├── writeups.html           # All writeups page
├── writeup.html            # Writeup reader
├── 404.html                # Custom 404 page
├── style.css               # Styles (Twilight theme)
├── main.js                 # Main JavaScript
├── data/
│   ├── profile.json        # Your profile data
│   ├── projects.json       # Your projects
│   ├── achievements.json   # Your achievements
│   ├── github.json         # Generated GitHub data
│   └── writeups.json       # Generated from .md files
├── writeups/
│   ├── *.md                # Your writeups
│   └── _template.md        # Writeup template
├── scripts/
│   ├── fetch-github.mjs    # Fetches GitHub data
│   └── build-site.mjs      # Builds writeups.json, sitemap.xml, feed.xml
└── .github/
    └── workflows/
        └── deploy.yml       # Deployment workflow
```

---

## Features

- **Single theme**: Twilight dark theme
- **Data-driven**: All content from JSON files
- **Auto-update**: GitHub data fetched every 6 hours
- **Writeups system**: Markdown with front matter, syntax highlighting, reading time
- **Projects page**: Search, filter by language/tag, sort by updated/stars
- **Writeups page**: Search, filter by category/difficulty, load more (10 at a time)
- **SEO**: Sitemap, RSS feed, meta tags

---

## Content Guidelines

**Use ONLY real content.** If something is missing:
- Use `TODO` or `[PLACEHOLDER]` in JSON files
- Sample content is marked with `"sample": true` and shows a "Sample" badge
- Sample items are excluded from stats
- Delete sample content before going live

---

## Customization

### profile.json fields
```json
{
  "name": "Your Name",
  "github": "https://github.com/your-username",
  "tagline": "One line about you",
  "bio": "2-3 sentences about you",
  "email": "you@example.com",
  "linkedin": "https://linkedin.com/in/your-username",
  "location": "City, Country",
  "education": { "college": "...", "course": "...", "years": "..." },
  "skills": { "Languages": [...], "Web": [...], "Security": [...], "Tools": [...] },
  "languages": ["English", "Hindi"],
  "interests": ["Web Dev", "Security"],
  "resume": "resume.pdf" or null
}
```

### projects.json fields
```json
{
  "repo": "repository-name",
  "title": "Project Title",
  "summary": "One-line description",
  "difficulty": 1,  // 1=Easy, 2=Medium, 3=Hard, 4=Insane
  "status": "Live", // or "In progress"
  "featured": true,  // Show on home page
  "tags": ["tag1", "tag2"],
  "demo": "https://demo.com" or null,
  "sample": false  // Set to true for sample content
}
```

---

## Local Development

Preview the site:
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Run build scripts:
```bash
# Generate writeups.json, sitemap.xml, feed.xml
node scripts/build-site.mjs

# Fetch GitHub data (requires GITHUB_TOKEN env var)
GITHUB_TOKEN=your_token GH_USER=vishalmani-11 node scripts/fetch-github.mjs
```

---

## Security

- All markdown content is sanitized with DOMPurify
- External links use `rel="noopener noreferrer"`
- No tracking or analytics
- README, scripts, templates, and backups are NOT published to the live site

---

## License

MIT License
