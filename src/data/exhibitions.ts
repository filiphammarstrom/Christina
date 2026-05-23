export interface Exhibition {
  id: string
  title: string
  venue: string
  location: string
  startDate: string
  endDate: string
  description?: string
  url?: string
  type: 'solo' | 'group'
}

export const exhibitions: Exhibition[] = [
  // --- Separata utställningar ---
  {
    id: 's1',
    title: 'Soloutsttällning',
    venue: 'Golgata Kirche',
    location: 'Berlin, Tyskland',
    startDate: '1990-04-01',
    endDate: '1990-04-30',
    type: 'solo',
  },
  {
    id: 's2',
    title: 'Soloutsttällning',
    venue: 'Finska teatern',
    location: 'Petrozavodsk, Karelen, Ryssland',
    startDate: '1994-06-01',
    endDate: '1994-06-30',
    type: 'solo',
  },
  {
    id: 's3',
    title: 'Fotoutsttällning av målningarna',
    venue: 'Prazha, Pittkeranta & Ollonets',
    location: 'Ryssland',
    startDate: '2002-06-01',
    endDate: '2002-12-31',
    type: 'solo',
  },
  {
    id: 's4',
    title: 'Utställning',
    venue: 'Djupbäcksvägen 32',
    location: 'Umeå',
    startDate: '2002-09-01',
    endDate: '2002-09-30',
    type: 'solo',
  },
  {
    id: 's5',
    title: 'Utställning',
    venue: 'UH',
    location: 'Örnsköldsvik',
    startDate: '2003-11-01',
    endDate: '2003-11-30',
    type: 'solo',
  },
  {
    id: 's6',
    title: 'Utställning',
    venue: 'Ängekyrkan',
    location: 'Härnösand',
    startDate: '2007-10-01',
    endDate: '2007-10-31',
    type: 'solo',
  },
  {
    id: 's7',
    title: 'Utställning',
    venue: 'Ådalskyrkan',
    location: 'Kramfors',
    startDate: '2007-11-01',
    endDate: '2007-11-30',
    type: 'solo',
  },
  {
    id: 's8',
    title: 'Fotoutställning av målningarna',
    venue: 'Essoila',
    location: 'Karelen, Ryssland',
    startDate: '2007-09-01',
    endDate: '2007-11-30',
    type: 'solo',
  },
  {
    id: 's9',
    title: 'Utställning',
    venue: 'Skorpinjon',
    location: 'Umeå',
    startDate: '2008-12-01',
    endDate: '2008-12-31',
    type: 'solo',
  },
  {
    id: 's10',
    title: 'Utställning',
    venue: 'Folkets Hus',
    location: 'Umeå',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    type: 'solo',
  },
  // --- Samlingsutställningar ---
  {
    id: 'g1',
    title: 'Samlingsutställning',
    venue: 'Petrozavodsk Museum',
    location: 'Ryssland',
    startDate: '1994-09-01',
    endDate: '1994-11-30',
    type: 'group',
  },
  {
    id: 'g2',
    title: 'Samlingsutställning',
    venue: 'Järvtjärns bygdegård',
    location: 'Järvtjärn, Burträsk',
    startDate: '2001-07-01',
    endDate: '2001-07-31',
    type: 'group',
  },
  {
    id: 'g3',
    title: 'Samlingsutställning',
    venue: 'Järvtjärns bygdegård',
    location: 'Järvtjärn, Burträsk',
    startDate: '2001-11-01',
    endDate: '2001-11-30',
    type: 'group',
  },
  {
    id: 'g4',
    title: 'Samlingsutställning',
    venue: 'Järvtjärns bygdegård',
    location: 'Järvtjärn, Burträsk',
    startDate: '2002-07-01',
    endDate: '2002-07-31',
    type: 'group',
  },
  {
    id: 'g5',
    title: 'VIVA konstutställning',
    venue: 'Vasaskolan',
    location: 'Umeå',
    startDate: '2008-05-01',
    endDate: '2008-05-31',
    type: 'group',
  },
  {
    id: 'g6',
    title: 'Konst i Kvarn',
    venue: 'Konst i Kvarn',
    location: 'Vindeln',
    startDate: '2010-07-01',
    endDate: '2010-07-31',
    type: 'group',
  },
  {
    id: 'g7',
    title: 'Permanenta verk på väggar',
    venue: 'Mimerskolan',
    location: 'Umeå',
    startDate: '2005-01-01',
    endDate: '2009-12-31',
    type: 'group',
  },
]

export function getUpcomingExhibitions() {
  const today = new Date().toISOString().split('T')[0]
  return exhibitions
    .filter(e => e.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function getPastExhibitions() {
  const today = new Date().toISOString().split('T')[0]
  return exhibitions
    .filter(e => e.endDate < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export function formatDateRange(start: string, end: string, locale = 'sv-SE') {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

  // Samma månad och år
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return e.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }

  // Samma år
  if (s.getFullYear() === e.getFullYear()) {
    const startOpts: Intl.DateTimeFormatOptions = { month: 'long' }
    return `${s.toLocaleDateString(locale, startOpts)} – ${e.toLocaleDateString(locale, opts)}`
  }

  return `${s.toLocaleDateString(locale, opts)} – ${e.toLocaleDateString(locale, opts)}`
}
