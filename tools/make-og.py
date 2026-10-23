"""
Renders assets/img/og-cover.png — the 1200x630 image that Facebook, LinkedIn
and X show when the site is linked. They will not render an SVG, which is why
this exists as a separate step.

    python tools/make-og.py

Needs Pillow. Fonts are downloaded once into tools/.fonts/ and cached there.
Keep it in step with the palette in assets/css/styles.css: paper, a dot grid,
near-black ink, and the project screens on a wall tipped away to the right,
as on the landing page.
"""

import os
import urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "tools", ".fonts")
OUT = os.path.join(ROOT, "assets", "img", "og-cover.png")

W, H = 1200, 630

PAPER = (242, 241, 237)
DOT   = (213, 212, 207)
INK   = (27, 27, 25)
MUTED = (100, 98, 93)

FONTS = {
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
    """The font at a weight. Axes are set by name: Inter lists optical size
    before weight, so a bare [weight] would land on the wrong axis."""
    f = ImageFont.truetype(font_path(name), size)
    if weight is not None:
        try:
            values = []
            for axis in f.get_variation_axes():
                label = axis["name"].decode() if isinstance(axis["name"], bytes) else axis["name"]
                if label.lower() == "weight":
                    values.append(weight)
                elif "optical" in label.lower():
                    values.append(min(max(size, axis["minimum"]), axis["maximum"]))
                else:
                    values.append(axis["default"])
            f.set_variation_by_axes(values)
        except Exception:
            pass  # static build, or FreeType without variable-font support
    return f


# --- the wall ---------------------------------------------------------------
# Simplified copies of the mock screens on the page, drawn flat on a plane and
# then warped into perspective.

CARD_W, CARD_H, GAP = 300, 188, 26


def screen(d, x, y, kind):
    """One project screen, in the palette of its mock on the page."""
    r = (x, y, x + CARD_W, y + CARD_H)
    if kind == "navy":
        bg, bar, side, ink, line = (16, 26, 49), (23, 37, 64), (13, 23, 42), (228, 245, 255), (60, 99, 141)
    elif kind == "warm":
        bg, bar, side, ink, line = (247, 245, 240), (255, 255, 255), (240, 237, 230), (64, 62, 98), (217, 213, 236)
    else:
        bg, bar, side, ink, line = (241, 246, 252), (255, 255, 255), (233, 241, 250), (23, 58, 115), (207, 224, 243)
    d.rounded_rectangle(r, 6, fill=bg)
    d.rectangle((x, y + 6, x + CARD_W, y + 22), fill=bar)
    d.rounded_rectangle((x, y, x + CARD_W, y + 22), 6, fill=bar)
    d.rectangle((x, y + 22, x + 34, y + CARD_H - 6), fill=side)
    for i in range(3):
        d.ellipse((x + 8 + i * 7, y + 9, x + 12 + i * 7, y + 13), fill=line)
    tx = x + 50
    d.rectangle((tx, y + 44, tx + 120, y + 54), fill=ink)
    d.rectangle((tx, y + 60, tx + 84, y + 70), fill=ink)
    if kind == "navy":
        d.rounded_rectangle((tx, y + 88, x + CARD_W - 16, y + CARD_H - 18), 5,
                            fill=(31, 58, 88), outline=line)
        cx, cy = (tx + x + CARD_W - 16) // 2, (y + 88 + y + CARD_H - 18) // 2
        d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), outline=(99, 205, 255), width=2)
    elif kind == "warm":
        for i, w in enumerate((200, 170, 184, 136)):
            d.rounded_rectangle((tx, y + 88 + i * 14, tx + w, y + 96 + i * 14), 2, fill=line)
        for i, h in enumerate((14, 22, 17, 28, 20)):
            bx = tx + i * 40
            d.rectangle((bx, y + CARD_H - 14 - h, bx + 34, y + CARD_H - 14), fill=(142, 131, 212))
    else:
        for i in range(3):
            d.rounded_rectangle((tx + i * 74, y + 86, tx + i * 74 + 66, y + 112), 4,
                                fill=(255, 255, 255), outline=(219, 231, 244))
        for i, w in enumerate((226, 186, 140)):
            d.rounded_rectangle((tx, y + 126 + i * 12, tx + w, y + 131 + i * 12), 3, fill=line)


def marks(d, x, y, colours):
    """A card of brand marks, as roundels in the marks' colours."""
    d.rounded_rectangle((x, y, x + CARD_W, y + CARD_H), 6, fill=(22, 22, 24))
    n = len(colours)
    span = n * 40 + (n - 1) * 22
    for i, c in enumerate(colours):
        cx = x + (CARD_W - span) // 2 + i * 62 + 20
        d.ellipse((cx - 20, y + 64, cx + 20, y + 104), fill=c)
    d.rectangle((x + 20, y + CARD_H - 26, x + 120, y + CARD_H - 21), fill=(90, 90, 92))


def phones(d, x, y):
    for i in range(3):
        px = x + 54 + i * 70
        py = y + 18 - (8 if i == 1 else 0)
        d.rounded_rectangle((px, py, px + 58, py + 150), 12, fill=(18, 18, 20))
        d.rounded_rectangle((px + 4, py + 4, px + 54, py + 146), 9, fill=(247, 245, 240))
        d.rectangle((px + 10, py + 24, px + 40, py + 30), fill=(64, 62, 98))
        for j in range(4):
            d.rectangle((px + 10, py + 44 + j * 10, px + 46 - (j % 2) * 8, py + 48 + j * 10), fill=(217, 213, 236))
        for j, h in enumerate((10, 16, 12, 20)):
            d.rectangle((px + 10 + j * 10, py + 120 - h, px + 17 + j * 10, py + 120), fill=(142, 131, 212))


def plane():
    """Rows of screens, staggered like the wall on the page."""
    cols, rows = 5, 4
    pw = cols * (CARD_W + GAP) + CARD_W // 2 + GAP
    ph = rows * (CARD_H + GAP) + GAP
    img = Image.new("RGBA", (pw, ph), PAPER + (0,))
    shadow = Image.new("L", (pw, ph), 0)
    sd = ImageDraw.Draw(shadow)
    d = ImageDraw.Draw(img)
    order = ["light", "marks1", "navy", "phones", "warm", "navy", "marks2", "light", "warm", "navy"]
    k = 0
    for r in range(rows):
        for c in range(cols):
            x = GAP + c * (CARD_W + GAP) + (CARD_W // 2 if r % 2 else 0)
            y = GAP + r * (CARD_H + GAP)
            kind = order[(k + r * 3) % len(order)]
            k += 1
            if kind != "phones":
                sd.rounded_rectangle((x + 4, y + 18, x + CARD_W - 4, y + CARD_H + 16), 10, fill=120)
            if kind == "phones":
                phones(d, x, y)
            elif kind == "marks1":
                marks(d, x, y, [(119, 123, 180), (77, 127, 165), (141, 107, 190)])
            elif kind == "marks2":
                marks(d, x, y, [(26, 130, 200), (65, 128, 180), (224, 65, 25), (133, 115, 182)])
            else:
                screen(d, x, y, kind)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    base = Image.new("RGBA", (pw, ph), (60, 52, 36, 0))
    base.putalpha(shadow.point(lambda v: int(v * .55)))
    base.alpha_composite(img)
    return base


def perspective_coeffs(dst, src):
    """Coefficients for Image.PERSPECTIVE that map each dst corner to its src
    corner, by solving the eight equations directly (no numpy needed)."""
    m, v = [], []
    for (x, y), (u, w) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); v.append(u)
        m.append([0, 0, 0, x, y, 1, -w * x, -w * y]); v.append(w)
    n = 8
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(m[r][i]))
        m[i], m[p], v[i], v[p] = m[p], m[i], v[p], v[i]
        for r in range(n):
            if r != i:
                f = m[r][i] / m[i][i]
                m[r] = [a - f * b for a, b in zip(m[r], m[i])]
                v[r] -= f * v[i]
    return [v[i] / m[i][i] for i in range(n)]


def main():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    for y in range(11, H, 22):
        for x in range(11, W, 22):
            d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=DOT)

    # The wall, tipped back and climbing to the right, as on the page.
    flat = plane()
    pw, ph = flat.size
    quad = [(520, 70), (1440, -170), (1610, 470), (610, 760)]
    coeffs = perspective_coeffs(quad, [(0, 0), (pw, 0), (pw, ph), (0, ph)])
    wall = flat.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    # Fade it in from the left so the name sits on clean paper.
    fade = Image.new("L", (W, H), 0)
    fp = fade.load()
    for x in range(W):
        a = min(1.0, max(0.0, (x - 540) / 300))
        for y in range(H):
            fp[x, y] = int(a * 255)
    alpha = Image.composite(wall.getchannel("A"), Image.new("L", (W, H), 0), fade)
    wall.putalpha(alpha)
    img.paste(wall, (0, 0), wall)

    d = ImageDraw.Draw(img)
    mono = load("JetBrainsMono", 20, 400)
    d.text((80, 236), "Computer Engineer · Lamitan City, Basilan, PH", font=mono, fill=MUTED)

    name = load("Inter", 86, 600)
    d.text((76, 270), "Al-Raji Theng", font=name, fill=INK)

    body = load("Inter", 25, 400)
    d.text((80, 388), "Web & mobile development", font=body, fill=MUTED)
    d.text((80, 422), "Computer vision · Networks", font=body, fill=MUTED)

    small = load("JetBrainsMono", 19, 400)
    d.text((80, 548), "rjtg.vercel.app", font=small, fill=MUTED)

    img.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
