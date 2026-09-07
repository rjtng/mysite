"""
Renders assets/img/og-cover.png — the 1200x630 image that Facebook, LinkedIn
and X show when the site is linked. They will not render an SVG, which is why
this exists as a separate step rather than reusing og-cover.svg.

    python tools/make-og.py

Needs Pillow. Fonts are downloaded once into tools/.fonts/ and cached there.
Keep it in step with the palette in assets/css/styles.css.
"""

import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "tools", ".fonts")
OUT = os.path.join(ROOT, "assets", "img", "og-cover.png")

W, H = 1200, 630

BG    = (5, 10, 22)
TEXT  = (233, 241, 252)
MUTED = (148, 170, 201)
DIM   = (103, 128, 159)
BLUE  = (44, 123, 242)
SKY   = (99, 205, 255)

FONTS = {
    "Sora": "ofl/sora/Sora%5Bwght%5D.ttf",
    "Inter": "ofl/inter/Inter%5Bopsz,wght%5D.ttf",
    "JetBrainsMono": "ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}


def font_path(name):
    os.makedirs(FONT_DIR, exist_ok=True)
    path = os.path.join(FONT_DIR, name + ".ttf")
    if not os.path.exists(path):
        url = "https://raw.githubusercontent.com/google/fonts/main/" + FONTS[name]
        print("downloading", name)
        urllib.request.urlretrieve(url, path)
    return path


def load(name, size, weight=None):
    f = ImageFont.truetype(font_path(name), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass  # static build, or FreeType without variable-font support
    return f


def blob(size, colour, alpha):
    """A soft radial glow.

    Image.radial_gradient is 0 at the centre and 255 at the *corners*, so it
    is still around 180 at the edge midpoints. Pasting that straight leaves
    visible square seams, so the ramp is clamped to reach zero at 128 — the
    inscribed circle — and everything outside it is fully transparent.
    """
    mask = Image.radial_gradient("L").resize((size, size), Image.LANCZOS)
    mask = mask.point(lambda v: int(max(0.0, 1.0 - v / 128.0) * alpha * 255))
    layer = Image.new("RGB", (size, size), colour)
    return layer, mask


def gradient_text(text, font, c1, c2):
    """Text filled with a left-to-right gradient, returned as an RGBA image.

    The box is measured from the glyphs so the ramp spans the word itself —
    sizing it to a fixed box would stop the gradient partway through.
    """
    box = font.getbbox(text)
    w, h = box[2] + 4, box[3] + 12
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=font, fill=255)

    grad = Image.new("RGB", (w, h))
    px = grad.load()
    for x in range(w):
        t = x / max(w - 1, 1)
        px[x, 0] = (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )
    grad = grad.resize((w, h))
    for y in range(1, h):
        grad.paste(grad.crop((0, 0, w, 1)), (0, y))

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def main():
    img = Image.new("RGB", (W, H), BG)

    # grid
    grid = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(grid)
    for x in range(0, W, 48):
        g.line([(x, 0), (x, H)], fill=(20, 34, 58))
    for y in range(0, H, 48):
        g.line([(0, y), (W, y)], fill=(20, 34, 58))
    img = Image.blend(img, grid, 0.55)

    # glows
    layer, mask = blob(900, BLUE, 0.60)
    img.paste(layer, (-320, -400), mask)
    layer, mask = blob(760, SKY, 0.30)
    img.paste(layer, (760, 300), mask)

    d = ImageDraw.Draw(img)

    mono = load("JetBrainsMono", 25, 500)
    d.text((88, 218), "C O M P U T E R   E N G I N E E R", font=mono, fill=SKY)

    display = load("Sora", 112, 600)
    d.text((84, 268), "Al-Raji", font=display, fill=TEXT)

    theng = gradient_text("Theng", display, BLUE, SKY)
    img.paste(theng, (84, 378), theng)

    # hairline, fading out to the right
    for x in range(88, 708):
        t = (x - 88) / 620
        v = int(99 * (1 - t)), int(205 * (1 - t)), int(255 * (1 - t))
        d.point((x, 528), fill=(max(v[0], 5), max(v[1], 10), max(v[2], 22)))

    body = load("Inter", 25, 400)
    d.text((88, 552), "Web & mobile development  ·  Computer vision  ·  Networks",
           font=body, fill=MUTED)

    small = load("JetBrainsMono", 21, 400)
    right = "github.com/rjtng"
    w = d.textlength(right, font=small)
    d.text((W - 88 - w, 554), right, font=small, fill=DIM)

    img.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
