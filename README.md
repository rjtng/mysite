# alrajitheng — personal portfolio

A portfolio for Al-Raji Theng: one page, plus a page per project. Plain HTML, CSS and JavaScript. No
framework, no build step, no dependencies. Around 133 KB of HTML, CSS and
JavaScript before the webfonts and the credential data.

The design follows aedwon.site: warm paper with a dot grid, near-black ink,
and three rooms — a **Wall** of project screens, an **Index** of the projects,
and a **shelf** of six volumes for About. See "Notes on the design" below.

```
index.html                 the home page: Wall, Index and the shelf
work/*.html                one page per project, opened from the Wall and the Index
assets/css/styles.css      all styles
assets/js/main.js          theme, Index, wall, shelf and reader, credentials
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

1. **The project types in the Index.** DICT FRCC and Barangay Maganda MIS are
   filed as government systems, RECYCOIN as a smart device and ReadySetHire as
   a mobile app. The filters and their counts come from these, in the
   `data-type` on each row.
2. **Location.** The Wall says "Lamitan City, Basilan, Philippines", and the
   clock under the shelf is labelled Lamitan City and runs on Philippine time.

**The project pages, read from the repositories.** Each page in `work/` was
written from that project's code, its README or user manual, its commit
history, and the copy already on this page. Reading them turned up three
corrections, now made here as well:

- **ReadySetHire** was described as a recruitment app for candidate profiles
  and job listings. The code and its user manual are an interview-practice app
  for job seekers (Gemini mock interviews, aptitude tests, a résumé builder), so
  the description and its mock screen now say that.
- **RECYCOIN** was a "web app" built with Bootstrap. It is a reverse vending
  machine — a Raspberry Pi running YOLOv8, servos and sensors, with a PHP and
  MySQL web app styled in Tailwind — so it is now a smart device, with that
  stack.
- **Barangay Maganda MIS**: the repository holds only the administrators'
  sign-in and account creation, so its page stops at the summary, and its
  description and Bootstrap mark are left as they were, unverified. Add what it
  does where the `EDIT:` comment in `work/barangay-maganda.html` says.

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
<link rel="stylesheet" href="/assets/css/styles.css?v=13" />
<script src="/assets/js/data-certs.js?v=5"></script>
<script src="/assets/js/main.js?v=13"></script>
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

The project pages are linked without `.html` (`/work/recycoin`), which Vercel's
`cleanUrls` resolves. Neither server above does, so on them those links 404;
open `/work/recycoin.html` directly, or run the site the way Vercel serves it:

```bash
npx vercel dev
```

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
the project and its description. Clicking opens the project's page. On a
phone the first tap shows the caption and a second one goes. The wall drifts a
little slower than the page as you scroll.

**Index.** One row per project: thumbnail, name, type and the marks it was
built with; the row opens the project's page. The filters along the top count
each type;
"type to find" searches names, roles, descriptions and technologies, and `/`
jumps to it. On a wide screen the panel on the right previews whichever row
the pointer is on; elsewhere the role and description sit under the row. Every
copy of a project screen on the page — thumbnail, preview, wall tiles — is the
one mock in that row's thumbnail, drawn in HTML at 480x300 and scaled, so a
project added to the list turns up everywhere.

**About.** A shelf of six volumes: `$whoami`, Skills, Certifications,
Experience, Affiliations and Contact Me. Clicking a spine takes that book off
the shelf: it slides out spine first, turns to its cover in front of the shelf
and opens on its first spread, the contents facing page 1. After that the
pages go two to a spread, as in a book: 2 and 3, 4 and 5, and so on, with the
bar under the book reading "Contents / 4", then "pp. 2–3 / 4". The arrows, the
contents, the arrow keys or a swipe turn the pages, and from the last page
Next opens the following volume; "Back to shelf" or Escape puts the book back.
On a narrow screen it opens to one page at a time, in the same order. The book
is a box in 3D while it moves and is flattened once it lies open, so the pages
are ordinary, crisp layout.

Each volume in `index.html` is a run of `<section class="vol__page">`, each
with its `<h4 class="vol__page-title">`; the title is the page's line in the
contents. To add a page, add a section. The reader moves the sections into
the book while they show and puts them back after, and sizes each book to its
longest page. The ids are the old section anchors, so links to `#skills`,
`#experience`, `#certifications` and `#contact` from the previous design still
open the right book, and `#projects` and `#home` land on the Index and the
Wall. The clock under the shelf is Lamitan City's (Philippine) time. Every
size on the shelf is a multiple of `--k`.

**On a phone** (760px and narrower), the layout follows the reference's
phone version. The four sections move to a tab bar at the foot, and the header
keeps only the name and the theme switch. The Wall becomes a feed of one
project to a screen: its number, name and line stay pinned at the foot and
fade from one project to the next, and a rail of ticks down the side marks the
way. The Index drops to names, marks and type icons under "All projects" and
"Find a project". The shelf becomes a pile of books lying on their sides, and
a tapped one comes off the pile and opens full screen, with Close in the
header and "← 1 / 5 →" at the foot. One page shows at a time, falling either
side of the spine as in a real book, with the edge of the facing page in view.
The book slides along within a spread, and a page turns over between spreads.

**Project pages.** `/work/<project>`, after the reference's case pages: the
facts in a column that stays put on the left — summary, marks, type, role,
dates, the repository — and on the right the project's screen in a card, three
highlights and a few short sections. The rail at the far right marks the
section in view and jumps to one when clicked. "Back to the wall" becomes
"Back to the index" when that is where the visit began, and Previous and Next
walk the projects in Index order. The pages are plain HTML; the mock screen on
each is a copy of the one in its Index row, so change both together. To add a
project, add its row to the Index and a page beside the others in `work/`,
and list it in `sitemap.xml`.

**Moving between pages.** Links within the site don't reload the page. The
router at the end of `main.js` fetches the next page, swaps its `<main>` and
footer in, and updates the title, description and canonical; the header stays,
so the theme and nav never flicker. Every move is a history entry that
remembers its scroll position, so Back and Forward return to the same place,
and "Back to the wall" steps back in history when that is where the visit
came from. Taking a book off the shelf or putting it back replaces the entry
rather than adding one. Pages are fetched when the pointer reaches a link, so they are
usually ready by the click; a slow one shows a thin bar under the nav, and
browsers with view transitions crossfade. Anything that goes wrong falls back
to an ordinary page load, which is what every link is without JavaScript.

Each page's behaviour is set up by `initPage()` when its content arrives, and
anything it hangs on `window` or `document` goes through `onPage()` or
`atLeave()`, so `teardown()` can release it before the next page replaces it.
New code that listens outside the page's own content should do the same.

Inter for everything you read, JetBrains Mono for labels and metadata. The
palette is a handful of custom properties at the top of `styles.css` — paper,
raised paper, ink, muted ink and hairlines — with a dark set under
`[data-theme="dark"]`. The page is light unless a visitor picks dark with the
moon; only that click is remembered.

Without JavaScript the Wall is just your name and location, the Index is a
plain list with every description showing, and the six volumes are printed one
after another, page by page (on a phone the tab bar still works).
`prefers-reduced-motion` stops the drift, the marquee, the transitions and the
book's flight (it opens and closes at once), and a print stylesheet prints the
content as a plain document.

Accessibility: semantic landmarks, a skip link, visible focus rings,
`aria-pressed` on the filters and the theme switch, `aria-expanded` on the
spines, a polite status line that reads out how many projects a filter or
search leaves, focus moved into the book when it opens and back to its spine
when it closes, and the page announced as it turns. Body and muted text
clear AA contrast on both the paper and the dark theme.
