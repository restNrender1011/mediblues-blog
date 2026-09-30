/**
 * Medi Blues Blog - Admin UI Controller
 * Manages CMS interface, form handling, article list rendering, editor states,
 * and direct file upload for article cover images.
 */

(function () {
  'use strict';

  // DOM Elements
  const $ = id => document.getElementById(id);
  const statusEl = $('status');
  const tokenInput = $('token');
  const connectBtn = $('connect');
  const articlesPanel = $('articles-panel');
  const editorPanel = $('editor-panel');
  const articleListEl = $('articleList');
  const newArticleBtn = $('newArticle');
  const saveArticleBtn = $('saveArticle');
  const cancelEditBtn = $('cancelEdit');

  // Form inputs
  const editIndexInput = $('editIndex');
  const editorTitleEl = $('editorTitle');
  const titleInput = $('title');
  const categoryInput = $('category');
  const dateInput = $('date');
  const excerptInput = $('excerpt');
  const imageInput = $('image');
  const imageAltInput = $('imageAlt');
  const bodyInput = $('body');
  const publishedCheckbox = $('published');

  // Image Upload & Preview Elements
  const imageFileInput = $('imageFile');
  const imageDropzone = $('imageDropzone');
  const imagePreviewCard = $('imagePreviewCard');
  const imagePreviewImg = $('imagePreviewImg');
  const imagePreviewName = $('imagePreviewName');
  const imagePreviewMeta = $('imagePreviewMeta');
  const changeImageBtn = $('changeImageBtn');
  const removeImageBtn = $('removeImageBtn');
  const toggleUrlBtn = $('toggleUrlBtn');
  const manualUrlWrap = $('manualUrlWrap');

  // Utilities & API service
  const { escapeHtml } = window.MediBluesUtils || {
    escapeHtml: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  };
  const api = window.AdminGitHubAPI;

  // Local state
  let posts = [];
  let currentFileSha = '';
  let selectedImageFile = null;
  let previewBlobUrl = null;

  /**
   * Display status feedback banner.
   * @param {string} message
   * @param {'ok'|'error'} [type='ok']
   */
  function showStatus(message, type = 'ok') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status show ${type}`;
  }

  /**
   * Format bytes to readable size string (e.g. 1.2 MB).
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Sanitize an uploaded filename into a safe repository filename.
   * @param {string} rawName
   * @returns {string}
   */
  function sanitizeFilename(rawName) {
    const lastDot = rawName.lastIndexOf('.');
    const ext = lastDot !== -1 ? rawName.substring(lastDot + 1).toLowerCase() : 'png';
    const base = lastDot !== -1 ? rawName.substring(0, lastDot) : rawName;
    const cleanBase = base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cover';
    const uniqueStamp = Date.now().toString(36);
    return `${cleanBase}-${uniqueStamp}.${ext}`;
  }

  /**
   * Convert a File or Blob to a pure Base64 string for GitHub Contents API.
   * @param {File|Blob} file
   * @returns {Promise<string>}
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Clear any active image selection or preview state.
   */
  function clearImagePreview() {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = null;
    }
    selectedImageFile = null;
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreviewImg) imagePreviewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
    if (imagePreviewCard) imagePreviewCard.classList.add('hidden');
    if (imageDropzone) imageDropzone.classList.remove('hidden');
  }

  /**
   * Show preview for an image (either locally selected or existing URL).
   * @param {string} src
   * @param {string} nameText
   * @param {string} metaText
   */
  function showImagePreview(src, nameText, metaText) {
    if (!src) {
      clearImagePreview();
      return;
    }
    if (imagePreviewImg) imagePreviewImg.src = src;
    if (imagePreviewName) imagePreviewName.textContent = nameText || 'image.png';
    if (imagePreviewMeta) imagePreviewMeta.textContent = metaText || 'Ready to upload on save';
    if (imageDropzone) imageDropzone.classList.add('hidden');
    if (imagePreviewCard) imagePreviewCard.classList.remove('hidden');
  }

  /**
   * Handle user-selected image file from file dialog or drag & drop.
   * @param {File} file
   */
  function handleSelectedFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file (PNG, JPG, WEBP, GIF, SVG).', 'error');
      return;
    }

    // Maximum recommended file size: 15MB
    if (file.size > 15 * 1024 * 1024) {
      showStatus('Image file is too large (maximum 15MB). Please choose a smaller image.', 'error');
      return;
    }

    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }

    selectedImageFile = file;
    previewBlobUrl = URL.createObjectURL(file);
    showImagePreview(previewBlobUrl, file.name, `${formatBytes(file.size)} · Selected (uploads on save)`);
  }

  /**
   * Load articles from GitHub using the API service.
   */
  async function loadPosts() {
    showStatus('Loading articles from GitHub...');

    try {
      const result = await api.fetchPostsFile();
      posts = result.posts;
      currentFileSha = result.sha;

      renderArticles();
      if (articlesPanel) articlesPanel.classList.remove('hidden');
      showStatus(`Connected. ${posts.length} article(s) loaded.`, 'ok');
    } catch (err) {
      console.error('Load error:', err);
      showStatus(err.message, 'error');
    }
  }

  /**
   * Render the list of articles in the CMS panel.
   */
  function renderArticles() {
    if (!articleListEl) return;
    articleListEl.innerHTML = '';

    if (!posts.length) {
      articleListEl.innerHTML = '<p class="token-note">No articles found in repository.</p>';
      return;
    }

    posts.forEach((post, index) => {
      const row = document.createElement('div');
      row.className = 'article-row';

      const isPublished = post.published !== false;
      const pubStatus = isPublished ? 'Published' : 'Draft';

      row.innerHTML = `
        <div>
          <div class="article-title">${escapeHtml(post.title || 'Untitled')}</div>
          <div class="article-meta">
            ${escapeHtml(post.category || 'General')} · ${escapeHtml(post.date || 'No date')} · ${pubStatus}
          </div>
        </div>
        <div class="actions">
          <button class="secondary" data-edit="${index}">Edit</button>
          <button class="danger" data-delete="${index}">Delete</button>
        </div>
      `;

      articleListEl.appendChild(row);
    });

    // Attach event listeners
    articleListEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => editArticle(Number(btn.dataset.edit)));
    });

    articleListEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteArticle(Number(btn.dataset.delete)));
    });
  }

  /**
   * Open the editor for an existing article.
   * @param {number} index
   */
  function editArticle(index) {
    const post = posts[index];
    if (!post) return;

    editIndexInput.value = index;
    editorTitleEl.textContent = 'Edit article';

    titleInput.value = post.title || '';
    categoryInput.value = post.category || '';
    dateInput.value = post.date || '';
    excerptInput.value = post.excerpt || '';
    imageInput.value = post.image || '';
    imageAltInput.value = post.image_alt || '';
    bodyInput.value = post.body || '';
    publishedCheckbox.checked = post.published !== false;

    // Reset file upload state and display existing image preview if present
    clearImagePreview();
    if (post.image) {
      let displayName = 'Current cover image';
      try {
        const parts = post.image.split('/');
        displayName = decodeURIComponent(parts[parts.length - 1]) || displayName;
      } catch (e) {}
      showImagePreview(post.image, displayName, 'Current cover image');
    }

    if (manualUrlWrap) manualUrlWrap.classList.add('hidden');
    if (toggleUrlBtn) toggleUrlBtn.textContent = '+ Or enter image URL manually';

    editorPanel.classList.remove('hidden');
    window.scrollTo({
      top: editorPanel.offsetTop - 20,
      behavior: 'smooth'
    });
  }

  /**
   * Open the editor for a brand new article.
   */
  function newArticle() {
    editIndexInput.value = '';
    editorTitleEl.textContent = 'New article';

    titleInput.value = '';
    categoryInput.value = '';
    dateInput.value = new Date().toISOString().slice(0, 10);
    excerptInput.value = '';
    imageInput.value = '';
    imageAltInput.value = '';
    bodyInput.value = '';
    publishedCheckbox.checked = true;

    clearImagePreview();
    if (manualUrlWrap) manualUrlWrap.classList.add('hidden');
    if (toggleUrlBtn) toggleUrlBtn.textContent = '+ Or enter image URL manually';

    editorPanel.classList.remove('hidden');
    window.scrollTo({
      top: editorPanel.offsetTop - 20,
      behavior: 'smooth'
    });
  }

  /**
   * Delete an article and commit changes.
   * @param {number} index
   */
  async function deleteArticle(index) {
    const post = posts[index];
    if (!post) return;

    if (!confirm(`Delete "${post.title}"?`)) {
      return;
    }

    posts.splice(index, 1);
    renderArticles();

    await persistPosts('Delete blog article');
  }

  /**
   * Save the current form inputs as an article.
   * If a file was selected, upload the actual file to GitHub first.
   */
  async function handleSave() {
    const title = titleInput.value.trim();
    if (!title) {
      showStatus('Please enter an article title.', 'error');
      titleInput.focus();
      return;
    }

    saveArticleBtn.disabled = true;
    const originalBtnText = saveArticleBtn.textContent;

    try {
      let finalImageUrl = imageInput.value.trim();

      // If a local image file was selected, upload it to GitHub repository
      if (selectedImageFile) {
        if (!api.hasToken()) {
          throw new Error('Please connect your GitHub token before uploading image files.');
        }

        saveArticleBtn.textContent = 'Uploading image...';
        showStatus('Uploading image file to GitHub repository...');

        const base64Content = await fileToBase64(selectedImageFile);
        const fileName = sanitizeFilename(selectedImageFile.name);
        const repoPath = `images/${fileName}`;

        const uploadResult = await api.uploadFile({
          path: repoPath,
          base64Content,
          commitMessage: `Upload cover image: ${selectedImageFile.name}`
        });

        finalImageUrl = uploadResult.rawUrl;
        imageInput.value = finalImageUrl;
        selectedImageFile = null; // Marked as uploaded
      }

      saveArticleBtn.textContent = 'Saving article...';

      const post = {
        title,
        category: categoryInput.value.trim(),
        excerpt: excerptInput.value.trim(),
        image: finalImageUrl,
        image_alt: imageAltInput.value.trim(),
        date: dateInput.value,
        published: publishedCheckbox.checked,
        body: bodyInput.value.trim()
      };

      const index = editIndexInput.value;
      const isNew = index === '';

      if (isNew) {
        posts.push(post);
      } else {
        posts[Number(index)] = post;
      }

      renderArticles();
      await persistPosts(isNew ? 'Add blog article' : 'Update blog article');
    } catch (err) {
      console.error('Save error:', err);
      showStatus(`Save failed: ${err.message}`, 'error');
    } finally {
      saveArticleBtn.disabled = false;
      saveArticleBtn.textContent = originalBtnText;
    }
  }

  /**
   * Commit the posts array to GitHub via API service.
   * @param {string} commitMessage
   */
  async function persistPosts(commitMessage) {
    showStatus('Saving to GitHub repository...');

    try {
      const result = await api.savePostsFile({
        posts,
        sha: currentFileSha,
        commitMessage
      });

      currentFileSha = result.sha;
      if (editorPanel) editorPanel.classList.add('hidden');
      clearImagePreview();
      showStatus('Saved successfully! GitHub Pages will rebuild and deploy shortly.', 'ok');
    } catch (err) {
      console.error('Save failed:', err);
      showStatus(`Save failed: ${err.message}`, 'error');
    }
  }

  // Bind Event Listeners
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      const token = tokenInput ? tokenInput.value.trim() : '';
      if (!token) {
        showStatus('Please enter your GitHub token.', 'error');
        return;
      }

      api.setToken(token);
      await loadPosts();
    });
  }

  if (newArticleBtn) {
    newArticleBtn.addEventListener('click', newArticle);
  }

  if (saveArticleBtn) {
    saveArticleBtn.addEventListener('click', handleSave);
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      clearImagePreview();
      if (editorPanel) editorPanel.classList.add('hidden');
    });
  }

  // Image Upload File Dialog & Drag-and-Drop
  if (imageDropzone && imageFileInput) {
    imageDropzone.addEventListener('click', () => {
      imageFileInput.click();
    });

    imageFileInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleSelectedFile(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      imageDropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        imageDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      imageDropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        imageDropzone.classList.remove('drag-over');
      });
    });

    imageDropzone.addEventListener('drop', e => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });
  }

  if (changeImageBtn && imageFileInput) {
    changeImageBtn.addEventListener('click', () => {
      imageFileInput.click();
    });
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      clearImagePreview();
      imageInput.value = '';
    });
  }

  if (toggleUrlBtn && manualUrlWrap) {
    toggleUrlBtn.addEventListener('click', () => {
      const isHidden = manualUrlWrap.classList.toggle('hidden');
      toggleUrlBtn.textContent = isHidden ? '+ Or enter image URL manually' : '– Hide manual URL input';
    });
  }

  if (imageInput) {
    imageInput.addEventListener('input', () => {
      const url = imageInput.value.trim();
      if (!selectedImageFile) {
        if (url) {
          showImagePreview(url, 'External image URL', 'Linked from URL');
        } else {
          clearImagePreview();
        }
      }
    });
  }
})();
