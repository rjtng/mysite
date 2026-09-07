"""
Builds the technology logo strip in the hero marquee.

    python tools/fetch-logos.py

Downloads each brand mark once, folds them into a single inline SVG sprite, and
rewrites the two marked regions of index.html. Nothing is fetched at run time:
the logos ship with the page, so the marquee costs no extra requests and cannot
break because a CDN is having a bad day.

Marks come from Simple Icons, which publishes the official single-colour
version of each logo. Simple Icons dropped C# and Java over trademark concerns,
so those two come from Devicon's monochrome "plain" variants instead.

Every mark is stripped of its own fill and drawn in currentColor, which is what
lets the strip sit quiet in the page palette and light up in the brand colour
on hover.
"""

import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
SPRITE = os.path.join(ROOT, "assets", "img", "tech-sprite.svg")

SI = "https://cdn.jsdelivr.net/npm/simple-icons@15"
DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest"

PAGE_BG = (0x05, 0x0A, 0x16)
MIN_CONTRAST = 3.6

# Loosely grouped the way the skills section is, rather than alphabetically.
# ("Label", "source:slug") — source is "si" (Simple Icons) or "dev" (Devicon).
TECH = [
    ("Flutter",        "si:flutter"),
    ("Dart",           "si:dart"),
    ("Python",         "si:python"),
    ("JavaScript",     "si:javascript"),
    ("PHP",            "si:php"),
    ("Java",           "dev:java/java-plain"),
    ("C++",            "si:cplusplus"),
    ("C#",             "dev:csharp/csharp-plain"),
    ("HTML5",          "si:html5"),
    ("CSS3",           "si:css"),
    ("Tailwind CSS",   "si:tailwindcss"),
    ("Bootstrap",      "si:bootstrap"),
    ("React",          "si:react"),
    ("Node.js",        "si:nodedotjs"),
    ("MySQL",          "si:mysql"),
    ("MariaDB",        "si:mariadb"),
    ("Firebase",       "si:firebase"),
    ("OpenCV",         "si:opencv"),
    ("MediaPipe",      "si:mediapipe"),
    ("TensorFlow",     "si:tensorflow"),
    ("Docker",         "si:docker"),
    ("Kubernetes",     "si:kubernetes"),
    ("Google Cloud",   "si:googlecloud"),
    ("Vercel",         "si:vercel"),
    ("Linux",          "si:linux"),
    ("GitHub",         "si:github"),
    ("Cisco IOS",      "si:cisco"),
    ("Arduino",        "si:arduino"),
    ("Raspberry Pi",   "si:raspberrypi"),
    ("Android Studio", "si:androidstudio"),
    ("Figma",          "si:figma"),
    ("Canva",          "si:canva"),
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "portfolio-build"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode("utf-8")


# --- colour handling ------------------------------------------------------

def rel_lum(rgb):
    out = []
    for v in rgb:
        v /= 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def lighten(rgb, amount):
    return tuple(min(255, int(c + (255 - c) * amount)) for c in rgb)


def readable(hex_str):
    """Official colour, lightened only as far as it must be to stay legible.

    GitHub's brand black and a few others vanish against the page. Rather than
    drop the brand colour entirely, each one is walked toward white until it
    clears the contrast floor, so it still reads as itself.
    """
    rgb = tuple(int(hex_str[i:i + 2], 16) for i in (0, 2, 4))
    step = 0.0
    while contrast(rgb, PAGE_BG) < MIN_CONTRAST and step < 0.95:
        step += 0.05
        rgb = lighten(tuple(int(hex_str[i:i + 2], 16) for i in (0, 2, 4)), step)
    return "#%02X%02X%02X" % rgb, round(contrast(rgb, PAGE_BG), 2), step > 0


# --- svg handling ---------------------------------------------------------

def body_of(svg):
    """The drawable guts of an SVG, with every hard-coded fill removed."""
    inner = re.sub(r"^.*?<svg[^>]*>", "", svg, flags=re.S)
    inner = re.sub(r"</svg>\s*$", "", inner, flags=re.S)
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S)
    inner = re.sub(r'\s(fill|stroke)="[^"]*"', "", inner)
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.S)
    return " ".join(inner.split())


def viewbox_of(svg):
    m = re.search(r'viewBox="([^"]+)"', svg)
    return m.group(1) if m else "0 0 24 24"


def slug_id(label):
    return re.sub(r"[^a-z0-9]+", "", label.lower())


def main():
    print("fetching Simple Icons colour data ...")
    # A flat list of {title, slug, hex}; slug is only present when it differs
    # from the lowercased title, so fall back to deriving it.
    si_colours = {}
    for entry in json.loads(get(SI + "/data/simple-icons.json")):
        slug = entry.get("slug") or re.sub(r"[^a-z0-9]+", "", entry.get("title", "").lower())
        si_colours[slug] = entry.get("hex", "888888")

    print("fetching Devicon colour data ...")
    dev_colours = {}
    for entry in json.loads(get(DEVICON + "/devicon.json")):
        dev_colours[entry.get("name", "")] = entry.get("color", "#888888").lstrip("#")

    symbols, items, adjusted = [], [], []

    for label, source in TECH:
        kind, slug = source.split(":", 1)
        ident = slug_id(label)

        if kind == "si":
            svg = get(f"{SI}/icons/{slug}.svg")
            hexv = si_colours.get(slug) or "8899AA"
        else:
            svg = get(f"{DEVICON}/icons/{slug}.svg")
            hexv = dev_colours.get(slug.split("/")[0], "8899AA")

        colour, ratio, was_lifted = readable(hexv)
        if was_lifted:
            adjusted.append(f"{label} #{hexv} -> {colour}")

        symbols.append(
            f'<symbol id="t-{ident}" viewBox="{viewbox_of(svg)}">{body_of(svg)}</symbol>'
        )
        # The width/height attributes are a floor, not the display size: CSS
        # scales the mark to 1.15em. Without them an <svg> with no intrinsic
        # size falls back to 300x150, which is what a stale or missing
        # stylesheet used to turn this strip into.
        items.append(
            f'<li style="--brand:{colour}">'
            f'<svg class="band__logo" width="20" height="20" aria-hidden="true">'
            f'<use href="#t-{ident}"></use></svg>'
            f"<span>{label.replace('&', '&amp;')}</span></li>"
        )
        print(f"  {label:<16} {kind:<4} {colour}  {ratio}:1")

    # standalone sprite, kept as the source of truth for the inlined copy
    os.makedirs(os.path.dirname(SPRITE), exist_ok=True)
    with open(SPRITE, "w", encoding="utf-8") as f:
        f.write(
            '<svg xmlns="http://www.w3.org/2000/svg">\n'
            + "\n".join(symbols)
            + "\n</svg>\n"
        )

    marquee_block = "\n".join(" " * 12 + i for i in items)

    html = open(INDEX, encoding="utf-8").read()
    regions = (("marquee", marquee_block, 12),)
    for name, block, indent in regions:
        pattern = re.compile(
            f"([ \t]*<!-- tech-{name}:start -->).*?(<!-- tech-{name}:end -->)", re.S
        )
        if not pattern.search(html):
            raise SystemExit(f"marker pair tech-{name} not found in index.html")
        pad = " " * indent
        html = pattern.sub(
            lambda m: f"{pad}<!-- tech-{name}:start -->\n{block}\n{pad}<!-- tech-{name}:end -->",
            html,
            count=1,
        )
    open(INDEX, "w", encoding="utf-8").write(html)

    print(f"\n{len(TECH)} logos, sprite {os.path.getsize(SPRITE)} bytes")
    if adjusted:
        print(f"lightened for contrast ({MIN_CONTRAST}:1 floor):")
        for line in adjusted:
            print("  " + line)


if __name__ == "__main__":
    main()
