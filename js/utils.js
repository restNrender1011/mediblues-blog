/**
 * Medi Blues Blog - Shared Utilities
 */

(function (global) {
  'use strict';

  const MediBluesUtils = {
    /**
     * Escape special HTML characters to prevent XSS.
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    },

    /**
     * Convert a title or string to a URL-friendly slug.
     * @param {string} str
     * @returns {string}
     */
    slugify(str) {
      return String(str || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-');
    },

    /**
     * Format a date string to a human-readable display date.
     * @param {string|Date} value
     * @param {Object} [options]
     * @returns {string}
     */
    formatDate(value, options = {}) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      
      const defaultOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };

      return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    },

    /**
     * Truncate text cleanly at word boundaries.
     * @param {string} text
     * @param {number} maxLen
     * @returns {string}
     */
    truncateText(text, maxLen = 160) {
      if (!text || text.length <= maxLen) return text || '';
      const sub = text.slice(0, maxLen);
      const lastSpace = sub.lastIndexOf(' ');
      return (lastSpace > 0 ? sub.slice(0, lastSpace) : sub) + '...';
    }
  };

  // Expose globally
  global.MediBluesUtils = MediBluesUtils;
  global.MediBlues = global.MediBlues || {};
  global.MediBlues.utils = MediBluesUtils;

})(typeof window !== 'undefined' ? window : this);
