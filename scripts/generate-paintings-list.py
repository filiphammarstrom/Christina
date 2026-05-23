#!/usr/bin/env python3
"""
Genererar src/data/paintings.ts automatiskt från bildfilerna i public/paintings/.

Användning:
  python scripts/generate-paintings-list.py

Skapar en paintings.ts med alla bilder listade (tillgängliga, utan pris).
Du kan sedan redigera filen för att lägga till titel, pris, mått etc.
"""

import os
import json
from pathlib import Path

PAINTINGS_DIR = Path('public/paintings')
OUTPUT_FILE = Path('src/data/paintings.ts')

SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp'}

def slugify(name: str) -> str:
    return name.lower().replace(' ', '-').replace('_', '-')


def main():
    if not PAINTINGS_DIR.exists():
        print(f"Mapp saknas: {PAINTINGS_DIR}")
        return

    files = sorted([
        f for f in PAINTINGS_DIR.iterdir()
        if f.suffix.lower() in SUPPORTED
    ])

    if not files:
        print("Inga bilder hittades i public/paintings/")
        return

    entries = []
    for i, f in enumerate(files, 1):
        entries.append({
            'id': str(i),
            'filename': f.name,
            'title': '',
            'year': None,
            'dimensions': '',
            'technique': '',
            'price': None,
            'available': True,
            'featured': False,
        })

    lines = [
        'export interface Painting {',
        '  id: string',
        '  filename: string',
        '  title?: string',
        '  year?: number',
        '  dimensions?: string',
        '  technique?: string',
        '  price?: number',
        '  available: boolean',
        '  featured?: boolean',
        '}',
        '',
        'export const paintings: Painting[] = [',
    ]

    for e in entries:
        lines.append('  {')
        lines.append(f"    id: '{e['id']}',")
        lines.append(f"    filename: '{e['filename']}',")
        if e['title']:
            lines.append(f"    title: '{e['title']}',")
        if e['year']:
            lines.append(f"    year: {e['year']},")
        if e['dimensions']:
            lines.append(f"    dimensions: '{e['dimensions']}',")
        if e['technique']:
            lines.append(f"    technique: '{e['technique']}',")
        if e['price']:
            lines.append(f"    price: {e['price']},")
        lines.append(f"    available: {str(e['available']).lower()},")
        if e['featured']:
            lines.append(f"    featured: true,")
        lines.append('  },')

    lines += [
        ']',
        '',
        'export function getAvailablePaintings() {',
        '  return paintings.filter(p => p.available)',
        '}',
        '',
        'export function getSoldPaintings() {',
        '  return paintings.filter(p => !p.available)',
        '}',
        '',
        'export function getFeaturedPaintings() {',
        '  return paintings.filter(p => p.featured)',
        '}',
        '',
    ]

    OUTPUT_FILE.write_text('\n'.join(lines), encoding='utf-8')
    print(f"Klar! {len(entries)} bilder listade i {OUTPUT_FILE}")
    print("\nNästa steg: Öppna src/data/paintings.ts och lägg till titel, pris och mått per tavla.")


if __name__ == '__main__':
    main()
