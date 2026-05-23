import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontakt — Christina Hammarström',
  description: 'Kontakta Christina Hammarström angående köp, utställningar eller samarbeten.',
}

export default function ContactPage() {
  const mailtoLink = `mailto:filiparturfilm@gmail.com?subject=${encodeURIComponent('Förfrågan')}`

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl md:text-5xl mb-12">Kontakt</h1>

      <div className="space-y-10">
        <div>
          <h2 className="text-xs uppercase tracking-[0.2em] text-[#999] mb-4">Köp & förfrågningar</h2>
          <p className="text-[#444] leading-relaxed mb-6">
            Intresserad av ett verk? Hör gärna av dig med frågor om pris,
            mått, teknik eller fraktalternativ.
          </p>
          <a
            href={mailtoLink}
            className="inline-block bg-[#1C1C1C] text-white text-sm tracking-wider uppercase py-3.5 px-8 hover:bg-navy transition-colors"
          >
            Skicka e-post
          </a>
        </div>

        <div className="border-t border-warm-dark pt-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[#999] mb-4">Utställningar & samarbeten</h2>
          <p className="text-[#444] leading-relaxed">
            För frågor om utställningar, gallerier eller andra samarbeten,
            välkommen att höra av dig via e-post.
          </p>
        </div>

        <div className="border-t border-warm-dark pt-10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-[#999] mb-4">Svarstid</h2>
          <p className="text-[#444] text-sm">
            Svarar vanligtvis inom 1–2 arbetsdagar.
          </p>
        </div>
      </div>
    </div>
  )
}
