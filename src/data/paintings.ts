// Metadata per tavla. publicId matchar filnamnet i Cloudinary-mappen "paintings/".
// Exempel: om filen heter "snäckan.jpg" i Cloudinary → publicId: 'paintings/snäckan'
// Bilder utan metadata visas ändå i galleriet, utan titel/pris.

export interface PaintingMeta {
  publicId: string
  title?: string
  year?: number
  dimensions?: string
  technique?: string
  price?: number
  available?: boolean  // true om inget anges
  featured?: boolean
}

export const paintingsMeta: PaintingMeta[] = [
  // Fyll på med metadata per tavla. Exempel:
  // {
  //   publicId: 'paintings/snäckan',
  //   title: 'Snäckan',
  //   year: 2023,
  //   dimensions: '60 × 80 cm',
  //   technique: 'Olja på pannå',
  //   price: 4500,
  //   available: true,
  // },
]

export function getMetaForPainting(publicId: string): PaintingMeta | undefined {
  return paintingsMeta.find(m => m.publicId === publicId)
}
