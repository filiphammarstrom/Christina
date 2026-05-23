import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Om Christina — Christina Hammarström',
  description: 'Läs om den svenska konstnären Christina Hammarström och hennes konstnärskap.',
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl md:text-5xl mb-12">Om Christina</h1>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Placeholder för porträttbild */}
        <div className="aspect-[3/4] bg-warm-dark flex items-center justify-center text-[#BBB] text-sm">
          Porträttbild
        </div>

        <div className="space-y-6 text-[#444] leading-relaxed">
          {/* Texten om Christina läggs in här */}
          <p className="font-serif text-xl text-[#1C1C1C] leading-relaxed">
            Text om Christina kommer snart.
          </p>
          <p className="text-[#999] text-sm italic">
            — Uppdateras med biografi
          </p>
        </div>
      </div>
    </div>
  )
}
