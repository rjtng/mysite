# tools

Five generators. None of them run at deploy time — the site is served as static
files — so run them by hand when the source data changes and commit the result.

## fetch-credly.ps1

Regenerates `assets/js/data-certs.js` from the public Credly profile at
https://www.credly.com/users/rjt

Run it from the project root with Windows PowerShell:

    powershell -ExecutionPolicy Bypass -File tools/fetch-credly.ps1

It re-reads every page of the public badge feed, classifies each badge by brand
and domain, and rewrites the data file. The marquee in Vol. 03, Certifications,
uses the complete generated list across its two scrolling rows, after the
hand-picked top six (`TOP_CERTS` in `main.js`), which find their badges in this
file by name.

The badge images and verification URLs in the marquee are all derived from that
one file, so the showcase stays current after regeneration.

## fetch-logos.py

Rebuilds the brand marks used by the skills chips and the project Index.

    python tools/fetch-logos.py

It writes `assets/img/tech-sprite.svg` and the contents of every
`<ul class="chips">`. Both are regenerated from scratch each run, so it is safe
to re-run. Do not hand-edit inside the chips.

`ICONS` at the top of the script maps a label as written on the page to its
mark. The chips rewrite reads the label already in the HTML and keeps the `key`
class, so the skills list stays hand-authored; a label with no `ICONS` entry is
left as plain text, which covers subnetting, DHCP and the rest of the
networking list. The marks on the Index rows are written by hand, but the
script also reads every `tech__name` on the page, so their symbols always stay
in the sprite.

Marks come from Simple Icons, which publishes the official single-colour version
of each logo. Simple Icons dropped C# and Java over trademark concerns, so those
two come from Devicon's monochrome "plain" variants. Brand colours come from the
two projects' own data files, not from memory.

Symbol ids are derived from the source slug rather than the label. Deriving them
from the label stripped punctuation, which collapsed both "C++" and "C#" to `c`
— one id for two logos, so C# rendered the C++ mark until this was fixed.

Colour is held to 4.5:1 against the dark theme's background (`PAGE_BG`). On
the light page the chip marks stay ink; they take their colour only on dark
ground — the wall's brand-mark cards, and on hover in the dark theme — so that
is the ground the colours are tuned for. Anything darker is walked toward
white until it clears; the script prints every colour it changed.

## make-og.py

Regenerates `assets/img/og-cover.png`, the 1200x630 image that Facebook,
LinkedIn and X show when the site is linked. Those platforms will not render an
SVG, which is why this is a raster step.

    python tools/make-og.py

Needs Pillow. On first run it downloads Inter and JetBrains Mono into
`tools/.fonts/` and caches them there; that folder is gitignored. The card is
the name on the dot-grid paper with a tilted wall of simplified project
screens to the right, warped into perspective by the script itself (no numpy).
Keep the colours in the script in step with the palette at the top of
`assets/css/styles.css`.

## make-cutout.py

Regenerates `assets/img/portrait-cutout.webp`, the `$whoami` photo with its
white backdrop removed.

    python tools/make-cutout.py [source] [output] [height] [keep]

Defaults to `assets/img/portrait.png`, the graduation photo, 1100px tall,
keeping the top 0.88 of the frame. Needs Pillow and numpy. The background is the
near-white region that touches the frame's edge, so enclosed white — the collar
under the hood — is kept.
Edge pixels fade by their distance from white and the outermost ring is
feathered, which keeps a pale halo off it on the dark theme.

## fetch-badge-art.py

Downloads the Credly badge art for the top certifications into
`assets/img/badges/`, so the page can serve its own copies.

    python tools/fetch-badge-art.py

`BADGES` at the top maps each file name to the badge's name exactly as it
appears in `assets/js/data-certs.js`, which is where the image URLs come from:
run `fetch-credly.ps1` first when the badges change. Each badge is saved as a
220px WebP for 1x screens and a 440px one for 2x. Needs Pillow and network
access to `images.credly.com`.
