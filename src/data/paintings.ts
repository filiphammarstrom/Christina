export interface Painting {
  id: string
  filename: string
  title?: string
  year?: number
  dimensions?: string
  technique?: string
  price?: number
  available: boolean
  featured?: boolean
}

export const paintings: Painting[] = [
  // Lägg till tavlor här. Exempel:
  // {
  //   id: '1',
  //   filename: 'tavla-01.jpg',
  //   title: 'Spiralen',
  //   year: 2023,
  //   dimensions: '60 × 80 cm',
  //   technique: 'Akryl på duk',
  //   price: 4500,
  //   available: true,
  //   featured: true,
  // },
]

// Hjälpfunktioner
export function getAvailablePaintings() {
  return paintings.filter(p => p.available)
}

export function getSoldPaintings() {
  return paintings.filter(p => !p.available)
}

export function getFeaturedPaintings() {
  return paintings.filter(p => p.featured)
}
