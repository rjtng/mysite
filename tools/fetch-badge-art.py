"""Download the badge art for the top certifications into assets/img/badges.

    python tools/fetch-badge-art.py

The page then serves these copies instead of loading the images from Credly
on every visit. Image URLs come from assets/js/data-certs.js, which
fetch-credly.ps1 writes from the public profile, so run that first when the
badges change. Each badge is saved twice as WebP: 220px, shown at 1x, and
440px for 2x screens.

Needs Pillow, and network access to images.credly.com.
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

# File name -> the badge's name exactly as it appears in data-certs.js. The
# file name is what TOP_CERTS in assets/js/main.js refers to as `art`.
BADGES = {
    "ibm-full-stack-software-developer": "IBM Full Stack Software Developer Professional Certificate (V5)",
    "ibm-ai-developer": "IBM AI Developer Professional Certificate",
    "ibm-data-engineering": "IBM Data Engineering Professional Certificate (V3)",
    "ibm-data-analytics-excel-r": "IBM Data Analytics with Excel and R Professional Certificate",
    "ibm-cybersecurity-analyst": "IBM Cybersecurity Analyst Professional Certificate (V2)",
    "google-ux-design": "Google UX Design Professional Certificate",
}
SIZES = ((220, ""), (440, "@2x"))

root = Path(__file__).resolve().parent.parent
source = (root / "assets/js/data-certs.js").read_text(encoding="utf-8-sig")
certs = {c["name"]: c for c in json.loads(source[source.index("["):source.rindex("]") + 1])}
out = root / "assets/img/badges"
out.mkdir(parents=True, exist_ok=True)

missing = [name for name in BADGES.values() if name not in certs]
if missing:
    sys.exit("Not in data-certs.js: " + "; ".join(missing))

for slug, name in BADGES.items():
    original = certs[name]["img"]
    for size, suffix in SIZES:
        # Credly serves resized copies under /size/WxH/, except for the older
        # "/blob" images, which only exist as the original.
        url = original if original.endswith("/blob") else original.replace("/images/", f"/size/{size}x{size}/images/", 1)
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (portfolio badge art)"})
        with urllib.request.urlopen(request, timeout=30) as response:
            art = Image.open(io.BytesIO(response.read())).convert("RGBA")
        art.thumbnail((size, size), Image.LANCZOS)
        path = out / f"{slug}{suffix}.webp"
        art.save(path, "WEBP", quality=90, method=6)
        print(f"{path.relative_to(root)}  {art.width}x{art.height}  {path.stat().st_size // 1024} KB")
