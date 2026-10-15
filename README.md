# Pratyush Jha — personal site

A multi-page site built with [Jekyll](https://jekyllrb.com), which GitHub Pages
runs for you. There is nothing to install: you edit text files, push, and the
site rebuilds.

| Page         | Address          | Built from                                                     |
|--------------|------------------|----------------------------------------------------------------|
| Home         | `/`              | `index.html`, `_data/profile.yml`, `experience.yml`, `news.yml`, `publications.yml` |
| Experience   | `/experience/`   | `_data/experience.yml`                                         |
| Projects     | `/projects/`     | `_data/projects.yml`, grouped by each project's `group`        |
| Publications | `/publications/` | `_data/publications.yml`                                       |
| CV           | `/cv/`           | every file in `_data/`                                         |
| Blog         | `/blog/`         | the Markdown files in `_posts/`                                |

## Showing and hiding things

| What           | Where                       | Switch                                  |
|----------------|-----------------------------|-----------------------------------------|
| A blog post    | the top of its file         | `published: true` or `published: false` |
| A news item    | `_data/news.yml`            | `visible: true` or `visible: false`     |
| A referee      | `_data/references.yml`      | `visible: true` or `visible: false`     |
| The CV buttons | `_data/profile.yml`         | `cv_pdf: ""` hides them                 |

When nothing is left to show, the whole section goes too: with no published
posts the Blog link, "Recent writing" and the RSS icon disappear; with no
visible news the News section disappears; with no visible referees the
References section disappears. A post with `published: false` is not built at
all, so it cannot be found by its address or in the RSS feed either.

## Put it online

1. On GitHub, create a public repository named `<your-username>.github.io`.
2. Upload everything in this folder to it, keeping the folder structure. The
   files must sit at the top level of the repository, so `_config.yml` is at
   the root, not inside a subfolder.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**,
   choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. Wait a minute or two, then open `https://<your-username>.github.io`.

Every later push rebuilds the site. If a build fails, the **Actions** tab shows
the error and the line it came from.

## Change your details

All of the content is in `_data/`. Each file starts with a comment explaining
its fields.

| File               | Holds                                                     |
|--------------------|-----------------------------------------------------------|
| `profile.yml`      | Name, role, tagline, About text, photo, email, links with icons, CV PDF |
| `news.yml`         | News items for the home page                              |
| `publications.yml` | Papers, with arXiv numbers, DOIs and BibTeX               |
| `experience.yml`   | Research and industry positions, projects and tools; each research position's one-line `blurb` for the home page |
| `projects.yml`     | Projects for the Projects page, each with a `group`       |
| `education.yml`    | Degrees, thesis, coursework                               |
| `skills.yml`       | Skill groups                                              |
| `awards.yml`       | Awards                                                    |
| `service.yml`      | Teaching and service                                      |
| `references.yml`   | Referees (hidden for now)                                 |
| `navigation.yml`   | The links in the header                                   |
| `people.yml`       | Professors' names and Google Scholar links                |

To change your photo, replace `assets/img/portrait.jpg` and
`assets/img/portrait.webp` with a 4:5 portrait (about 440 × 550 pixels or
larger). To replace the CV, overwrite `assets/Pratyush_Jha_CV.pdf` (the
address `cv_pdf` points to), or put a PDF with a new name in `assets/` and
update `cv_pdf`. `assets/Pratyush_cv_7_Oct_2026.pdf` is a copy kept so that
older links still work; overwrite it too, or delete it once nothing links to it.

The website CV is built from the master CV LaTeX source (kept outside this
repository), without its internal last page, phone
number or referees:
`pdflatex -jobname=Pratyush_Jha_CV_website "\def\WebsiteBuild{}\input{Pratyush_Jha_CV_master}"`
(run twice).

Projects are grouped on the Projects page by their `group` field. Groups
appear in the order of their first project in `projects.yml`, and each group
gets a button at the top of the page that jumps to it; to add a group, give a
project a new `group` name. A project's optional `related` field (a `label`
and a `url`) adds a "Related:" link under it.

The home page and the Experience page list every position from
`experience.yml`, research first and then industry, folded: the dates,
heading, role and `blurb` show, and the round button on the right opens the
details. "Expand all" and "Collapse all" open or close every position. A link
such as `/experience/#mcgill` (the position's `id`) opens that position
directly.

A button at the bottom left points to the next part of the page and, at the
end, back to the top. On the home page its stops are Experience, then News
and papers (set in `index.html`); on other pages they are the section
headings, and it stays hidden on short pages. Every page has a thin scroll
bar on the left edge that shows while you scroll and fades out a second
later; it can be dragged. A thin coloured line under the header fills as you
read down the page, sections fade in once as they come into view, and the
last lines at the bottom of the window are softly faded until the end of the
page, which hints that there is more below.
Visitors whose system asks for reduced motion get none of the movement.

Projects and Experience positions can have a `related` link (`label` and
`url`). Links to a project use its title in lower case with hyphens, for
example `/projects/#quantum-hadamard-edge-detection`.

The row of institution logos under the CV button comes from `affiliations`
in `profile.yml`; the logo files are in `assets/img/logos/`.

The home-page simulation is live Metropolis Monte Carlo, with a plot of the
energy per spin against the equilibrium value at the same temperature. The
code is in `assets/js/xy-model.js`.

Names listed in `_data/people.yml` link to their Google Scholar profiles
wherever the full name appears (About, News, advisors, project details), and
the short form in `cite` links in author lists.

YAML is strict about indentation: use spaces, never tabs, and keep list items
lined up with their neighbours. Put a value in quotes if it contains a colon.

## Write a blog post

1. Add a file to `_posts/` named `YYYY-MM-DD-a-short-title.md`.
2. Start it with these lines, then write in Markdown underneath:

   ```
   ---
   title: "What diffusion models miss about intermittency"
   description: One sentence that appears under the title in lists.
   tags: [diffusion, turbulence]
   published: true
   ---
   ```

3. Push. The post appears on the Blog page, in "Recent writing" on the home
   page, under each of its tags, and in the RSS feed at `/feed.xml`.

`_posts/2026-10-05-sample-post.md` shows equations, code, tables and footnotes.
It is hidden (`published: false`); keep it as a reference or delete it.

Notes:

- **Maths** is LaTeX between double dollar signs, for both inline and display
  equations: `$$\theta_i$$`. Single dollar signs are not maths here.
- **Dates**: a post dated in the future stays hidden until that date (Indian
  time, set in `_config.yml`).
- **Drafts**: keep `published: false` while writing. To preview hidden posts on
  your own computer, run `bundle exec jekyll serve --unpublished`.
- **Curly braces**: Jekyll reads `{{` and `{%` as template code. If a post
  needs them literally, for instance in LaTeX, wrap that part in
  `{% raw %}` … `{% endraw %}`.
- **Images**: put them in `assets/img/` and write
  `![Describe the figure](/assets/img/figure.png)`.

## Turn on comments (optional)

Posts can have a comment box powered by [giscus](https://giscus.app). Readers
sign in with GitHub, and the comments live in your repository's Discussions,
so there are no ads and nothing else to host.

1. In the repository that serves the site, open **Settings → General →
   Features** and tick **Discussions**.
2. Install the giscus app on that repository: <https://github.com/apps/giscus>.
3. Go to <https://giscus.app>, type the repository name, and pick the
   **Announcements** category. Further down, the page shows a snippet
   containing `data-repo-id` and `data-category-id`.
4. Copy those two values, and the repository name, into the `comments` section
   of `_config.yml`, then push.

Add `comments: false` to a post's settings to leave the box off that post.

## Preview on your own computer (optional)

The pages are templates, so opening `index.html` directly in a browser shows
unfinished markup. Jekyll has to build the site first.

1. Install Ruby (version 3.0 or later):
   - **macOS**: `brew install ruby`, then follow the note Homebrew prints about
     adding it to your `PATH`. The Ruby that ships with macOS is too old.
   - **Ubuntu / Debian**: `sudo apt install ruby-full build-essential zlib1g-dev`
   - **Windows**: install "Ruby+Devkit" from <https://rubyinstaller.org> and
     accept the default options.
2. In a terminal, go to this folder and run:

   ```
   gem install bundler
   bundle config set --local path vendor/bundle
   bundle install
   bundle exec jekyll serve
   ```

   The first `bundle install` downloads Jekyll and takes a few minutes.
3. Open <http://localhost:4000>.

Leave `jekyll serve` running while you edit. It rebuilds whenever you save a
file; refresh the browser to see the change. Stop it with Ctrl+C. A change to
`_config.yml` only takes effect after you stop and start it again.

To see a post dated in the future or marked `published: false`, start it with
`bundle exec jekyll serve --future --unpublished`.

## Where things are

```
_config.yml        site title, description, timezone
_data/             all content (see the table above)
_posts/            blog posts
_layouts/          page skeletons: default, page, post
_includes/         reusable pieces: header, footer, a paper, a position, news,
                   icons (icon.html), the CV button
index.html         home page
experience.html, projects.html, publications.html, cv.html
blog/              blog index and tag index
assets/css/main.css      all styling; colours and fonts are set at the top
assets/js/xy-model.js    the XY-model simulation on the home page
assets/js/site.js        light/dark switch, header line, "Copy BibTeX" buttons
assets/fonts/            Newsreader and Instrument Sans (SIL Open Font License)
assets/img/              portrait and favicon
```

To add a page, copy `experience.html`, change its `title` and `permalink`, and
add it to `_data/navigation.yml`.

The home-page simulation is a 32 × 32 XY model drawn as arrows. Its caption
is in `_includes/xy-model.html`. To remove it, delete the
`{% include xy-model.html %}` line from `index.html`.
