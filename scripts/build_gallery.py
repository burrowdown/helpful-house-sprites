#!/usr/bin/env python3
"""Build gallery/manifest.json and compress before/after photos.

Scans each subfolder of gallery/ for a `before.*` and `after.*` image. A folder
that has BOTH is added to the manifest (title from the folder name, optional
caption from info.txt); folders missing either are skipped and logged. Large
images are downscaled and re-encoded in place, while already-web-ready images
are left untouched so re-runs don't keep re-compressing (and degrading) them.

Runs in CI (see .github/workflows/gallery.yml), but also locally:

    python3 scripts/build_gallery.py            # write manifest + compress
    python3 scripts/build_gallery.py --dry-run  # preview, change nothing

Bad/unexpected folder names are handled gracefully: extensions are matched
case-insensitively, spaces in folder names are kept as-is (they resolve fine as
URLs), and a folder with two "before" files picks one deterministically.
"""

import argparse
import json
import os
import sys

GALLERY_DIR = "gallery"
MANIFEST = os.path.join(GALLERY_DIR, "manifest.json")
EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

MAX_EDGE = 1600           # px — cap on the long edge
SIZE_LIMIT = 600 * 1024   # bytes — recompress anything bigger, even if small dims
JPEG_QUALITY = 82
WEBP_QUALITY = 82


def find_image(folder, base):
    """Path to `<base>.<ext>` in folder (case-insensitive ext), or None."""
    matches = [
        name
        for name in os.listdir(folder)
        if os.path.splitext(name)[0].lower() == base
        and os.path.splitext(name)[1].lower() in EXTENSIONS
    ]
    if not matches:
        return None
    # deterministic if someone dropped both before.jpg and before.png
    return os.path.join(folder, sorted(matches)[0])


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


def compress(path, dry_run):
    """Downscale/re-encode in place if oversized. Returns True if it changed."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("  ! Pillow not installed; skipping compression", file=sys.stderr)
        return False

    big_file = os.path.getsize(path) > SIZE_LIMIT
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)  # bake in phone rotation, drop the tag
        oversized = max(img.size) > MAX_EDGE
        if not oversized and not big_file:
            return False  # already web-ready — leave it (keeps re-runs idempotent)

        if dry_run:
            print(
                f"  ~ would compress {path} "
                f"({img.size[0]}x{img.size[1]}, {os.path.getsize(path) // 1024} KB)"
            )
            return True

        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)  # never upscales
        ext = os.path.splitext(path)[1].lower()
        if ext in (".jpg", ".jpeg"):
            img.convert("RGB").save(
                path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True
            )
        elif ext == ".webp":
            img.save(path, "WEBP", quality=WEBP_QUALITY, method=6)
        else:  # .png
            img.save(path, "PNG", optimize=True)

    print(f"  ~ compressed {path} -> {os.path.getsize(path) // 1024} KB")
    return True


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

        before = find_image(folder, "before")
        after = find_image(folder, "after")
        if not (before and after):
            have = [n for n, p in (("before", before), ("after", after)) if p]
            skipped.append(entry)
            print(f"- skip '{entry}': needs before + after (found: {have or 'none'})")
            continue

        print(f"+ {entry}")
        for photo in (before, after):
            compress(photo, args.dry_run)

        title, caption = read_info(folder)
        items.append(
            {
                "slug": entry,
                "title": title or title_from_slug(entry),
                "caption": caption,
                "before": before.replace(os.sep, "/"),
                "after": after.replace(os.sep, "/"),
            }
        )

    print(f"\n{len(items)} pair(s) included, {len(skipped)} folder(s) skipped.")

    if args.dry_run:
        print("(dry run — manifest not written)")
        return 0

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
