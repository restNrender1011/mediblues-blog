# Medi Blues blog page

A static blog page hosted from a git repo (GitHub Pages). Articles are added from an admin page at `/admin/`; each save is a commit to this repo, and the site updates about a minute later.

```
index.html          blog page (reads posts.json)
posts.json          all articles (edited from the admin page)
admin/index.html    admin panel (Sveltia CMS)
admin/config.yml    admin fields and repo settings
images/blog/        uploaded cover images
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
- Colours live in the `:root` block at the top of `index.html`.
