# alrajitheng — personal portfolio

A single-page portfolio for Al-Raji Theng. Plain HTML, CSS and JavaScript. No
framework, no build step, no dependencies. Around 133 KB of HTML, CSS and
JavaScript before the webfonts and the credential data.

The design follows aedwon.site: warm paper with a dot grid, near-black ink,
and three rooms — a **Wall** of project screens, an **Index** of the projects,
and a **shelf** of six volumes for About. See "Notes on the design" below.

```
index.html                 the whole page
assets/css/styles.css      all styles
assets/js/main.js          theme, Index, wall, shelf, credentials
assets/js/data-certs.js    generated — 60 Credly credentials
assets/img/favicon.svg     tab icon
assets/img/og-cover.png    generated — 1200x630 social card
assets/img/portrait-cutout.webp  generated — the $whoami photo, background removed
assets/img/tech-sprite.svg generated — 42 brand marks
tools/fetch-credly.ps1     regenerates data-certs.js from Credly
tools/fetch-logos.py       regenerates tech-sprite.svg and the skills chips
tools/make-og.py           regenerates og-cover.png
tools/make-cutout.py       regenerates portrait-cutout.webp
vercel.json                headers and caching
```

The previous design is kept in `.backup-2026-09-07/`. It is excluded from git
and from Vercel, so it costs nothing — delete the folder when you no longer
want it.

---

## Read this before you publish

The copy comes from your public profiles: GitHub, Credly, and the g.dev link
on your GitHub. **LinkedIn blocks automated access and g.dev requires a login,
so nothing on this page came from either of them.** Passages that are a
placeholder are marked with `EDIT:` comments in `index.html`.

**Written for the redesign, needs your confirmation:**

1. **The tagline under your name on the Wall**, "Apps that don't just look
   good — they work." It is a placeholder (marked `EDIT:`); say it your way.
2. **The project types in the Index.** DICT FRCC and Barangay Maganda MIS are
   filed as government systems, RECYCOIN as a web app and ReadySetHire as a
   mobile app. The filters and their counts come from these, in the
   `data-type` on each row.
3. **Location.** The Wall says "Zamboanga City, PH", and the clock under the
   shelf runs on Philippine time.

**Taken from your real profiles, safe as-is:** all 60 credentials with their
issue dates and verification links, the four projects and their repositories,
the skill lists, the experience and affiliation entries, and Universidad de
Zamboanga.

---

## The photo

Vol. 01, `$whoami`, shows `assets/img/portrait-cutout.webp`: your graduation
photo, `portrait.png`, with its white studio backdrop removed, set on a soft
paper-coloured ground and cropped to 4:5 from the top. To use a different
photo, shoot or pick one on a plain white background and run:

```bash
python tools/make-cutout.py path/to/photo.png
```

It needs Pillow and numpy, and writes the cutout in place. Only white that
touches the edge of the frame is removed, so the white collar under the hood
survives. A busy or coloured background will not cut out cleanly with it.

---

## Deploying to Vercel

There is no build step, so Vercel serves the files directly.

**Option A — the dashboard.** Push this folder to a GitHub repository, then at
[vercel.com/new](https://vercel.com/new) import it. When it asks for a
framework, choose **Other**. Leave the build command and output directory
empty. Deploy.

**Option B — the CLI.**

```bash
npx vercel deploy --prod
```

Both give you a `*.vercel.app` URL immediately.

### After the first deploy

The canonical URL, the sitemap and the social card point at
`https://rjtg.vercel.app/`. If your deployment lands on a different hostname,
change it in three places:

- the `canonical`, `og:url` and both image tags in `index.html`
- the `Sitemap:` line in `robots.txt`
- the `<loc>` in `sitemap.xml`

### A note on caching

`/assets/*` used to be served `max-age=31536000, immutable`. That is only safe
when filenames carry a content hash, and these do not, so a returning visitor
would have been pinned to a stale stylesheet or logo sprite for up to a year.
It is now `max-age=3600, must-revalidate`: an hour of hard cache, then a cheap
ETag revalidation that returns a 304 when nothing has changed.

Changing that header does not rescue browsers that already cached the old
stylesheet, because an `immutable` response is never revalidated until it
expires. Only a different URL reaches them, so the stylesheet and scripts carry
a `?v=` token:

```html
<link rel="stylesheet" href="/assets/css/styles.css?v=11" />
<script src="/assets/js/data-certs.js?v=5"></script>
<script src="/assets/js/main.js?v=11"></script>
```

`main.js` carries its own token for the logo sprite it fetches. **Bump the
token on whichever file you change** when you want the change to reach people
immediately rather than within the hour.

---

## Running it locally

Asset paths are absolute (`/assets/...`), which is right for a site served from
a domain root but breaks under `file://`. Serve it from the project root:

```bash
php -S localhost:5174 -t .
```

Then open <http://localhost:5174>. Python works too:

```bash
python -m http.server 5174
```

Do not open `index.html` by double-clicking — the CSS and JS will not load.

---

## Regenerating the credentials

`assets/js/data-certs.js` is generated. When you earn new badges, regenerate it
rather than editing by hand:

```bash
powershell -ExecutionPolicy Bypass -File tools/fetch-credly.ps1
```

The script reads every page of your public Credly feed, sorts by issue date,
tags each badge with an issuer, and writes the file. Vol. 03, Certifications,
uses the complete generated list across its two scrolling rows.

Your top six are chosen by hand, in `TOP_CERTS` near the end of `main.js`. They
fill the badge row in Vol. 01 and open the two certification rows, three each.
Each entry finds its Credly badge by name, which gives it its art and its
verification link; an entry with its own `url` links there instead. An entry
with no Credly badge yet is drawn as a tile with the issuer and title. Claim
the Credly badge, rerun the script, and the real art replaces the tile with no
other change.

The badge images and verification URLs all derive from that one file, so the
showcase stays correct on its own. Projects, skills, experience and
affiliations are hand-written in `index.html`.

Credly stores badge art as 1200px PNGs. `main.js` rewrites those URLs to
Credly's 220px and 440px variants for the responsive marquee. Older badges that
use a `/blob` URL are left at their original source.

## Regenerating the brand marks

```bash
python tools/fetch-logos.py
```

This rebuilds `assets/img/tech-sprite.svg` and the contents of every
`<ul class="chips">` in Vol. 02, Skills. Do not hand-edit inside the chips.

`ICONS` at the top of the script maps a label as written on the page to its
brand mark, and is what the chips look themselves up in — so the skills list
stays hand-written and this only attaches marks to it. Ten skills have no logo
to attach, the networking list mostly, and stay as plain text. The marks on
the Index rows are written by hand, but the script reads their labels too, so
they always stay in the sprite.

On the paper the marks are ink, as in the reference. They take their brand
colour on dark ground — always on the wall's brand-mark cards, and on hover in
the dark theme — and on a hovered Index row, where the eight project colours
all clear 3:1. The script lightens each colour only as far as it must to clear
4.5:1 against the dark theme's background. They stay recognisable: Flutter is
still blue, GitHub still grey.

The sprite is fetched at run time and injected, rather than inlined into the
HTML, so it is cached separately instead of adding roughly 60 KB to every HTML
response. Until it arrives each mark shows as its name in mono, so a blocked
request costs nothing.

## Regenerating the social card

```bash
python tools/make-og.py
```

Needs Pillow. It downloads Inter and JetBrains Mono into `tools/.fonts/` on
first run and caches them there. The card is your name on the dot-grid paper,
with simplified copies of the project screens on a wall tipped back to the
right, as on the landing page. Facebook, LinkedIn and X will not render an SVG
social card, which is why this is a real PNG.

---

## Notes on the design

The layout follows aedwon.site, rebuilt around your own work: nothing of
theirs is copied, only the arrangement. The page has three rooms, which are
the four words in the nav.

**Wall.** The landing screen is your project screens on a plane tipped away
from the viewer, clipped to the column. `main.js` builds it from the Index:
each project gets its screen (three phones for ReadySetHire), a close-up or a
second screen, and a dark card of its brand marks, laid in staggered rows so no
project sits above itself. Hovering a tile keeps that project in colour, washes
the rest back to the paper, and swaps your name in the caption for "02 / 04",
the project and its description. Clicking goes to its row in the Index. On a
phone the first tap shows the caption and a second one goes. The wall drifts a
little slower than the page as you scroll.

**Index.** One row per project: thumbnail, name, type, the marks it was built
with, and a link to the repository. The filters along the top count each type;
"type to find" searches names, roles, descriptions and technologies, and `/`
jumps to it. On a wide screen the panel on the right previews whichever row
the pointer is on; elsewhere the role and description sit under the row. Every
copy of a project screen on the page — thumbnail, preview, wall tiles — is the
one mock in that row's thumbnail, drawn in HTML at 480x300 and scaled, so a
project added to the list turns up everywhere.

**About.** A shelf of six volumes: `$whoami`, Skills, Certifications,
Experience, Affiliations and Contact Me. Clicking a spine pulls it out and
opens that volume under the shelf; one is open at a time, `$whoami` first. The
ids are the old section anchors, so links to `#skills`, `#experience`,
`#certifications` and `#contact` from the previous design still open the right
volume, and `#projects` and `#home` land on the Index and the Wall. The clock
under the shelf is Zamboanga time. Every size on the shelf is a multiple of
`--k`, so on a phone it scales down rather than reflowing.

Inter for everything you read, JetBrains Mono for labels and metadata. The
palette is a handful of custom properties at the top of `styles.css` — paper,
raised paper, ink, muted ink and hairlines — with a dark set under
`[data-theme="dark"]`. The page is light unless a visitor picks dark with the
moon; only that click is remembered.

Without JavaScript the Wall is just your name and tagline, the Index is a plain
list with every description showing, and the six volumes are printed one after
another. `prefers-reduced-motion` stops the drift, the marquee and the
transitions, and a print stylesheet prints the content as a plain document.

Accessibility: semantic landmarks, a skip link, visible focus rings,
`aria-pressed` on the filters and the theme switch, `aria-expanded` on the
spines, a polite status line that reads out how many projects a filter or
search leaves, and focus moved into a volume when it opens. Body and muted text
clear AA contrast on both the paper and the dark theme.
