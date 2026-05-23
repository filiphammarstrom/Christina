#!/usr/bin/env python3
"""
Bildbehandlingsskript för Christina Hammarströms tavlor.

Funktioner:
- Beskär bort staffli, ramar och bakgrundsobjekt
- Förbättrar ljus, kontrast, färgmättnad och skärpa
- Rätar upp sneda bilder
- Konverterar HEIC till JPG
- Sparar optimerade kopior till output-mapp

Installation:
  pip install Pillow pillow-heif numpy opencv-python

Användning:
  python scripts/process-images.py --input /sökväg/till/bilder --output public/paintings
  python scripts/process-images.py --input foto.jpg --single
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    import numpy as np
except ImportError:
    print("Installera beroenden: pip install Pillow numpy")
    sys.exit(1)

# Valfritt: HEIC-stöd
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_SUPPORT = True
except ImportError:
    HEIC_SUPPORT = False
    print("Tips: pip install pillow-heif för HEIC-stöd")

# Valfritt: OpenCV för beskärning
try:
    import cv2
    CV2_SUPPORT = True
except ImportError:
    CV2_SUPPORT = False

SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
if HEIC_SUPPORT:
    SUPPORTED_FORMATS |= {'.heic', '.heif'}


def detect_and_crop_canvas(img: Image.Image) -> Image.Image:
    """
    Försöker hitta tavlans kanter och beskär bort staffli/ram/bakgrund.
    Använder OpenCV om tillgängligt, annars enkel kantdetektering.
    """
    if not CV2_SUPPORT:
        return simple_crop(img)

    img_rgb = np.array(img.convert('RGB'))
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    dilated = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img

    # Hitta den största rektangeln
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    img_area = img.width * img.height

    # Använd bara om konturen är rimlig (20–95% av bilden)
    if area < img_area * 0.20 or area > img_area * 0.95:
        return img

    x, y, w, h = cv2.boundingRect(largest)
    # Lägg till lite marginal
    margin = 5
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = min(img.width - x, w + 2 * margin)
    h = min(img.height - y, h + 2 * margin)

    return img.crop((x, y, x + w, y + h))


def simple_crop(img: Image.Image, threshold: int = 30) -> Image.Image:
    """
    Enkel automatisk beskärning baserat på kantfärger.
    Tar bort homogena kanter (golv, vägg, bakgrund).
    """
    img_array = np.array(img.convert('RGB'))
    h, w = img_array.shape[:2]

    def row_is_background(row, thresh=threshold):
        std = np.std(row, axis=0).mean()
        return std < thresh

    def col_is_background(col, thresh=threshold):
        std = np.std(col, axis=0).mean()
        return std < thresh

    top = 0
    while top < h // 3 and row_is_background(img_array[top]):
        top += 1

    bottom = h - 1
    while bottom > 2 * h // 3 and row_is_background(img_array[bottom]):
        bottom -= 1

    left = 0
    while left < w // 3 and col_is_background(img_array[:, left]):
        left += 1

    right = w - 1
    while right > 2 * w // 3 and col_is_background(img_array[:, right]):
        right -= 1

    if right - left < w * 0.5 or bottom - top < h * 0.5:
        return img

    margin = 10
    return img.crop((
        max(0, left - margin),
        max(0, top - margin),
        min(w, right + margin),
        min(h, bottom + margin),
    ))


def enhance_image(img: Image.Image,
                  brightness: float = 1.05,
                  contrast: float = 1.15,
                  saturation: float = 1.20,
                  sharpness: float = 1.30) -> Image.Image:
    """Förbättrar bildens ljus, kontrast, färgmättnad och skärpa."""
    img = ImageEnhance.Brightness(img).enhance(brightness)
    img = ImageEnhance.Contrast(img).enhance(contrast)
    img = ImageEnhance.Color(img).enhance(saturation)
    img = ImageEnhance.Sharpness(img).enhance(sharpness)
    return img


def process_image(input_path: Path, output_path: Path,
                  crop: bool = True, enhance: bool = True,
                  max_size: int = 2400) -> bool:
    """Bearbetar en enskild bild."""
    try:
        img = Image.open(input_path)

        # Rätta EXIF-rotation
        img = ImageOps.exif_transpose(img)

        # Konvertera till RGB
        if img.mode in ('RGBA', 'P', 'LA'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        if crop:
            img = detect_and_crop_canvas(img)

        if enhance:
            img = enhance_image(img)

        # Begränsa maxstorlek
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        out = output_path.with_suffix('.jpg')
        img.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
        print(f"  ✓ {input_path.name} → {out.name}")
        return True

    except Exception as e:
        print(f"  ✗ {input_path.name}: {e}")
        return False


def find_duplicates(folder: Path) -> list:
    """Hittar potentiella dubbletter baserat på filstorlek."""
    from collections import defaultdict
    size_map = defaultdict(list)
    for f in folder.iterdir():
        if f.suffix.lower() in SUPPORTED_FORMATS:
            size_map[f.stat().st_size].append(f)
    return [files for files in size_map.values() if len(files) > 1]


def main():
    parser = argparse.ArgumentParser(description='Bearbeta tavlabilder')
    parser.add_argument('--input', '-i', required=True, help='Mapp med originalbilder eller enskild bild')
    parser.add_argument('--output', '-o', default='public/paintings', help='Output-mapp (default: public/paintings)')
    parser.add_argument('--no-crop', action='store_true', help='Hoppa över automatisk beskärning')
    parser.add_argument('--no-enhance', action='store_true', help='Hoppa över bildförbättring')
    parser.add_argument('--check-duplicates', action='store_true', help='Visa potentiella dubbletter')
    parser.add_argument('--max-size', type=int, default=2400, help='Maximal bildbredd/höjd i pixlar (default: 2400)')
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Sökväg hittades inte: {input_path}")
        sys.exit(1)

    if input_path.is_file():
        files = [input_path]
    else:
        files = sorted([f for f in input_path.iterdir() if f.suffix.lower() in SUPPORTED_FORMATS])

    if args.check_duplicates and input_path.is_dir():
        dupes = find_duplicates(input_path)
        if dupes:
            print("\nMöjliga dubbletter (samma filstorlek):")
            for group in dupes:
                for f in group:
                    print(f"  {f.name}")
                print()
        else:
            print("Inga dubbletter hittades.")
        return

    print(f"\nBearbetar {len(files)} bilder → {output_path}\n")
    ok = sum(
        process_image(
            f,
            output_path / f.stem,
            crop=not args.no_crop,
            enhance=not args.no_enhance,
            max_size=args.max_size,
        )
        for f in files
    )
    print(f"\nKlart: {ok}/{len(files)} bilder bearbetade.")


if __name__ == '__main__':
    main()
