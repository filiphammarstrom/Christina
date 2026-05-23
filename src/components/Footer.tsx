import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-warm-dark mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#888]">
        <p className="font-serif text-base text-[#555]">Christina Hammarström</p>
        <nav className="flex gap-6">
          <Link href="/" className="hover:text-gold transition-colors">Verk</Link>
          <Link href="/utstallningar" className="hover:text-gold transition-colors">Utställningar</Link>
          <Link href="/om" className="hover:text-gold transition-colors">Om</Link>
          <Link href="/kontakt" className="hover:text-gold transition-colors">Kontakt</Link>
        </nav>
        <p>© {year}</p>
      </div>
    </footer>
  )
}
