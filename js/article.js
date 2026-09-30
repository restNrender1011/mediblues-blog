/**
 * Medi Blues Blog - Single Article View Controller
 * Handles article detail retrieval, rendering, and error handling.
 */

(function () {
  'use strict';

  // DOM Elements
  const titleEl = document.getElementById('title');
  const categoryEl = document.getElementById('category');
  const dateEl = document.getElementById('date');
  const statusEl = document.getElementById('status');
  const articleEl = document.getElementById('article-content');
  const imageEl = document.getElementById('article-image');
  const placeholderEl = document.getElementById('article-placeholder');
  const contentEl = document.getElementById('content');

  if (!titleEl || !contentEl) return;

  const { escapeHtml, formatDate } = window.MediBluesUtils || {};
  const api = window.MediBluesAPI;

  /**
   * Display an error message to the reader.
   * @param {string} message
   */
  function showError(message) {
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('error');
      statusEl.hidden = false;
    }
    if (articleEl) articleEl.hidden = true;
  }

  /**
   * Load and render the requested article.
   */
  async function initArticle() {
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get('post');

    if (!requestedSlug) {
      showError('No article was specified.');
      return;
    }

    try {
      const post = await api.getPostBySlug(requestedSlug, { bypassCache: true });

      if (!post) {
        showError('Article not found.');
        return;
      }

      const esc = escapeHtml || (s => s);
      const formattedDate = formatDate ? formatDate(post.date, { month: 'long' }) : post.date;

      // Update page title and metadata
      document.title = `${post.title} | Medi Blues`;

      titleEl.textContent = post.title;

      if (categoryEl && post.category) {
        categoryEl.textContent = post.category;
        categoryEl.hidden = false;
      }

      if (dateEl && formattedDate) {
        dateEl.textContent = formattedDate;
      }

      if (imageEl && placeholderEl) {
        if (post.image) {
          imageEl.src = post.image;
          imageEl.alt = post.image_alt || post.title;
          imageEl.hidden = false;
          placeholderEl.hidden = true;
        } else {
          imageEl.hidden = true;
          placeholderEl.hidden = false;
        }
      }

      // Convert body paragraphs safely
      const rawBody = String(post.body || '');
      const paragraphs = rawBody
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      contentEl.innerHTML = paragraphs
        .map(p => `<p>${esc(p)}</p>`)
        .join('');

      if (statusEl) statusEl.hidden = true;
      if (articleEl) articleEl.hidden = false;

    } catch (err) {
      console.error('Error loading article:', err);
      showError("We couldn't load this article right now. Please try again.");
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticle);
  } else {
    initArticle();
  }
})();
