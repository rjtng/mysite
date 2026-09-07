"""
Builds the technology marks used by the hero marquee and the skills chips.

    python tools/fetch-logos.py

Downloads each brand mark once, folds them into a single sprite, and rewrites
two things in index.html: the region between the `tech-marquee` markers, and
the contents of every `<ul class="chips">` in the skills section. Both are
regenerated from scratch each run, so it is safe to run repeatedly. Do not
hand-edit inside them.

The chips rewrite reads the label already on the page and keeps the `key`
class, so the skills list stays hand-authored — this only attaches marks to it.
A label with no entry in ICONS is left as plain text, which is most of the
networking list: there is no logo for subnetting or DHCP.

Marks come from Simple Icons, which publishes the official single-colour
version of each logo. Simple Icons dropped C# and Java over trademark concerns,
so those two come from Devicon's monochrome "plain" variants.

Nothing is fetched at run time: the sprite ships with the site.
"""

import html as htmllib
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
MIN_CONTRAST = 4.5

# Label as written on the page -> icon source. "si" is Simple Icons, "dev" is
# Devicon. Keys are matched case-insensitively with whitespace collapsed.
# Anything absent here renders as text with no mark.
ICONS = {
    # languages
    "python": "si:python",
    "javascript": "si:javascript",
    "php": "si:php",
    "dart": "si:dart",
    "java": "dev:java/java-plain",
    "c++": "si:cplusplus",
    "c#": "dev:csharp/csharp-plain",
    # web
    "html5": "si:html5",
    "css3": "si:css",
    "mysql": "si:mysql",
    "bootstrap": "si:bootstrap",
    "apache": "si:apache",
    "react": "si:react",
    "node.js": "si:nodedotjs",
    "express": "si:express",
    "django": "si:django",
    "flask": "si:flask",
    "tailwind": "si:tailwindcss",
    "tailwind css": "si:tailwindcss",
    # mobile
    "flutter": "si:flutter",
    "firebase": "si:firebase",
    "android studio": "si:androidstudio",
    "material design": "si:materialdesign",
    # vision & ml
    "opencv": "si:opencv",
    "numpy": "si:numpy",
    "mediapipe": "si:mediapipe",
    "tensorflow": "si:tensorflow",
    # infrastructure
    "mariadb": "si:mariadb",
    "xampp": "si:xampp",
    "nginx": "si:nginx",
    "docker": "si:docker",
    "google cloud": "si:googlecloud",
    "kubernetes": "si:kubernetes",
    "vercel": "si:vercel",
    # networking
    "cisco ios": "si:cisco",
    # design & tools
    "figma": "si:figma",
    "canva": "si:canva",
    "git": "si:git",
    "github": "si:github",
    "linux": "si:linux",
    "cmake": "si:cmake",
    "arduino": "si:arduino",
    "raspberry pi": "si:raspberrypi",
}

# The marquee, in the order it scrolls. Loosely grouped the way the skills
# section is, rather than alphabetically.
MARQUEE = [
    "Flutter", "Dart", "Python", "JavaScript", "PHP", "Java", "C++", "C#",
    "HTML5", "CSS3", "Tailwind CSS", "Bootstrap", "React", "Node.js",
    "MySQL", "MariaDB", "XAMPP", "Firebase",
    "OpenCV", "MediaPipe", "TensorFlow",
    "Docker", "Kubernetes", "Google Cloud", "Vercel", "Linux", "GitHub",
    "Cisco IOS", "Arduino", "Raspberry Pi", "Android Studio",
    "Figma", "Canva",
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "portfolio-build"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode("utf-8")


def key_of(label):
    return re.sub(r"\s+", " ", htmllib.unescape(label)).strip().lower()


def ident_of(source):
    """Symbol id, derived from the source slug rather than the label.

    Deriving it from the label used to strip punctuation, which collapsed both
    "C++" and "C#" to "c" — one id for two logos, so C# rendered the C++ mark.
    Source slugs are unique, and keying on them also means a mark shared by the
    marquee and the chips is stored once.
    """
    kind, slug = source.split(":", 1)
    base = slug.split("/")[0]
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")


# --- colour ---------------------------------------------------------------

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


def readable(hex_str):
    """Official colour, lightened only as far as it must be to stay legible.

    These are shown at rest rather than only on hover, and they colour the
    label as well as the mark, so the floor is the 4.5:1 WCAG AA minimum for
    normal-size text rather than the 3:1 that would do for a graphic alone.
    Each colour is walked toward white until it clears that, so it still reads
    as itself: Flutter stays blue, GitHub stays grey.
    """
    base = tuple(int(hex_str[i:i + 2], 16) for i in (0, 2, 4))
    rgb, step = base, 0.0
    while contrast(rgb, PAGE_BG) < MIN_CONTRAST and step < 0.95:
        step += 0.05
        rgb = tuple(min(255, int(c + (255 - c) * step)) for c in base)
    return "#%02X%02X%02X" % rgb, round(contrast(rgb, PAGE_BG), 2), step > 0


# --- svg ------------------------------------------------------------------

def body_of(svg):
    inner = re.sub(r"^.*?<svg[^>]*>", "", svg, flags=re.S)
    inner = re.sub(r"</svg>\s*$", "", inner, flags=re.S)
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S)
    inner = re.sub(r'\s(fill|stroke)="[^"]*"', "", inner)
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.S)
    return " ".join(inner.split())


def viewbox_of(svg):
    m = re.search(r'viewBox="([^"]+)"', svg)
    return m.group(1) if m else "0 0 24 24"


def main():
    print("fetching colour data ...")
    si_colours = {}
    for entry in json.loads(get(SI + "/data/simple-icons.json")):
        slug = entry.get("slug") or re.sub(
            r"[^a-z0-9]+", "", entry.get("title", "").lower())
        si_colours[slug] = entry.get("hex", "888888")

    dev_colours = {}
    for entry in json.loads(get(DEVICON + "/devicon.json")):
        dev_colours[entry.get("name", "")] = entry.get("color", "#888888").lstrip("#")

    html = open(INDEX, encoding="utf-8").read()

    # Every label the page asks for a mark: the marquee plus the skills chips.
    chip_labels = []
    for block in re.findall(r'<ul class="chips">(.*?)</ul>', html, re.S):
        for inner in re.findall(r"<li[^>]*>(.*?)</li>", block, re.S):
            chip_labels.append(re.sub(r"<[^>]+>", "", inner).strip())

    wanted = {}
    for label in MARQUEE + chip_labels:
        source = ICONS.get(key_of(label))
        if source:
            wanted[ident_of(source)] = source

    symbols, meta, adjusted = {}, {}, []
    for ident, source in sorted(wanted.items()):
        kind, slug = source.split(":", 1)
        if kind == "si":
            svg = get(f"{SI}/icons/{slug}.svg")
            hexv = si_colours.get(slug, "8899AA")
        else:
            svg = get(f"{DEVICON}/icons/{slug}.svg")
            hexv = dev_colours.get(slug.split("/")[0], "8899AA")

        colour, ratio, lifted = readable(hexv)
        if lifted:
            adjusted.append(f"{ident} #{hexv} -> {colour}")
        symbols[ident] = f'<symbol id="t-{ident}" viewBox="{viewbox_of(svg)}">{body_of(svg)}</symbol>'
        meta[ident] = colour
        print(f"  {ident:<16} {kind:<4} {colour}  {ratio}:1")

    with open(SPRITE, "w", encoding="utf-8") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg">\n'
                + "\n".join(symbols[i] for i in sorted(symbols))
                + "\n</svg>\n")

    def mark(label, cls, size):
        source = ICONS.get(key_of(label))
        if not source:
            return None, None
        ident = ident_of(source)
        # width/height are a floor, not the display size: CSS scales the mark.
        # Without them an <svg> with no intrinsic size falls back to 300x150.
        return (
            f'<svg class="{cls}" width="{size}" height="{size}" aria-hidden="true">'
            f'<use href="#t-{ident}"></use></svg>',
            meta[ident],
        )

    # --- marquee ----------------------------------------------------------
    items = []
    for label in MARQUEE:
        svg, colour = mark(label, "band__logo", 20)
        style = f' style="--brand:{colour}"' if colour else ""
        items.append(f"<li{style}>{svg or ''}<span>{label}</span></li>")

    block = "\n".join(" " * 12 + i for i in items)
    pattern = re.compile(
        r"([ \t]*<!-- tech-marquee:start -->).*?(<!-- tech-marquee:end -->)", re.S)
    if not pattern.search(html):
        raise SystemExit("marker pair tech-marquee not found in index.html")
    html = pattern.sub(
        lambda m: f"{' ' * 12}<!-- tech-marquee:start -->\n{block}\n"
                  f"{' ' * 12}<!-- tech-marquee:end -->",
        html, count=1)

    # --- skills chips -----------------------------------------------------
    chips_done = 0
    plain = []

    def redo_chip(m):
        nonlocal chips_done
        indent, attrs, inner = m.group(1), m.group(2), m.group(3)
        label = re.sub(r"<[^>]+>", "", inner).strip()   # keeps &amp; escaped
        is_key = 'class="key"' in attrs
        svg, colour = mark(label, "chip__logo", 16)
        chips_done += 1
        if not svg:
            plain.append(label)
            cls = ' class="key"' if is_key else ""
            return f"{indent}<li{cls}>{label}</li>"
        cls = ' class="key"' if is_key else ""
        return (f'{indent}<li{cls} style="--brand:{colour}">{svg}'
                f"<span>{label}</span></li>")

    def redo_block(m):
        return m.group(1) + re.sub(
            r"( *)<li([^>]*)>(.*?)</li>", redo_chip, m.group(2), flags=re.S
        ) + m.group(3)

    html, n = re.subn(r'(<ul class="chips">)(.*?)(</ul>)', redo_block, html, flags=re.S)
    open(INDEX, "w", encoding="utf-8").write(html)

    print(f"\n{len(symbols)} symbols, sprite {os.path.getsize(SPRITE)} bytes")
    print(f"{len(MARQUEE)} marquee items, {chips_done} chips across {n} lists")
    if plain:
        print(f"no mark available, left as text ({len(plain)}): {', '.join(sorted(set(plain)))}")
    if adjusted:
        print(f"lightened for contrast ({MIN_CONTRAST}:1 floor):")
        for line in adjusted:
            print("  " + line)


if __name__ == "__main__":
    main()
