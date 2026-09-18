(() => {
  'use strict';

  const html = document.documentElement;
  const body = document.body;

  const DEFAULT_CONFIG = Object.freeze({
    siteName: 'Site Name',
    siteDescription: 'A minimal personal blog about technology, experiments, notes, and the web.',
    navItems: [
      { label: 'Posts', url: './index.html', icon: 'file-text' },
      { label: 'About', url: './about.html', icon: 'user' },
      { label: 'Search', url: './search.html', icon: 'search' },
      { label: 'RSS', url: '{rssPath}', icon: 'rss' }
    ],
    postsPerPage: 20,
    footerText: 'Powered By GlintLog.',
    aboutContent: '<p>Welcome to this personal blog.</p>',
    socialLinks: [],
    rssPath: '/data/feed.xml',
    searchPlaceholder: 'Search articles...',
    darkModeDefault: false
  });

  const cloneDefaultConfig = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  function mergeConfig(raw) {
    const base = cloneDefaultConfig();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.siteName === 'string' && raw.siteName.trim()) base.siteName = raw.siteName.trim();
    if (typeof raw.siteDescription === 'string' && raw.siteDescription.trim()) base.siteDescription = raw.siteDescription.trim();

    if (Array.isArray(raw.navItems)) {
      base.navItems = raw.navItems
        .filter(item => item && typeof item.label === 'string' && typeof item.url === 'string')
        .map(item => ({
          label: item.label.trim(),
          url: item.url.trim(),
          icon: typeof item.icon === 'string' ? item.icon.trim().toLowerCase() : ''
        }))
        .filter(item => item.label && item.url);
    }

    if (Number.isInteger(raw.postsPerPage) && raw.postsPerPage > 0) base.postsPerPage = raw.postsPerPage;
    if (typeof raw.footerText === 'string') base.footerText = raw.footerText;
    if (typeof raw.aboutContent === 'string' && raw.aboutContent.trim()) base.aboutContent = raw.aboutContent;

    if (Array.isArray(raw.socialLinks)) {
      base.socialLinks = raw.socialLinks
        .filter(item => item && typeof item.platform === 'string' && typeof item.url === 'string')
        .map(item => ({ platform: item.platform.trim(), url: item.url.trim() }))
        .filter(item => item.platform && item.url);
    }

    if (typeof raw.rssPath === 'string' && raw.rssPath.trim()) base.rssPath = raw.rssPath.trim();
    if (typeof raw.searchPlaceholder === 'string' && raw.searchPlaceholder.trim()) base.searchPlaceholder = raw.searchPlaceholder.trim();
    if (typeof raw.darkModeDefault === 'boolean') base.darkModeDefault = raw.darkModeDefault;

    return base;
  }

  async function loadConfig() {
    try {
      const response = await fetch(`./config.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return mergeConfig(await response.json());
    } catch (_) {
      return cloneDefaultConfig();
    }
  }

  window.siteConfigPromise = loadConfig();

  function getStoredTheme() {
    try {
      const value = localStorage.getItem('theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function getSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolveInitialTheme(config) {
    return getStoredTheme() || (typeof config.darkModeDefault === 'boolean'
      ? (config.darkModeDefault ? 'dark' : 'light')
      : getSystemTheme());
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    html.dataset.theme = nextTheme;

    if (persist) {
      try { localStorage.setItem('theme', nextTheme); } catch (_) {}
    }

    const button = document.querySelector('#theme-toggle');
    if (!button) return;

    const isDark = nextTheme === 'dark';
    const label = isDark ? 'Light Mode' : 'Dark Mode';
    button.setAttribute('aria-label', label);
    button.title = label;
    const text = button.querySelector('.theme-label');
    if (text) text.textContent = label;

    button.querySelector('.icon-sun')?.toggleAttribute('hidden', isDark);
    button.querySelector('.icon-moon')?.toggleAttribute('hidden', !isDark);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function iconFor(item) {
    const label = String(item.label || '').toLowerCase();
    const configured = String(item.icon || '').toLowerCase();
    const defaults = {
      posts: 'file-text',
      about: 'user',
      search: 'search',
      rss: 'rss'
    };
    return configured || defaults[label] || 'circle';
  }

  let runtimeConfig = cloneDefaultConfig();

  function getRuntimeConfig() {
    return runtimeConfig;
  }

  function safeUrl(value) {
    const raw = String(value ?? '').trim().replace('{rssPath}', runtimeConfig.rssPath);
    try {
      const parsed = new URL(raw, window.location.href);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') return raw;
      return './index.html';
    } catch (_) {
      return './index.html';
    }
  }

  function isCurrentPage(url) {
    try {
      const target = new URL(url, window.location.href);
      const current = new URL(window.location.href);
      return target.pathname === current.pathname && target.search === current.search;
    } catch (_) {
      return false;
    }
  }

  function renderNavigation(config) {
    const nav = document.querySelector('#site-nav');
    if (!nav) return;

    const links = config.navItems.map(item => {
      const label = escapeHtml(item.label);
      const href = safeUrl(item.url);
      const icon = escapeHtml(iconFor(item));
      const current = isCurrentPage(href) ? ' aria-current="page"' : '';

      return `<a class="nav-item" href="${escapeHtml(href)}"${current} aria-label="${label}">
        <i class="nav-icon" data-feather="${icon}" aria-hidden="true"></i>
        <span class="nav-label">${label}</span>
      </a>`;
    }).join('');

    nav.innerHTML = `${links}
      <button id="theme-toggle" class="nav-item theme-toggle" type="button" aria-label="Dark Mode" title="Dark Mode">
        <i class="nav-icon icon-sun" data-feather="sun" aria-hidden="true"></i>
        <i class="nav-icon icon-moon" data-feather="moon" aria-hidden="true" hidden></i>
        <span class="nav-label theme-label">Dark Mode</span>
      </button>`;

    if (window.feather?.replace) {
      window.feather.replace({
        'stroke-width': 1.7,
        width: 20,
        height: 20
      });
    }
  }

  function renderGlobalConfig(config) {
    document.querySelectorAll('[data-site-name]').forEach(node => {
      node.textContent = config.siteName;
      if (node.matches('a')) node.setAttribute('aria-label', `${config.siteName} home`);
    });

    document.querySelectorAll('[data-site-description]').forEach(node => {
      node.textContent = config.siteDescription;
    });

    document.querySelectorAll('[data-footer-text]').forEach(node => {
      node.textContent = config.footerText;
    });

    document.querySelectorAll('[data-about-content]').forEach(node => {
      node.innerHTML = config.aboutContent;
    });

    document.querySelectorAll('[data-social-links]').forEach(node => {
      if (!config.socialLinks.length) {
        node.hidden = true;
        node.innerHTML = '';
        return;
      }

      node.hidden = false;
      node.innerHTML = config.socialLinks.map(item => {
        const url = safeUrl(item.url);
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.platform)}</a>`;
      }).join('');
    });

    document.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]').forEach(link => {
      link.href = safeUrl(config.rssPath);
      link.title = `${config.siteName} RSS`;
    });

    const page = body.dataset.page || 'posts';
    const pageTitles = {
      posts: 'Posts',
      search: 'Search',
      about: 'About',
      '404': '404',
      article: 'Article'
    };

    if (page !== 'article') {
      const pageTitle = pageTitles[page] || 'Posts';
      document.title = `${pageTitle} — ${config.siteName}`;
      document.querySelector('meta[name="description"]')?.setAttribute('content', config.siteDescription);
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${pageTitle} — ${config.siteName}`);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', config.siteDescription);
      document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', config.siteName);
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', window.location.href);
      document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', `${pageTitle} — ${config.siteName}`);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', config.siteDescription);
    }
  }

  function setupTheme() {
    applyTheme(resolveInitialTheme(runtimeConfig));
    document.querySelector('#theme-toggle')?.addEventListener('click', () => {
      applyTheme(html.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  }

  let menuScrollY = 0;

  function setupMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('#site-nav');
    if (!toggle || !nav) return;

    const close = () => {
      if (!body.classList.contains('menu-open')) return;
      body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, menuScrollY);
    };

    const open = () => {
      menuScrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${menuScrollY}px`;
      body.style.width = '100%';
      body.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    };

    toggle.addEventListener('click', () => {
      body.classList.contains('menu-open') ? close() : open();
    });

    nav.addEventListener('click', event => {
      if (event.target.closest('a') || event.target.closest('#theme-toggle')) close();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 640) close();
    });
  }

  document.querySelectorAll('[data-current-year]').forEach(node => {
    node.textContent = String(new Date().getFullYear());
  });

  const tokenize = value => String(value || '').match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];

  function buildFuse(posts) {
    if (typeof Fuse === 'undefined') throw new Error('Fuse.js failed to load.');
    return new Fuse(posts, {
      keys: [
        { name: 'title', weight: 0.65 },
        { name: 'tags', weight: 0.2 },
        { name: 'summary', weight: 0.15 }
      ],
      includeMatches: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      threshold: 0.3,
      tokenize,
      shouldSort: true
    });
  }

  function highlightText(value, matches) {
    const text = String(value || '');
    if (!matches?.length) return escapeHtml(text);

    const ranges = [];
    matches.forEach(match => {
      (match.indices || []).forEach(range => ranges.push(range));
    });
    ranges.sort((a, b) => a[0] - b[0]);

    const merged = [];
    for (const [start, end] of ranges) {
      if (!merged.length || start > merged[merged.length - 1][1] + 1) {
        merged.push([start, end]);
      } else {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
      }
    }

    let cursor = 0;
    let output = '';
    for (const [start, end] of merged) {
      if (start < cursor) continue;
      output += escapeHtml(text.slice(cursor, start));
      output += `<mark>${escapeHtml(text.slice(start, end + 1))}</mark>`;
      cursor = end + 1;
    }
    return output + escapeHtml(text.slice(cursor));
  }

  function matchesFor(result, key) {
    return (result.matches || []).filter(match => match.key === key);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? escapeHtml(value)
      : new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
  }

  function renderPostCard(result) {
    const post = result.item;
    const title = highlightText(post.title, matchesFor(result, 'title'));
    const summary = highlightText(post.summary || '', matchesFor(result, 'summary'));
    const tagMatches = matchesFor(result, 'tags');

    const tags = (Array.isArray(post.tags) ? post.tags : []).map((tag, index) => {
      const matching = tagMatches.filter(match => match.refIndex === index || !('refIndex' in match));
      return `<span class="inline-tag">${highlightText(tag, matching)}</span>`;
    }).join('');

    const tagsHtml = tags
      ? `<div class="post-card-tags"><i data-feather="tag" class="tag-icon" aria-hidden="true"></i><div class="inline-tags">${tags}</div></div>`
      : '';

    return `<a class="post-card" href="./post.html?slug=${encodeURIComponent(post.slug)}">
      <h3 class="post-card-title">${title}</h3>
      ${summary ? `<p class="post-card-summary">${summary}</p>` : ''}
      <div class="post-card-date"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time></div>
      ${tagsHtml}
    </a>`;
  }

  function replacePostCardIcons() {
    if (window.feather?.replace) {
      window.feather.replace({
        'stroke-width': 1.7,
        width: 16,
        height: 16
      });
    }
  }

  function initHomePage() {
    const postList = document.querySelector('#post-list');
    if (!postList) return;

    const resultCount = document.querySelector('#result-count');
    const errorBox = document.querySelector('#load-error');
    const sentinel = document.querySelector('#infinite-scroll-sentinel');

    const state = {
      posts: [],
      visible: 0,
      loadingMore: false
    };

    function updateInfiniteUi() {
      const hasMore = state.visible < state.posts.length;
      if (sentinel) sentinel.hidden = !hasMore;
    }

    function renderNextPage() {
      if (state.loadingMore || state.visible >= state.posts.length) return;

      state.loadingMore = true;
      const start = state.visible;
      const end = Math.min(start + runtimeConfig.postsPerPage, state.posts.length);
      const nextItems = state.posts.slice(start, end);

      if (nextItems.length) {
        postList.insertAdjacentHTML(
          'beforeend',
          nextItems.map(post => renderPostCard({ item: post, matches: [] })).join('')
        );
        replacePostCardIcons();
      }

      state.visible = end;
      state.loadingMore = false;
      updateInfiniteUi();
    }

    function showError() {
      if (sentinel) sentinel.hidden = true;
      postList.innerHTML = '';
      if (resultCount) resultCount.textContent = '';
      errorBox.hidden = false;
      errorBox.innerHTML = '<p>Failed to load articles. <button type="button" id="retry-load" class="text-link-button">Click to retry.</button></p>';
      document.querySelector('#retry-load')?.addEventListener('click', loadPosts, { once: true });
    }

    function setupInfiniteScroll() {
      if (!sentinel || !('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) renderNextPage();
      }, {
        root: null,
        rootMargin: '0px 0px 600px 0px',
        threshold: 0
      });

      observer.observe(sentinel);
    }

    async function loadPosts() {
      errorBox.hidden = true;
      if (sentinel) sentinel.hidden = true;
      postList.innerHTML = '';

      try {
        const response = await fetch(`data/posts.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid posts index');

        state.posts = data
          .filter(post => post && post.slug && post.title && post.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        state.visible = 0;
        state.loadingMore = false;

        if (resultCount) {
          resultCount.textContent = `${state.posts.length} ${state.posts.length === 1 ? 'post' : 'posts'}`;
        }

        if (!state.posts.length) {
          postList.innerHTML = '<div class="status-box">No posts published yet.</div>';
          return;
        }

        renderNextPage();
        setupInfiniteScroll();
      } catch (_) {
        showError();
      }
    }

    loadPosts();
  }

  window.BlogSearch = Object.freeze({
    buildFuse,
    highlightText,
    renderPostCard,
    formatDate,
    normalizeQuery: value => tokenize(String(value || '').trim()).join(' '),
    tokenize,
    escapeHtml,
    matchesFor
  });

  async function boot() {
    runtimeConfig = await window.siteConfigPromise;
    renderNavigation(runtimeConfig);
    renderGlobalConfig(runtimeConfig);
    setupTheme();
    setupMenu();
    initHomePage();
  }

  boot();
})();
