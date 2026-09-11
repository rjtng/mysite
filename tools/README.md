# tools

Three generators. None of them run at deploy time — the site is served as static
files — so run them by hand when the source data changes and commit the result.

## fetch-credly.ps1

Regenerates `assets/js/data-certs.js` from the public Credly profile at
https://www.credly.com/users/rjt

Run it from the project root with Windows PowerShell:

    powershell -ExecutionPolicy Bypass -File tools/fetch-credly.ps1

It re-reads every page of the public badge feed, classifies each badge by brand
and domain, and rewrites the data file. The marquee uses the complete generated
list and alternates badges between its two scrolling rows.

The badge images and verification URLs in the marquee are all derived from that
one file, so the showcase stays current after regeneration.

## fetch-logos.py

Rebuilds the brand marks used in two places: the hero marquee and the skills
chips.

    python tools/fetch-logos.py

It writes `assets/img/tech-sprite.svg`, the region between the `tech-marquee`
markers in `index.html`, and the contents of every `<ul class="chips">`. All
three are regenerated from scratch each run, so it is safe to re-run. Do not
hand-edit inside them.

`MARQUEE` at the top of the script is the strip, in scroll order. `ICONS` maps a
label as written on the page to its mark. The chips rewrite reads the label
already in the HTML and keeps the `key` class, so the skills list stays
hand-authored; a label with no `ICONS` entry is left as plain text, which covers
subnetting, DHCP and the rest of the networking list.

Marks come from Simple Icons, which publishes the official single-colour version
of each logo. Simple Icons dropped C# and Java over trademark concerns, so those
two come from Devicon's monochrome "plain" variants. Brand colours come from the
two projects' own data files, not from memory.

Symbol ids are derived from the source slug rather than the label. Deriving them
from the label stripped punctuation, which collapsed both "C++" and "C#" to `c`
— one id for two logos, so C# rendered the C++ mark until this was fixed.

Colour is held to 4.5:1 against the page background. That is the WCAG AA floor
for normal text rather than the 3:1 that would do for a graphic, because the
colour carries the label as well as the mark. Anything darker is walked toward
white until it clears; the script prints every colour it changed.

## make-og.py

Regenerates `assets/img/og-cover.png`, the 1200x630 image that Facebook,
LinkedIn and X show when the site is linked. Those platforms will not render an
SVG, which is why this is a raster step.

    python tools/make-og.py

Needs Pillow. On first run it downloads Sora, Inter and JetBrains Mono into
`tools/.fonts/` and caches them there; that folder is gitignored. Keep the
colours in the script in step with the palette at the top of
`assets/css/styles.css`.
