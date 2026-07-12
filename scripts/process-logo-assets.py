"""Trim Logo files and generate public logo + favicon assets."""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

SRC = Path(r"e:\Pranav\InternshipFreelancing\Pausible\Images\Logo files")
PUBLIC = Path(r"e:\Pranav\InternshipFreelancing\Pausible\public")
FAVICON_DIR = PUBLIC / "favicon"
ROOT_FAVICON = Path(r"e:\Pranav\InternshipFreelancing\Pausible\favicon")

# Brand navy — matches --pausibl-navy / marketing-brand
OPAQUE_BG = (13, 27, 42, 255)


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[-1].getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def resize_to_height(im: Image.Image, height: int) -> Image.Image:
    w, h = im.size
    nw = max(1, round(w * (height / h)))
    return im.resize((nw, height), Image.Resampling.LANCZOS)


def square_pad(im: Image.Image, size: int, bg: tuple[int, int, int, int] = (0, 0, 0, 0), margin_ratio: float = 0.14) -> Image.Image:
    im = im.convert("RGBA")
    margin = int(size * margin_ratio)
    target = size - margin * 2
    w, h = im.size
    scale = min(target / w, target / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def write_both(name: str, im: Image.Image) -> None:
    im.save(FAVICON_DIR / name, optimize=True)
    im.save(ROOT_FAVICON / name, optimize=True)


def main() -> None:
    FAVICON_DIR.mkdir(parents=True, exist_ok=True)
    ROOT_FAVICON.mkdir(parents=True, exist_ok=True)

    black = trim(Image.open(SRC / "Pausibl_Black.png"))
    white = trim(Image.open(SRC / "Pausibl_White.png"))
    mark = trim(Image.open(SRC / "Pausibl_Favicon.png"))

    print("trimmed black", black.size, "white", white.size, "mark", mark.size)

    black.save(PUBLIC / "logo-black.png", optimize=True)
    white.save(PUBLIC / "logo-white-full.png", optimize=True)
    mark.save(PUBLIC / "logo-mark.png", optimize=True)

    logo_web = resize_to_height(black, 256)
    logo_web.save(PUBLIC / "Logo.png", optimize=True)
    resize_to_height(white, 256).save(PUBLIC / "logo-white.png", optimize=True)
    print("Logo.png", logo_web.size)

    # Tab favicon — transparent
    write_both("favicon-96x96.png", square_pad(mark, 96, (0, 0, 0, 0)))

    # Home screen / PWA — opaque navy so maskable icons aren't washout
    write_both("apple-touch-icon.png", square_pad(mark, 180, OPAQUE_BG, margin_ratio=0.18))
    write_both("web-app-manifest-192x192.png", square_pad(mark, 192, OPAQUE_BG, margin_ratio=0.2))
    write_both("web-app-manifest-512x512.png", square_pad(mark, 512, OPAQUE_BG, margin_ratio=0.2))

    ico_sizes = [16, 32, 48]
    ico_images = [square_pad(mark, s, (0, 0, 0, 0)).convert("RGBA") for s in ico_sizes]
    for dest in (FAVICON_DIR / "favicon.ico", PUBLIC / "favicon.ico", ROOT_FAVICON / "favicon.ico"):
        ico_images[0].save(
            dest,
            format="ICO",
            sizes=[(s, s) for s in ico_sizes],
            append_images=ico_images[1:],
        )

    buf = io.BytesIO()
    square_pad(mark, 128, (0, 0, 0, 0)).save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128">
  <image width="128" height="128" xlink:href="data:image/png;base64,{b64}"/>
</svg>
"""
    (FAVICON_DIR / "favicon.svg").write_text(svg, encoding="utf-8")
    (ROOT_FAVICON / "favicon.svg").write_text(svg, encoding="utf-8")

    print("done")


if __name__ == "__main__":
    main()
