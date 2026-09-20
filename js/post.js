(() => {
  'use strict';

  const root = document.querySelector('#post-root');
  if (!root) return;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function setMeta(selector, content) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute('content', content);
  }

  function setArticleMeta(frontmatter, config) {
    const title = String(frontmatter.title || 'Article');
    const summary = String(frontmatter.summary || '');
    const fullTitle = `${title} — ${config.siteName}`;
    const url = window.location.href;

    document.title = fullTitle;
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      summary || config.siteDescription
    );

    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', summary || config.siteDescription);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:site_name"]', config.siteName);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', summary || config.siteDescription);
  }

  function splitFrontmatter(source) {
    const normalized = source
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n');

    if (!normalized.startsWith('---\n')) {
      return {
        data: {},
        content: normalized
      };
    }

    const end = normalized.indexOf('\n---', 4);

    if (end === -1) {
      return {
        data: {},
        content: normalized
      };
    }

    const yamlText = normalized.slice(4, end).trim();
    const content = normalized.slice(end + 4).replace(/^\n+/, '');

    return {
      data: window.jsyaml.load(yamlText) || {},
      content
    };
  }

  function makeRenderer() {
    const renderer = new marked.Renderer();

    renderer.link = function(token) {
      const href = String(token.href || '');
      const title = token.title
        ? ` title="${escapeHtml(token.title)}"`
        : '';

      const text = this.parser.parseInline(token.tokens || []);
      const external = /^https?:\/\//i.test(href);
      const attrs = external
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';

      return `<a href="${escapeHtml(href)}"${title}${attrs}>${text}</a>`;
    };

    renderer.image = function(token) {
      const href = String(token.href || '');
      const alt = String(token.text || '');
      const title = token.title
        ? ` title="${escapeHtml(token.title)}"`
        : '';

      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" loading="lazy"${title}>`;
    };

    renderer.code = function(token) {
      const langRaw = String(token.lang || '').split(/\s+/)[0];
      const lang = langRaw || 'text';
      const highlighted = token.text || '';
      const langClass = langRaw
        ? `language-${escapeHtml(langRaw)}`
        : '';

      return `<div class="code-wrap">
        <span class="code-lang">${escapeHtml(lang)}</span>
        <button class="copy-code" type="button" data-copy-code>Copy</button>
        <pre><code class="hljs ${langClass}">${highlighted}</code></pre>
      </div>`;
    };

    return renderer;
  }

  function configureMarked() {
    if (!window.marked || !window.markedHighlight || !window.hljs) {
      throw new Error('Markdown dependencies failed to load.');
    }

    const { Marked } = window.marked;

    const extension = window.markedHighlight.markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'language-',

      highlight(code, lang) {
        const language =
          lang && window.hljs.getLanguage(lang)
            ? lang
            : 'plaintext';

        return window.hljs.highlight(code, {
          language
        }).value;
      }
    });

    const instance = new Marked(extension);

    instance.use({
      gfm: true,
      renderer: makeRenderer()
    });

    return instance;
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.select();

    let success = false;

    try {
      success = document.execCommand('copy');
    } catch (_) {
      success = false;
    }

    textarea.remove();

    return success;
  }

  async function copyCode(button) {
    const code = button
      .closest('.code-wrap')
      ?.querySelector('code');

    if (!code) return;

    const text = code.textContent || '';
    let success = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (_) {}

    if (!success) {
      success = fallbackCopy(text);
    }

    const original = button.textContent;

    button.textContent = success
      ? 'Copied'
      : 'Copy failed';

    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }

  function enhanceCodeButtons() {
    root.querySelectorAll('.copy-code').forEach(button => {
      button.addEventListener('click', () => copyCode(button));
    });
  }

  function showNotFound(config) {
    document.title = `Article not found — ${config.siteName}`;

    setMeta(
      'meta[name="description"]',
      `Article not found — ${config.siteName}`
    );

    setMeta(
      'meta[property="og:title"]',
      `Article not found — ${config.siteName}`
    );

    setMeta(
      'meta[property="og:description"]',
      `Article not found — ${config.siteName}`
    );

    setMeta(
      'meta[property="og:url"]',
      window.location.href
    );

    root.innerHTML = `<div class="empty-page">
      <section>
        <p class="error-code">404</p>
        <h1>Article not found</h1>
        <p>The article could not be loaded. It may have been moved, renamed, or still be a draft.</p>
        <a class="text-link" href="./index.html">Back to Posts</a>
      </section>
    </div>`;
  }

  function showGenericError() {
    root.innerHTML = '<div class="status-box"><p>Failed to load this article.</p><p><a href="./index.html">Back to Posts</a></p></div>';
  }

  function formatDate(value) {
    if (!value) return '';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
  }

  async function loadArticle(config) {
    const slugRaw = new URLSearchParams(
      window.location.search
    ).get('slug');

    const slug =
      slugRaw &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugRaw)
        ? slugRaw
        : null;

    if (!slug) {
      showNotFound(config);
      return;
    }

    try {
      // Articles are stored in the root /posts/ directory.
      const response = await fetch(
        `./posts/${encodeURIComponent(slug)}.md`,
        {
          cache: 'no-store'
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          showNotFound(config);
        } else {
          showGenericError();
        }

        return;
      }

      const source = await response.text();
      const { data, content } = splitFrontmatter(source);

      if (data.draft === true) {
        showNotFound(config);
        return;
      }

      const title = String(
        data.title || 'Untitled'
      );

      const summary = String(
        data.summary || ''
      );

      const tags = Array.isArray(data.tags)
        ? data.tags.map(String)
        : [];

      setArticleMeta(data, config);

      const renderer = configureMarked();
      const rendered = renderer.parse(content);

      const safe = window.DOMPurify.sanitize(
        rendered,
        {
          USE_PROFILES: {
            html: true
          },
          ADD_ATTR: [
            'target',
            'rel',
            'loading'
          ]
        }
      );

      root.innerHTML = `
        <a class="post-back" href="./index.html">
          ← Back to Posts
        </a>

        <header class="article-header">
          <p class="eyebrow">Article</p>

          <h1>${escapeHtml(title)}</h1>

          ${
            summary
              ? `<p class="article-summary">${escapeHtml(summary)}</p>`
              : ''
          }

          <div class="article-meta">
            <time datetime="${escapeHtml(data.date || '')}">
              ${escapeHtml(formatDate(data.date))}
            </time>

            ${
              tags.length
                ? `
                  <span aria-hidden="true">·</span>
                  <span class="article-tags">
                    ${tags
                      .map(
                        tag =>
                          `<span class="article-tag">${escapeHtml(tag)}</span>`
                      )
                      .join('')}
                  </span>
                `
                : ''
            }
          </div>
        </header>

        <div class="article-content prose">
          ${safe}
        </div>
      `;

      enhanceCodeButtons();

      window.scrollTo(0, 0);

      // TODO: Giscus can be mounted after .article-content when comments are enabled.
      // TODO: KaTeX can be enabled here when mathematical notation is needed.

    } catch (error) {
      console.error('Failed to load article:', error);
      showGenericError();
    }
  }

  window.siteConfigPromise
    .then(loadArticle)
    .catch(() => {
      loadArticle({
        siteName: 'Site Name',
        siteDescription:
          'A minimal personal blog about technology, experiments, notes, and the web.'
      });
    });
})();
