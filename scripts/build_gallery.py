#!/usr/bin/env python3
"""Build content/gallery/manifest.json and generate web-optimized images.

For each content/gallery/<slug>/ folder that has a `before.*` and `after.*` SOURCE
image, this writes sRGB WebP derivatives (before.webp / after.webp) and points
the manifest at them. Key properties:

- Non-destructive: source uploads are never modified or deleted. The .webp
  derivatives are separate files, so a bad conversion can't eat an original.
- Color-correct: every image is converted to sRGB using its embedded ICC
  profile, so wide-gamut / HDR photos (e.g. iPhone Display-P3) render the same
  in every browser instead of shifting color.
- Format-flexible input: JPEG, PNG, and HEIC/HEIF (iPhone default) are all
  accepted. Output is always WebP.

Note on HDR: for HDR sources (P3 + PQ with an Apple gain map) this produces a
correct, stable *SDR* sRGB image. It does not reproduce gain-map HDR tone
mapping (no Linux library does that reliably) — sRGB is the right target for a
web gallery anyway.

Runs in CI (see .github/workflows/gallery.yml); also locally:
    python3 scripts/build_gallery.py [--dry-run]
"""

import argparse
import io
import json
import os
import sys

# HEIC/HEIF support is optional; register it if pillow-heif is installed.
try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIF_OK = True
except ImportError:
    HEIF_OK = False

from PIL import Image, ImageCms, ImageOps

GALLERY_DIR = "content/gallery"
MANIFEST = os.path.join(GALLERY_DIR, "manifest.json")
# Accepted SOURCE extensions. Note: .webp is intentionally excluded so it can
# never collide with our own .webp output.
SOURCE_EXTS = (".jpg", ".jpeg", ".png", ".heic", ".heif")
HEIF_EXTS = (".heic", ".heif")

MAX_EDGE = 1600       # px — cap on the long edge
WEBP_QUALITY = 82

SRGB_PROFILE = ImageCms.createProfile("sRGB")


def find_source(folder, base):
    """Path to `<base>.<ext>` (case-insensitive) for an accepted source, or None."""
    matches = [
        name
        for name in os.listdir(folder)
        if os.path.splitext(name)[0].lower() == base
        and os.path.splitext(name)[1].lower() in SOURCE_EXTS
    ]
    if not matches:
        return None
    return os.path.join(folder, sorted(matches)[0])  # deterministic if several


def title_from_slug(slug):
    return slug.replace("-", " ").replace("_", " ").strip().title()


def read_info(folder):
    """Return (title_or_None, caption) from an optional info.txt."""
    path = os.path.join(folder, "info.txt")
    if not os.path.exists(path):
        return None, ""
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    title = lines[0].strip() if lines else ""
    caption = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
    return (title or None), caption


def to_srgb(img):
    """Convert to sRGB using the embedded profile if there is one."""
    icc = img.info.get("icc_profile")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            return ImageCms.profileToProfile(img, src, SRGB_PROFILE, outputMode="RGB")
        except Exception:
            pass  # unreadable profile — fall back to a plain RGB cast
    return img.convert("RGB")


def build_derivative(src_path, out_path, dry_run):
    """Write an sRGB, downscaled WebP derivative of src_path."""
    with Image.open(src_path) as im:
        im.load()
        im = ImageOps.exif_transpose(im)  # bake in rotation
        converted = bool(im.info.get("icc_profile"))
        im = to_srgb(im)
        im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)  # never upscales
        note = "P3/ICC→sRGB" if converted else "sRGB"
        if dry_run:
            print(
                f"  ~ would write {out_path} "
                f"({im.size[0]}x{im.size[1]}, {note}, from {os.path.basename(src_path)})"
            )
            return
        im.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"  ~ {out_path} ({os.path.getsize(out_path) // 1024} KB, {note})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would change without writing anything",
    )
    args = parser.parse_args()

    if not os.path.isdir(GALLERY_DIR):
        print(f"No {GALLERY_DIR}/ directory; nothing to do.")
        return 0

    items, skipped = [], []
    for entry in sorted(os.listdir(GALLERY_DIR)):
        folder = os.path.join(GALLERY_DIR, entry)
        if not os.path.isdir(folder):
            continue

        before = find_source(folder, "before")
        after = find_source(folder, "after")
        if not (before and after):
            have = [n for n, p in (("before", before), ("after", after)) if p]
            skipped.append(entry)
            print(f"- skip '{entry}': needs before + after (found: {have or 'none'})")
            continue

        # can't decode HEIC without pillow-heif — warn and skip rather than crash
        needs_heif = any(
            os.path.splitext(p)[1].lower() in HEIF_EXTS for p in (before, after)
        )
        if needs_heif and not HEIF_OK:
            skipped.append(entry)
            print(f"- skip '{entry}': HEIC source but pillow-heif not installed")
            continue

        print(f"+ {entry}")
        pair = {}
        try:
            for base, src in (("before", before), ("after", after)):
                out = os.path.join(folder, base + ".webp")
                build_derivative(src, out, args.dry_run)
                pair[base] = out.replace(os.sep, "/")
        except Exception as e:  # noqa: BLE001 — keep one bad folder from failing all
            skipped.append(entry)
            print(f"- skip '{entry}': failed to process ({e})")
            continue

        title, caption = read_info(folder)
        items.append(
            {
                "slug": entry,
                "title": title or title_from_slug(entry),
                "caption": caption,
                "before": pair["before"],
                "after": pair["after"],
            }
        )

    print(
        f"\n{len(items)} pair(s) included, {len(skipped)} skipped."
        + ("" if HEIF_OK else "  (HEIC support OFF — install pillow-heif)")
    )

    if args.dry_run:
        print("(dry run — nothing written)")
        return 0

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
