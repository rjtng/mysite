"""Cut the hero photo out of a pure-white studio backdrop.

    python tools/make-cutout.py [source] [output] [height] [keep]

Defaults: assets/img/portrait2.png -> assets/img/portrait-cutout.webp, scaled
to 1200px tall, keeping the top 0.75 of the frame (head to waist).

Background is the near-white region connected to the image border, so white
clothing enclosed by the subject (a shirt under a blazer) survives. Pixels
just inside that region fade by their distance from white, with the white
bled out of their colour, and the outermost ring is feathered, so hair and
shoulders do not carry a pale halo onto the dark hero.

Needs Pillow and numpy.
"""
import sys

import numpy as np
from PIL import Image

args = sys.argv[1:]
src = args[0] if len(args) > 0 else "assets/img/portrait2.png"
dst = args[1] if len(args) > 1 else "assets/img/portrait-cutout.webp"
out_h = int(args[2]) if len(args) > 2 else 1200
keep = float(args[3]) if len(args) > 3 else 0.75

rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = rgb.shape
lowest = rgb.min(axis=2)          # how far the pixel is from white
candidate = lowest >= 226


def grow(mask):
    """One step of 4-connected dilation."""
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def dilate(mask, steps):
    for _ in range(steps):
        mask = grow(mask)
    return mask


# Flood fill from the border through near-white pixels.
bg = np.zeros_like(candidate)
for edge in (np.s_[0, :], np.s_[-1, :], np.s_[:, 0], np.s_[:, -1]):
    bg[edge] = candidate[edge]
while True:
    grown = grow(bg) & candidate
    if (grown == bg).all():
        break
    bg = grown

ring = dilate(bg, 1) & ~bg
band = dilate(bg, 4) & ~bg

alpha = np.ones((h, w), np.float32)
alpha[bg] = 0.0
edge_alpha = np.clip((235.0 - lowest) / 70.0, 0.0, 1.0)
alpha[band] = np.minimum(alpha[band], edge_alpha[band])
alpha[ring] *= 0.45               # the photo's own pale rim lives here

# Un-mix the white from partially transparent pixels.
a = alpha[..., None]
clean = np.clip((rgb - (1.0 - a) * 255.0) / np.maximum(a, 1e-3), 0, 255)
colour = np.where(a < 1.0, clean, rgb)

img = Image.fromarray(np.dstack([colour, alpha * 255.0]).round().astype(np.uint8), "RGBA")
solid = img.getchannel("A").point(lambda v: 255 if v > 8 else 0)
left, top, right, _ = solid.getbbox()
img = img.crop((left, top, right, h))          # keep the foot where the subject meets the frame
img = img.resize((round(img.width * out_h / img.height), out_h), Image.LANCZOS)
img = img.crop((0, 0, img.width, round(img.height * keep)))
img.save(dst, "WEBP", quality=84, method=6)
print(f"{dst}: {img.width}x{img.height}, background {100 * bg.mean():.1f}% of the source")
