# Medi Blues blog page

A static blog page hosted from a git repo (GitHub Pages). Articles are added from an admin page at `/admin/`; each save is a commit to this repo, and the site updates about a minute later.

```
index.html             Clean blog landing page HTML
article.html           Clean single-article reader HTML
posts.json             All articles data (edited from the admin page)

css/
├── main.css           Design tokens, CSS variables, typography, reset, header & footer
├── blog.css           Blog list page styles, hero, card grid, shimmer skeleton
└── article.css        Article reader page styles, article hero, typography, callouts

js/
├── utils.js           Helper utilities (escapeHtml, slugify, formatDate, truncateText)
├── api.js             Dedicated blog data API client (fetching, caching, slug queries)
├── blog.js            Blog listing view controller (rendering, pagination)
└── article.js         Article reader view controller (URL params, article rendering)

admin/
├── index.html         Clean CMS admin interface HTML
├── css/admin.css      Admin dashboard layout, forms, buttons, and alert styles
└── js/
    ├── github-api.js  GitHub REST API client (auth, file read/write, base64 Unicode handling)
    └── admin.js       Admin UI controller (form handling, editor state, article management)
```

## Set up

1. Create a GitHub repo and push these files to the `main` branch.
2. In `admin/config.yml`, replace `YOUR-GITHUB-USERNAME/YOUR-REPO-NAME` (in `repo` and `site_url`).
3. In the repo go to Settings > Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Open `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/` for the blog and `.../admin/` for the admin panel.

## Log in to the admin page

Editors need write access to the repo (Settings > Collaborators).

Simplest way (fine for you and other developers): on the admin page choose the GitHub sign-in with a personal access token. Create a fine-grained token at GitHub > Settings > Developer settings > Personal access tokens, limited to this repo with **Contents: Read and write**.

For non-technical editors who should just click "Sign in with GitHub": deploy the free Sveltia CMS Authenticator worker on Cloudflare (github.com/sveltia/sveltia-cms-auth), then uncomment `base_url` in `admin/config.yml` and paste the worker URL.

## Add an article

Admin > Blog articles > Add an article: title, category, summary, cover image, publish date, article text. Save/publish. Untick "Published" or set a future date to keep it hidden.

New categories: add them to the `options` list in `admin/config.yml`.

## Notes

- The blog cards link to `article.html?post=<title-slug>`. The single-article page is not built yet; the full text is already stored in `posts.json` under `body`.
- Free GitHub Pages needs a public repo, so articles and images are public (they are on the website anyway).
- To serve this at `mediblues.com/blog` the main site has to route that path here; a subdomain such as `blog.mediblues.com` works with a GitHub Pages custom domain.
- Brand design tokens and color grading from https://www.mediblues.com/ are defined in `:root` in `css/main.css`.
