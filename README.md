# Site Name — Pure Static Personal Blog

A minimal, framework-free personal blog built with plain HTML, CSS, and JavaScript. The site is designed for Cloudflare Pages and GitHub, with Markdown posts stored in the repository and rendered in the browser on `post.html?slug=...`.

## Stack

There is no backend, database, npm install step, bundler, or framework. The browser uses pinned CDN versions of marked.js, DOMPurify, Fuse.js, js-yaml, highlight.js, and marked-highlight. Markdown is rendered client-side, then sanitized with DOMPurify before being inserted into the document.

Current CDN pins used in the repository:

- `marked@15.0.12`
- `marked-highlight@2.2.4`
- `DOMPurify@3.4.14`
- `Fuse.js@7.1.0`
- `js-yaml@4.1.0`
- `highlight.js@11.11.1`

All third-party JavaScript uses `defer`. Highlight.js uses the GitHub theme, while the site's own CSS switches the surrounding code block to the black-and-white visual system.

## Directory structure

```text
/
├── index.html
├── post.html
├── search.html
├── about.html
├── 404.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── post.js
│   └── search.js
├── content/
│   └── posts/
│       ├── hello-world.md
│       └── second-post.md
├── data/
│   ├── posts.json
│   ├── feed.xml
│   └── sitemap.xml
├── _headers
├── _redirects
├── .github/
│   └── workflows/
│       └── build.yml
└── README.md
```

`data/posts.json`, `data/feed.xml`, and `data/sitemap.xml` are generated files. Do not hand-edit them in normal operation.

## Before publishing

Edit the `SITE_URL` and `SITE_NAME` values in `.github/workflows/build.yml`. The example value is `https://your-domain.example`; replace it with your real canonical domain, without a trailing slash.

You can also replace the placeholder Site Name and the placeholder About page copy in the HTML files.

## Writing a post

Create a Markdown file in `content/posts/` with an English slug using lowercase letters, numbers, and hyphens only:

```markdown
---
title: "Hello World"
date: 2026-01-15
tags: [life, note]
summary: "A short description for listing and SEO."
draft: false
lang: en
---

Your Markdown content goes here.
```

Keep `draft: true` on unfinished posts. The GitHub Actions workflow skips them automatically, so a half-finished article cannot appear in `posts.json`, RSS, or the sitemap.

The `lang` field is reserved for future i18n work. It is not currently required by the browser renderer, but keeping it in frontmatter makes a later `/en/post.html?slug=...` and `/zh/post.html?slug=...` structure easier to introduce.

Use standard Markdown/GFM only. Do not put raw HTML into article files.

For images, use an absolute URL from your image host, or an absolute site path such as `/static/images/example.png`. Do not use relative paths such as `images/example.png` because the article is displayed at `post.html?slug=...` and the browser would resolve a relative image URL against the wrong location.

## Publishing workflow

1. Create or edit a `.md` post in `content/posts/`.
2. `git add`, `git commit`, and `git push` to `main`.
3. GitHub Actions parses published frontmatter, rebuilds `posts.json`, generates RSS and sitemap files, and commits those generated files.
4. Cloudflare Pages detects the new repository state and deploys the static site.

The workflow uses the built-in `GITHUB_TOKEN` from `actions/checkout@v4`; no Personal Access Token is required. GitHub documents that events caused by `GITHUB_TOKEN` do not create another workflow run for normal push-triggered workflows, so the generated-data commit does not create an infinite build loop.

## Cloudflare Pages deployment

In Cloudflare:

1. Go to **Workers & Pages → Create → Connect to Git**.
2. Select the GitHub repository.
3. Choose **Framework preset: None**.
4. Set **Build command** to `exit 0`.
5. Set **Build output directory** to `.`.
6. Attach the custom domain. Cloudflare will provide HTTPS for the domain.

The repository already contains `_headers` and `_redirects`, so Cloudflare Pages can apply the intended caching and 404 behavior without a server function.

## Caching behavior

`_headers` gives versioned/static assets long-lived immutable caching while keeping HTML and generated data fresh:

```text
/*.js         Cache-Control: public, max-age=31536000, immutable
/*.css        Cache-Control: public, max-age=31536000, immutable
/*.woff2      Cache-Control: public, max-age=31536000, immutable
/data/*       Cache-Control: no-cache
/post.html    Cache-Control: no-cache
/index.html   Cache-Control: no-cache
```

When you change `style.css` or one of the first-party JavaScript files, update the `?v=` query string in the HTML files (or change the asset path) so the long cache does not retain an old copy.

## Search behavior

The index page uses Fuse.js for real-time filtering. The configuration gives title the highest weight, followed by tags and summary, and enables `includeMatches` so matching fragments can be rendered with `<mark>`.

Chinese search is handled with a custom tokenizer based on `/[一-龥a-zA-Z0-9]+/g`, with:

- `ignoreLocation: true`
- `minMatchCharLength: 2`
- `threshold: 0.3`

The first `postsPerPage` posts are rendered on the home page. Scrolling near the bottom automatically appends another `postsPerPage` posts without making another network request.

For a much larger archive, Pagefind is a possible future upgrade. It still fits a static deployment model but would build a precomputed client-side search index during CI.

## Markdown rendering and security

`post.html` reads the `slug` query parameter, validates the slug shape, fetches `content/posts/<slug>.md`, parses its YAML frontmatter in the browser with js-yaml, and passes the Markdown body through marked.js. The resulting HTML is sanitized with DOMPurify before insertion into the page.

External links are automatically given `target="_blank" rel="noopener"`. Images receive `loading="lazy"` and a safe `alt` attribute. Code blocks are highlighted with highlight.js through marked-highlight and receive a copy button with a Clipboard API implementation plus an older `document.execCommand('copy')` fallback.

The current Markdown contract intentionally excludes raw HTML from article content.

## Accessibility

The site includes semantic `nav`, `main`, and `footer` landmarks; a `Skip to content` link; visible `:focus-visible` outlines; touch targets of at least 44×44px for interactive controls; and a mobile menu that locks body scrolling while open and restores the previous scroll position when closed.

The mobile search page is a dedicated, full-screen-style fallback, while the desktop navigation exposes search directly as an icon link.

## Dark mode

The first load follows `prefers-color-scheme`. A manual light/dark toggle is available in the navigation. Once the visitor explicitly switches themes, the selection is stored in `localStorage` and takes priority over system preference.

## Reserved enhancement points

The first version intentionally leaves clear TODO points for:

- Umami or Plausible analytics.
- Giscus comments backed by GitHub Discussions.
- PWA `manifest.json` and a service worker.
- KaTeX for math.
- Buttondown or ConvertKit newsletter forms.
- Future bilingual routing and `lang`-aware URLs.

These are placeholders only; the current project remains a pure static deployment with no application backend.

## Local preview

Because browsers can restrict `fetch()` of local Markdown files under `file://`, preview the project with a simple static file server during development. Python is enough:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

This local server is only a development convenience. Production is still served as ordinary static files from Cloudflare Pages.


## Site configuration

The hand-maintained `config.json` contains the site's runtime configuration. It is committed to the repository and must **not** be added to `.gitignore`.

```json
{
  "siteName": "Site Name",
  "siteDescription": "A minimal personal blog about technology, experiments, notes, and the web.",
  "navItems": [
    { "label": "Posts", "url": "./index.html" },
    { "label": "About", "url": "./about.html" },
    { "label": "Search", "url": "./search.html", "icon": "search" },
    { "label": "RSS", "url": "{rssPath}", "icon": "rss" }
  ],
  "postsPerPage": 20,
  "footerText": "Built with plain HTML, CSS & JavaScript.",
  "aboutContent": "<p>...</p>",
  "socialLinks": [],
  "rssPath": "/data/feed.xml",
  "searchPlaceholder": "Search articles...",
  "darkModeDefault": false
}
```

Pages fetch `config.json` in the browser and fall back to the same default values stored in `js/app.js` if the file cannot be loaded. `darkModeDefault` controls the first-visit theme when no manual theme exists in `localStorage`; a visitor's manual light/dark choice always takes priority.

The home page now uses a 20-post infinite scroll. It renders the first batch immediately after `posts.json` is loaded, observes a bottom sentinel, and automatically appends subsequent batches. There is no `Load More` button.

Search behavior is shared by `index.html` and `search.html` through the `BlogSearch` utilities exposed by `js/app.js`. Both pages use the same Fuse.js options, tokenizer, date formatter, and `<mark>` highlighting.

