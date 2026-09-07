# tools

Two generators. Neither runs at deploy time — the site is served as static
files — so run them by hand when the source data changes and commit the result.

## fetch-credly.ps1

Regenerates `assets/js/data-certs.js` from the public Credly profile at
https://www.credly.com/users/rjt

Run it from the project root with Windows PowerShell:

    powershell -ExecutionPolicy Bypass -File tools/fetch-credly.ps1

It re-reads every page of the public badge feed, classifies each badge by brand
and domain, and rewrites the data file. The `$featured` array near the top
decides which twelve appear in the badge grid on the page.

The headline counts, the issuer filter buttons and the full record on the page
are all derived from that one file, so they stay correct on their own.

## fetch-logos.py

Rebuilds the technology strip in the hero marquee.

    python tools/fetch-logos.py

Edit the `TECH` list at the top to add, remove or reorder technologies, then
re-run it. It writes `assets/img/tech-sprite.svg` and rewrites the region
between the `tech-marquee` markers in `index.html`. Do not hand-edit between
those markers.

Marks come from Simple Icons, which publishes the official single-colour
version of each logo. Simple Icons dropped C# and Java over trademark
concerns, so those two come from Devicon's monochrome "plain" variants.

Each mark is stripped of its own fill and drawn in `currentColor`, so the strip
sits quiet in the page palette and lights up in the brand colour on hover. The
brand colours come from the two projects' own data files, not from memory. Ten
of them are too dark to read on this background, so the script walks each one
toward white only as far as it must to clear 3.6:1 and prints what it changed.
GitHub's brand black, for instance, ships as `#181717` and lands at `#747373`.

## make-og.py

Regenerates `assets/img/og-cover.png`, the 1200x630 image that Facebook,
LinkedIn and X show when the site is linked. Those platforms will not render an
SVG, which is why this is a raster step.

    python tools/make-og.py

Needs Pillow. On first run it downloads Sora, Inter and JetBrains Mono into
`tools/.fonts/` and caches them there; that folder is gitignored. Keep the
colours in the script in step with the palette at the top of
`assets/css/styles.css`.
