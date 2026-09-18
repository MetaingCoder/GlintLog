(() => {
  'use strict';

  const input = document.querySelector('#search-input');
  const resultsRoot = document.querySelector('#search-results');
  const status = document.querySelector('#search-status');
  const count = document.querySelector('#search-result-count');

  if (!input || !resultsRoot) return;

  let posts = [];
  let fuse = null;

  async function loadPosts() {
    status.hidden = true;
    try {
      const response = await fetch(`data/posts.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid posts index');

      posts = data
        .filter(post => post && post.slug && post.title && post.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      fuse = window.BlogSearch?.buildFuse(posts);
      if (!fuse) throw new Error('Search module failed to initialize.');

      render(input.value);
    } catch (_) {
      status.hidden = false;
      status.innerHTML = '<p>Failed to load articles. <button type="button" id="retry-search" class="text-link-button">Click to retry.</button></p>';
      resultsRoot.innerHTML = '';
      count.textContent = '';
      document.querySelector('#retry-search')?.addEventListener('click', loadPosts, { once: true });
    }
  }

  function render(query) {
    if (!fuse || !window.BlogSearch) return;

    const clean = window.BlogSearch.normalizeQuery(query);
    const results = clean
      ? fuse.search(clean)
      : posts.map(item => ({ item, matches: [] }));

    if (!results.length) {
      resultsRoot.innerHTML = '<div class="status-box">No results found.</div>';
      count.textContent = '';
      return;
    }

    resultsRoot.innerHTML = results.map(window.BlogSearch.renderPostCard).join('');
    window.feather?.replace?.({ 'stroke-width': 1.7, width: 16, height: 16 });
    count.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'}`;
  }

  input.addEventListener('input', () => render(input.value));

  input.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    input.value = '';
    render('');
    input.blur();
  });

  window.siteConfigPromise.then(config => {
    input.setAttribute('placeholder', config.searchPlaceholder);
    loadPosts();
  }).catch(() => {
    loadPosts();
  });

  window.addEventListener('load', () => {
    input.focus();
  });
})();
