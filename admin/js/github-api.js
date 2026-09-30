/**
 * Medi Blues Admin - GitHub REST API Service
 * Encapsulates authentication, file reading, file updating, and commits via GitHub API.
 */

(function (global) {
  'use strict';

  class GitHubAPIService {
    constructor(config = {}) {
      this.owner = config.owner || 'restNRender1011';
      this.repo = config.repo || 'mediblues-blog';
      this.branch = config.branch || 'main';
      this.path = config.path || 'posts.json';
      this.token = config.token || '';
      this.apiVersion = '2026-03-10';
    }

    /**
     * Update repository configuration.
     * @param {Object} config
     */
    configure(config) {
      if (config.owner) this.owner = config.owner;
      if (config.repo) this.repo = config.repo;
      if (config.branch) this.branch = config.branch;
      if (config.path) this.path = config.path;
      if (config.token !== undefined) this.token = config.token;
    }

    /**
     * Set authorization token.
     * @param {string} token
     */
    setToken(token) {
      this.token = String(token || '').trim();
    }

    /**
     * Check if a token has been set.
     * @returns {boolean}
     */
    hasToken() {
      return Boolean(this.token);
    }

    /**
     * Build HTTP headers for authenticated requests.
     * @returns {Object}
     */
    getHeaders() {
      return {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${this.token}`,
        'X-GitHub-Api-Version': this.apiVersion,
        'Content-Type': 'application/json'
      };
    }

    /**
     * Decode a base64 UTF-8 string safely.
     * @param {string} base64Str
     * @returns {string}
     */
    decodeContent(base64Str) {
      const sanitized = base64Str.replace(/\n/g, '');
      const binary = atob(sanitized);
      const percentEncoded = Array.from(binary)
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
      return decodeURIComponent(percentEncoded);
    }

    /**
     * Encode a UTF-8 string to base64 safely.
     * @param {string} str
     * @returns {string}
     */
    encodeContent(str) {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    /**
     * Fetch the posts.json file from the GitHub repository.
     * @returns {Promise<{ posts: Array, sha: string }>}
     */
    async fetchPostsFile() {
      if (!this.hasToken()) {
        throw new Error('GitHub token is required to load repository data.');
      }

      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}`;

      const response = await fetch(url, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const contentJson = this.decodeContent(data.content);
      const parsed = JSON.parse(contentJson);

      return {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        sha: data.sha
      };
    }

    /**
     * Commit an updated posts list back to GitHub.
     * @param {Object} params
     * @param {Array} params.posts
     * @param {string} params.sha
     * @param {string} params.commitMessage
     * @returns {Promise<{ sha: string, commit: Object }>}
     */
    async savePostsFile({ posts, sha, commitMessage }) {
      if (!this.hasToken()) {
        throw new Error('GitHub token is required to commit changes.');
      }

      const jsonString = JSON.stringify({ posts }, null, 2);
      const base64Content = this.encodeContent(jsonString);

      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: commitMessage || 'Update blog posts via admin panel',
          content: base64Content,
          sha: sha,
          branch: this.branch
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub save failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return {
        sha: result.content.sha,
        commit: result.commit
      };
    }

    /**
     * Upload or update a binary file (such as an image) in the GitHub repository.
     * @param {Object} params
     * @param {string} params.path - Target path in repo (e.g. 'images/sample.png')
     * @param {string} params.base64Content - Base64 encoded file content
     * @param {string} [params.commitMessage] - Git commit message
     * @returns {Promise<{ path: string, rawUrl: string, sha: string }>}
     */
    async uploadFile({ path, base64Content, commitMessage }) {
      if (!this.hasToken()) {
        throw new Error('GitHub token is required to upload files.');
      }

      // Check if file already exists in repository to obtain SHA (required by GitHub if overwriting)
      let sha = undefined;
      try {
        const checkUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
        const checkRes = await fetch(checkUrl, {
          headers: this.getHeaders()
        });
        if (checkRes.ok) {
          const fileData = await checkRes.json();
          sha = fileData.sha;
        }
      } catch (err) {
        // File does not exist yet; safe to proceed with new file creation
      }

      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
      const payload = {
        message: commitMessage || `Upload ${path} via admin panel`,
        content: base64Content,
        branch: this.branch
      };
      if (sha) {
        payload.sha = sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub image upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`;

      return {
        path: result.content ? result.content.path : path,
        rawUrl: rawUrl,
        sha: result.content ? result.content.sha : (result.commit ? result.commit.sha : '')
      };
    }
  }

  // Export
  global.GitHubAPIService = GitHubAPIService;
  global.AdminGitHubAPI = new GitHubAPIService();

})(typeof window !== 'undefined' ? window : this);
