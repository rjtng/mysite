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

## make-og.py

Regenerates `assets/img/og-cover.png`, the 1200x630 image that Facebook,
LinkedIn and X show when the site is linked. Those platforms will not render an
SVG, which is why this is a raster step.

    python tools/make-og.py

Needs Pillow. On first run it downloads Sora, Inter and JetBrains Mono into
`tools/.fonts/` and caches them there; that folder is gitignored. Keep the
colours in the script in step with the palette at the top of
`assets/css/styles.css`.
