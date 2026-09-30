/**
 * Medi Blues Blog - Client-Side API Layer
 * Handles data fetching, filtering, and caching for blog articles.
 */

(function (global) {
  'use strict';

  class BlogAPIClient {
    constructor(config = {}) {
      this.dataUrl = config.dataUrl || 'posts.json';
      this.cachedData = null;
    }

    /**
     * Set a custom endpoint or data source path.
     * @param {string} url
     */
    setDataUrl(url) {
      this.dataUrl = url;
      this.cachedData = null;
    }

    /**
     * Fetch raw blog data from the source.
     * @param {Object} [options]
     * @param {boolean} [options.bypassCache=false]
     * @returns {Promise<{ posts: Array }>}
     */
    async fetchAllData({ bypassCache = false } = {}) {
      if (this.cachedData && !bypassCache) {
        return this.cachedData;
      }

      const response = await fetch(this.dataUrl, {
        cache: bypassCache ? 'no-cache' : 'default',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load articles (HTTP ${response.status})`);
      }

      const data = await response.json();
      this.cachedData = data;
      return data;
    }

    /**
     * Get all articles that are published and ready for reader display.
     * Filter out drafts and future-dated posts, then sort descending by date.
     * @param {Object} [options]
     * @returns {Promise<Array>}
     */
    async getPublishedPosts(options = {}) {
      const data = await this.fetchAllData(options);
      const rawPosts = Array.isArray(data.posts) ? data.posts : [];
      const now = Date.now();

      return rawPosts
        .filter(post => post.published !== false && (!post.date || new Date(post.date).getTime() <= now))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    /**
     * Find a specific article by its slugified title.
     * @param {string} slug
     * @param {Object} [options]
     * @returns {Promise<Object|null>}
     */
    async getPostBySlug(slug, options = {}) {
      if (!slug) return null;
      
      const slugify = global.MediBluesUtils?.slugify || (s => String(s).toLowerCase().replace(/[^\w-]/g, ''));
      const data = await this.fetchAllData(options);
      const rawPosts = Array.isArray(data.posts) ? data.posts : [];

      const post = rawPosts.find(item => {
        if (item.published === false) return false;
        return slugify(item.title) === slug;
      });

      return post || null;
    }
  }

  // Create singleton instance and export
  const MediBluesAPI = new BlogAPIClient();

  global.BlogAPIClient = BlogAPIClient;
  global.MediBluesAPI = MediBluesAPI;
  global.MediBlues = global.MediBlues || {};
  global.MediBlues.api = MediBluesAPI;

})(typeof window !== 'undefined' ? window : this);
