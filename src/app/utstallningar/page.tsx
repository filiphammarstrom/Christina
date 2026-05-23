import type { Metadata } from 'next'
import { getUpcomingExhibitions, getPastExhibitions, formatDateRange } from '@/data/exhibitions'

export const metadata: Metadata = {
  title: 'Utställningar — Christina Hammarström',
  description: 'Kommande och tidigare utställningar med Christina Hammarström.',
}

export default function ExhibitionsPage() {
  const upcoming = getUpcomingExhibitions()
  const past = getPastExhibitions()

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl md:text-5xl mb-12">Utställningar</h1>

      {/* Kommande */}
      <section className="mb-16">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[#999] mb-8">Aktuellt & kommande</h2>

        {upcoming.length === 0 ? (
          <p className="text-[#999] font-serif text-lg">Inga utställningar inplanerade för tillfället.</p>
        ) : (
          <div className="space-y-8">
            {upcoming.map(exhibition => (
              <div key={exhibition.id} className="border-l-2 border-gold pl-6">
                <p className="text-xs uppercase tracking-wider text-gold mb-2">
                  {exhibition.type === 'solo' ? 'Soloutsttällning' : 'Grupputsttällning'}
                </p>
                <h3 className="font-serif text-2xl mb-1">{exhibition.title}</h3>
                <p className="text-[#555] mb-1">{exhibition.venue}, {exhibition.location}</p>
                <p className="text-sm text-[#888] mb-3">
                  {formatDateRange(exhibition.startDate, exhibition.endDate)}
                </p>
                {exhibition.description && (
                  <p className="text-[#555] text-sm leading-relaxed">{exhibition.description}</p>
                )}
                {exhibition.url && (
                  <a
                    href={exhibition.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-gold hover:underline"
                  >
                    Mer information →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tidigare */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-[#999] mb-8">Tidigare</h2>
          <div className="space-y-6">
            {past.map(exhibition => (
              <div key={exhibition.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4 border-b border-warm-dark last:border-0">
                <span className="text-sm text-[#999] sm:w-40 shrink-0">
                  {formatDateRange(exhibition.startDate, exhibition.endDate)}
                </span>
                <div>
                  <span className="font-serif text-lg">{exhibition.title}</span>
                  <span className="text-[#888] text-sm ml-2">— {exhibition.venue}, {exhibition.location}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
