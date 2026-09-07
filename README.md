# alrajitheng — personal portfolio

A single-page portfolio for Al-Raji Theng. Plain HTML, CSS and JavaScript. No
framework, no build step, no dependencies. Around 100 KB before the webfonts.

```
index.html                 the whole page
assets/css/styles.css      all styles
assets/js/main.js          nav, mobile sheet, reveals, credential rendering
assets/js/data-certs.js    generated — 60 Credly credentials
assets/img/favicon.svg     tab icon
assets/img/og-cover.png    1200x630 social card
tools/fetch-credly.ps1     regenerates data-certs.js from Credly
tools/make-og.py           regenerates og-cover.png
vercel.json                headers and caching
```

The previous design is kept in `.backup-2026-09-07/`. It is excluded from git
and from Vercel, so it costs nothing — delete the folder when you no longer
want it.

---

## Read this before you publish

I wrote the copy from your public profiles: GitHub, Credly, and the g.dev link
on your GitHub. **LinkedIn blocks automated access and g.dev requires a login,
so nothing on this page came from either of them.** A few passages are my
invention. They are marked with `EDIT:` comments in `index.html`.

**Written by me, needs your confirmation:**

1. **"Open to work"** in the hero, at line 107.
2. **The third paragraph of each case study** in Projects, at line 407 — the
   state rewrite in ReadySetHire, the design reasoning on Barangay Maganda.
   Both are invented. They are there to show the shape a good case study takes.
   Replace them with the problem you actually hit. Specific and slightly
   awkward beats polished, because it is the part an interviewer asks about.
3. **The Experience section** at line 563 covers study and personal projects
   only, because I had no employment data. If you have had jobs, internships or
   OJT, they go at the top of that list.
4. **The About section's voice.** It says you learn from structured courses
   because there is no senior developer nearby, and that you want to join a
   team. Read it as if a stranger will judge you on it, and change anything
   that is not you.
5. **The "right now" list** in About, at line 267. These go stale fastest.
6. **Location.** The page says Philippines, and the portrait card says
   Zamboanga. Your GitHub only gives the country — narrow or widen it as you
   prefer.
7. **DICT FRCC and ReyCoin** are described as team projects where you did the
   front end and the server-side logic respectively. Both are forks on your
   GitHub, so I could not verify the split. Correct it if it is wrong.

**Taken from your real profiles, safe as-is:** all 60 credentials with their
issue dates and verification links, the six repositories, the skill lists, and
Universidad de Zamboanga.

---

## Adding your photo

The hero shows an "AT" monogram on a gradient until you add a picture. Save one
as `assets/img/portrait.jpg` — portrait crop, roughly 4:5, 800px wide is
plenty — then find the `EDIT:` comment in the hero of `index.html` and delete
the two comment markers around the `<img>` line just below it. The photo sits
on top of the monogram.

It is commented out rather than always present so the page never requests a
file that is not there. A missing portrait would otherwise log a 404 on every
visit, which is the sort of thing someone notices if they open devtools.

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
`https://alrajitheng.vercel.app/`. If your deployment lands on a different
hostname, change it in three places:

- the `canonical`, `og:url` and both image tags in `index.html`
- the `Sitemap:` line in `robots.txt`
- the `<loc>` in `sitemap.xml`

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
tags each badge with an issuer, and writes the file. Which twelve badges appear
in the featured grid is set by the `$featured` array near the top of that
script — edit the list there, not in the generated file.

The headline counts, the issuer filter buttons and the full record all derive
from that one file, so they stay correct on their own. Projects, skills and the
experience timeline are hand-written in `index.html`.

Credly stores badge art as 1200px PNGs, roughly 400 KB each, for a 58px slot.
`main.js` rewrites those URLs to Credly's 110px and 220px variants, which cuts
each one to about 9 KB. Two older badges use a `/blob` URL that ignores the
resize and are left at full size.

## Regenerating the social card

```bash
python tools/make-og.py
```

Needs Pillow. It downloads Sora, Inter and JetBrains Mono into `tools/.fonts/`
on first run and caches them there. Facebook, LinkedIn and X will not render an
SVG social card, which is why this is a real PNG rather than the vector the
rest of the page uses.

---

## Notes on the design

Sora for display type, Inter for body text, JetBrains Mono for labels and
metadata. The palette runs deep navy through blue to sky and is defined once at
the top of `styles.css` — change `--navy`, `--blue` and `--sky` in `:root` and
the whole page follows, including the gradients and the two background glows.
Everything that is not blue is greyscale on purpose, so the blue reads as an
accent rather than as wallpaper.

Motion is deliberately restrained: a 14px fade on section entry, a slow
technology marquee that pauses on hover, and the rotating job title in the
hero. Nothing else moves. Elements resolve 220px before they scroll into view
so a fast scroll never lands on a blank column.

The entry fades are scoped to a `.js` class set by an inline script in the
head, so a browser without JavaScript gets the full page rather than a blank
one. There is also a 2.6 second timer that reveals everything regardless, in
case the intersection observer never fires — which happens in embedded webviews
and tabs that are never painted.

`prefers-reduced-motion` disables all of it, and a print stylesheet strips the
chrome and prints the content as a plain document.

Accessibility: semantic landmarks, a skip link, visible focus rings,
`aria-expanded` on the mobile menu, Escape to close it, `aria-pressed` on the
credential filters, and text that meets AA contrast on the dark background.
