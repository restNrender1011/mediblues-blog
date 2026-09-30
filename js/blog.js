/**
 * Medi Blues Blog - Mayo Clinic Style Blog Controller
 * Features:
 *  - A-Z First Letter Directory Filtering (Diseases & Conditions style)
 *  - Real-time Pill Search Box
 *  - Category Filter Navigation
 *  - Featured Lead Story Card & 2-Column Mayo Grid
 *  - Dynamic Sidebar Topic Explorer
 */

(function () {
  'use strict';

  const ARTICLE_URL = 'article.html?post=';
  const PAGE_SIZE = 8;

  // DOM Elements
  const gridEl = document.getElementById('mb-grid');
  const featuredContainerEl = document.getElementById('mb-featured-container');
  const statusEl = document.getElementById('mb-status');
  const moreContainerEl = document.getElementById('mb-more');
  const moreBtnEl = document.getElementById('mb-more-btn');
  const categoriesContainerEl = document.getElementById('mb-categories');
  const sidebarCategoriesEl = document.getElementById('mb-sidebar-categories');
  const articleCountEl = document.getElementById('mb-article-count');
  const sectionHeadingEl = document.getElementById('mb-section-heading');

  // A-Z and Search Elements
  const azLettersContainerEl = document.getElementById('mb-az-letters');
  const searchInputEl = document.getElementById('mb-az-search-input');
  const searchClearBtnEl = document.getElementById('mb-az-search-clear');
  const filterStatusEl = document.getElementById('mb-filter-status');
  const filterStatusTextEl = document.getElementById('mb-filter-status-text');
  const filterResetBtnEl = document.getElementById('mb-filter-reset-btn');

  const { escapeHtml, slugify, formatDate } = window.MediBluesUtils || {};
  const api = window.MediBluesAPI;

  // State
  let allPosts = [];
  let filteredPosts = [];
  let selectedCategory = 'all';
  let selectedLetter = null;
  let searchQuery = '';
  let renderedCount = 0;

  /**
   * Helper to safely format dates.
   */
  function displayDate(val) {
    if (!val) return '';
    return formatDate ? formatDate(val, { day: 'numeric', month: 'short', year: 'numeric' }) : val;
  }

  /**
   * Render the Mayo Clinic Featured Lead Spotlight Card.
   * @param {Object} post
   * @returns {string}
   */
  function createFeaturedCardHTML(post) {
    const esc = escapeHtml || (s => s);
    const slug = slugify ? slugify(post.title) : encodeURIComponent(post.title);
    const dateFormatted = displayDate(post.date);

    const mediaHTML = post.image
      ? `<img src="${esc(post.image)}" alt="${esc(post.image_alt || post.title)}" loading="lazy">`
      : `<div class="mb-ph" aria-hidden="true"></div>`;

    return `
      <article class="mb-featured-card">
        <div class="mb-featured-media">${mediaHTML}</div>
        <div class="mb-featured-body">
          <div class="mb-spotlight-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Featured Health Guide
          </div>
          <div class="mb-meta">
            <span class="mb-tag">${esc(post.category || 'General')}</span>
            <time datetime="${esc(post.date || '')}">${esc(dateFormatted)}</time>
          </div>
          <h3>${esc(post.title)}</h3>
          <p>${esc(post.excerpt || '')}</p>
          <div class="mb-review-tag">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Medically Reviewed
          </div>
          <a class="mb-read-link" href="${ARTICLE_URL}${encodeURIComponent(slug)}" aria-label="Read full guide: ${esc(post.title)}">
            Read full guide &rarr;
          </a>
        </div>
      </article>`;
  }

  /**
   * Generate HTML for standard Mayo Clinic article card.
   * @param {Object} post
   * @returns {string}
   */
  function createCardHTML(post) {
    const esc = escapeHtml || (s => s);
    const slug = slugify ? slugify(post.title) : encodeURIComponent(post.title);
    const dateFormatted = displayDate(post.date);

    const mediaHTML = post.image
      ? `<img src="${esc(post.image)}" alt="${esc(post.image_alt || post.title)}" loading="lazy">`
      : `<div class="mb-ph" aria-hidden="true"></div>`;

    return `
      <article class="mb-card">
        <div class="mb-media">${mediaHTML}</div>
        <div class="mb-body">
          <div class="mb-meta">
            <span class="mb-tag">${esc(post.category || 'General')}</span>
            <time datetime="${esc(post.date || '')}">${esc(dateFormatted)}</time>
          </div>
          <h3>${esc(post.title)}</h3>
          <p>${esc(post.excerpt || '')}</p>
          <a class="mb-read-link" href="${ARTICLE_URL}${encodeURIComponent(slug)}" aria-label="Read article: ${esc(post.title)}">
            Read article &rarr;
          </a>
        </div>
      </article>`;
  }

  /**
   * Filter posts by active letter, search query, and category.
   */
  function applyFilters() {
    const query = searchQuery.trim().toLowerCase();

    filteredPosts = allPosts.filter(post => {
      const title = String(post.title || '').trim();

      // 1. First-letter filter
      if (selectedLetter) {
        const firstChar = title.charAt(0).toUpperCase();
        if (selectedLetter === '#') {
          // Non-alphabetic character (e.g. 0-9 or punctuation)
          if (/[A-Z]/.test(firstChar)) return false;
        } else {
          if (firstChar !== selectedLetter.toUpperCase()) return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        const cat = String(post.category || '').toLowerCase();
        if (cat !== selectedCategory.toLowerCase()) return false;
      }

      // 3. Search query filter
      if (query) {
        const titleLower = title.toLowerCase();
        const excerptLower = String(post.excerpt || '').toLowerCase();
        const bodyLower = String(post.body || '').toLowerCase();
        const categoryLower = String(post.category || '').toLowerCase();

        return (
          titleLower.includes(query) ||
          excerptLower.includes(query) ||
          categoryLower.includes(query) ||
          bodyLower.includes(query)
        );
      }

      return true;
    });

    // Reset pagination
    renderedCount = 0;
    updateFilterStatusUI();
    renderArticles();
  }

  /**
   * Update active filter notice & clear button.
   */
  function updateFilterStatusUI() {
    if (!filterStatusEl || !filterStatusTextEl) return;

    if (selectedLetter || searchQuery || selectedCategory !== 'all') {
      let message = 'Filtered by: ';
      const parts = [];

      if (selectedLetter) {
        parts.push(`First Letter "<strong>${escapeHtml(selectedLetter)}</strong>"`);
      }
      if (searchQuery) {
        parts.push(`Search "<strong>${escapeHtml(searchQuery)}</strong>"`);
      }
      if (selectedCategory !== 'all') {
        parts.push(`Category "<strong>${escapeHtml(selectedCategory)}</strong>"`);
      }

      message += parts.join(' &middot; ');
      filterStatusTextEl.innerHTML = message;
      filterStatusEl.hidden = false;
    } else {
      filterStatusEl.hidden = true;
    }

    if (searchClearBtnEl) {
      searchClearBtnEl.hidden = !searchQuery;
    }
  }

  /**
   * Render the filtered articles into the grid.
   */
  function renderArticles() {
    if (!gridEl) return;

    gridEl.innerHTML = '';
    if (featuredContainerEl) featuredContainerEl.innerHTML = '';

    // Update count badge
    if (articleCountEl) {
      articleCountEl.textContent = `${filteredPosts.length} ${filteredPosts.length === 1 ? 'article' : 'articles'}`;
    }

    // Update section heading based on state
    if (sectionHeadingEl) {
      if (selectedLetter) {
        sectionHeadingEl.textContent = `Articles Starting With "${selectedLetter}"`;
      } else if (searchQuery) {
        sectionHeadingEl.textContent = `Search Results for "${searchQuery}"`;
      } else if (selectedCategory !== 'all') {
        sectionHeadingEl.textContent = `${selectedCategory} Articles`;
      } else {
        sectionHeadingEl.textContent = 'Featured & Recent Articles';
      }
    }

    if (!filteredPosts.length) {
      if (statusEl) {
        const esc = escapeHtml || (s => s);
        statusEl.innerHTML = `No articles found${selectedLetter ? ` starting with "<strong>${esc(selectedLetter)}</strong>"` : ''}${searchQuery ? ` matching "<strong>${esc(searchQuery)}</strong>"` : ''}. Please try another letter or keyword.`;
        statusEl.hidden = false;
      }
      if (moreContainerEl) moreContainerEl.hidden = true;
      return;
    }

    if (statusEl) statusEl.hidden = true;

    let itemsForGrid = filteredPosts;

    // In default "All Topics" and without an active search/letter filter, spotlight the first story
    if (selectedCategory === 'all' && !searchQuery && !selectedLetter && featuredContainerEl && filteredPosts.length > 0) {
      const featuredPost = filteredPosts[0];
      featuredContainerEl.innerHTML = createFeaturedCardHTML(featuredPost);
      itemsForGrid = filteredPosts.slice(1);
    }

    // Render batch to the grid
    const batch = itemsForGrid.slice(renderedCount, renderedCount + PAGE_SIZE);
    gridEl.innerHTML = batch.map(createCardHTML).join('');
    renderedCount += batch.length;

    if (moreContainerEl) {
      moreContainerEl.hidden = renderedCount >= itemsForGrid.length;
    }
  }

  /**
   * Load more articles button handler.
   */
  function loadMore() {
    let itemsForGrid = filteredPosts;
    if (selectedCategory === 'all' && !searchQuery && !selectedLetter && filteredPosts.length > 0) {
      itemsForGrid = filteredPosts.slice(1);
    }

    const nextBatch = itemsForGrid.slice(renderedCount, renderedCount + PAGE_SIZE);
    if (!nextBatch.length) {
      if (moreContainerEl) moreContainerEl.hidden = true;
      return;
    }

    gridEl.insertAdjacentHTML('beforeend', nextBatch.map(createCardHTML).join(''));
    renderedCount += nextBatch.length;

    if (moreContainerEl) {
      moreContainerEl.hidden = renderedCount >= itemsForGrid.length;
    }
  }

  /**
   * Initialize A-Z Directory letter buttons.
   */
  function initAZDirectory() {
    if (!azLettersContainerEl) return;

    // Detect which letters actually have articles
    const existingLetters = new Set();
    allPosts.forEach(post => {
      const firstChar = String(post.title || '').trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstChar)) {
        existingLetters.add(firstChar);
      } else if (firstChar) {
        existingLetters.add('#');
      }
    });

    const letterButtons = azLettersContainerEl.querySelectorAll('.mb-letter-btn');

    letterButtons.forEach(btn => {
      const letter = btn.dataset.letter;
      if (existingLetters.has(letter)) {
        btn.classList.add('has-articles');
        btn.title = `Articles starting with ${letter}`;
      } else {
        btn.classList.add('no-articles');
        btn.title = `No articles currently starting with ${letter}`;
      }

      btn.addEventListener('click', () => {
        // Toggle behavior: if already selected, clear it
        if (selectedLetter === letter) {
          selectedLetter = null;
          btn.classList.remove('active');
        } else {
          selectedLetter = letter;
          letterButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Clear search text when letter is picked
          if (searchInputEl) {
            searchInputEl.value = '';
            searchQuery = '';
          }
        }

        applyFilters();

        // Smooth scroll to the results
        if (sectionHeadingEl) {
          const y = sectionHeadingEl.getBoundingClientRect().top + window.pageYOffset - 110;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Setup interactive search listeners.
   */
  function initSearchListeners() {
    if (!searchInputEl) return;

    let debounceTimer;
    searchInputEl.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      searchQuery = e.target.value;

      // If typing in search, clear selected letter
      if (selectedLetter) {
        selectedLetter = null;
        if (azLettersContainerEl) {
          azLettersContainerEl.querySelectorAll('.mb-letter-btn').forEach(b => b.classList.remove('active'));
        }
      }

      debounceTimer = setTimeout(applyFilters, 200);
    });

    if (searchClearBtnEl) {
      searchClearBtnEl.addEventListener('click', () => {
        searchInputEl.value = '';
        searchQuery = '';
        applyFilters();
        searchInputEl.focus();
      });
    }

    if (filterResetBtnEl) {
      filterResetBtnEl.addEventListener('click', () => {
        selectedLetter = null;
        searchQuery = '';
        selectedCategory = 'all';

        if (searchInputEl) searchInputEl.value = '';
        if (azLettersContainerEl) {
          azLettersContainerEl.querySelectorAll('.mb-letter-btn').forEach(b => b.classList.remove('active'));
        }
        if (categoriesContainerEl) {
          categoriesContainerEl.querySelectorAll('.mb-cat-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.category === 'all');
          });
        }

        applyFilters();
      });
    }
  }

  /**
   * Populate category filter pills and sidebar topic links.
   */
  function buildCategoryNavigation() {
    const categoryCounts = {};

    allPosts.forEach(p => {
      const cat = p.category ? p.category.trim() : 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(categoryCounts).sort();

    // 1. Build Filter Pills
    if (categoriesContainerEl) {
      let pillsHTML = `<button class="mb-cat-pill ${selectedCategory === 'all' ? 'active' : ''}" data-category="all" type="button">All Topics</button>`;

      categories.forEach(cat => {
        pillsHTML += `<button class="mb-cat-pill ${selectedCategory === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}" type="button">${escapeHtml(cat)} (${categoryCounts[cat]})</button>`;
      });

      categoriesContainerEl.innerHTML = pillsHTML;

      categoriesContainerEl.querySelectorAll('.mb-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          categoriesContainerEl.querySelectorAll('.mb-cat-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedCategory = btn.dataset.category;
          applyFilters();
        });
      });
    }

    // 2. Build Sidebar Categories List
    if (sidebarCategoriesEl) {
      let listHTML = `<li><a href="#" data-category="all"><span>All Articles</span> <span>${allPosts.length}</span></a></li>`;

      categories.forEach(cat => {
        listHTML += `<li><a href="#" data-category="${escapeHtml(cat)}"><span>${escapeHtml(cat)}</span> <span>${categoryCounts[cat]}</span></a></li>`;
      });

      sidebarCategoriesEl.innerHTML = listHTML;

      sidebarCategoriesEl.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          selectedCategory = link.dataset.category;

          if (categoriesContainerEl) {
            categoriesContainerEl.querySelectorAll('.mb-cat-pill').forEach(btn => {
              btn.classList.toggle('active', btn.dataset.category === selectedCategory);
            });
          }

          applyFilters();
          if (gridEl) {
            const y = gridEl.getBoundingClientRect().top + window.pageYOffset - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        });
      });
    }
  }

  /**
   * Initialize blog page.
   */
  async function init() {
    if (gridEl) {
      gridEl.innerHTML = '<div class="mb-skel"></div>'.repeat(4);
    }

    try {
      allPosts = await api.getPublishedPosts({ bypassCache: true });

      initAZDirectory();
      buildCategoryNavigation();
      initSearchListeners();
      applyFilters();
    } catch (err) {
      console.error('Failed to load blog posts:', err);
      if (gridEl) gridEl.innerHTML = '';
      if (statusEl) {
        statusEl.textContent = "We couldn't load the articles right now. Please refresh the page or try again shortly.";
        statusEl.classList.add('error');
        statusEl.hidden = false;
      }
    }
  }

  if (moreBtnEl) {
    moreBtnEl.addEventListener('click', loadMore);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
