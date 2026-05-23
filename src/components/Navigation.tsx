'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Verk' },
  { href: '/utstallningar', label: 'Utställningar' },
  { href: '/om', label: 'Om Christina' },
  { href: '/kontakt', label: 'Kontakt' },
]

export default function Navigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-warm/95 backdrop-blur-sm border-b border-warm-dark">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl md:text-2xl tracking-wide text-[#1C1C1C] hover:text-gold transition-colors">
          Christina Hammarström
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm tracking-wider uppercase transition-colors ${
                pathname === href
                  ? 'text-gold border-b border-gold pb-0.5'
                  : 'text-[#555] hover:text-[#1C1C1C]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Meny"
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`block h-px bg-[#1C1C1C] transition-all ${menuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
            <span className={`block h-px bg-[#1C1C1C] transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-px bg-[#1C1C1C] transition-all ${menuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-warm-dark bg-warm animate-fade-in">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-6 py-4 text-sm tracking-wider uppercase border-b border-warm-dark last:border-0 transition-colors ${
                pathname === href ? 'text-gold' : 'text-[#555] hover:text-[#1C1C1C]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
