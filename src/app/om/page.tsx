import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Om Christina — Christina Hammarström',
  description: 'Läs om den svenska konstnären Christina Hammarström och hennes konstnärskap.',
}

const bio = [
  `Min konst är djupt inspirerad av naturen, människan och djuren. I mitt bildspråk återkommer teman som kärlek, moderskap och livets kretslopp, ofta med en andlig dimension. Mina målningar kan beskrivas som organiska, holistiska och symbolmättade, där det yttre och det inre möts.`,
  `Jag är uppvuxen i Umeå, men tillbringade mycket tid på landet som barn. Där väcktes min starka dragning till djur och natur, vilket ledde till att jag utbildade mig till agronom. Mitt yrkesliv har rört sig mellan undervisning, lantbruk, landsbygdsutveckling och kreativt skapande. Efter arbete som lärare på en lantbruksskola flyttade jag till Gotland, där jag först arbetade som rådgivare åt bönder och senare drev eget jordbruk på heltid.`,
  `Livet på gården blev en viktig källa till min konst. Där levde jag nära djuren, naturens rytm och de stora existentiella frågorna. Hundratals lamm föddes på gården, och både det spirande livet och dödens närvaro blev en del av vardagen. Gården utvecklades också till en kreativ plats med ullspinneri, gårdsbutik, hantverk, kurser i växtfärgning och ett leksaksmuseum. Jag utbildade mig inom landskapslöjd och vävning, och började samtidigt måla akvarell när tiden tillät. Det var ett rikt och skapande liv, som kom att prägla mig starkt.`,
  `När jag senare flyttade tillbaka till Umeå saknade jag det kreativa flödet från Gotland. Jag utbildade mig vidare till lärare i samhällskunskap och historia, men återvände till måleriet som ett nödvändigt andningshål och ett sätt att uttrycka det som inte ryms i ord.`,
  `Bildskapandet har följt mig sedan barndomen. Jag ritade mycket som ung och gick extra lektioner i teckning under högstadiet och gymnasiet. Hemmet var också fyllt av konstnärliga influenser: min pappa var konstsamlare och min mamma vävde och målade. När jag flyttade hem 1989 fick jag låna hennes färger, och det blev början på en intensiv period av måleri. Jag gick från teckning till akvarell och akryl, och fann till slut mitt starkaste uttryck i oljemåleriet, som fortfarande är min favoritmetod.`,
  `Trots studier, arbete och familjeliv fortsatte konsten att finnas där. Jag blev erbjuden att ställa ut både i Tyskland och Ryssland, och tog chansen. Genom Länsstyrelsen i Västerbottens län fick jag även möjlighet att delta i ett utvecklingsprojekt på landsbygden i ryska Karelen. Det blev starten på flera år av projektarbete där jag hjälpte landsbygdsbefolkning att återta traditionell kultur och skapa nya möjligheter till arbete och försörjning. I det arbetet fick jag stor nytta av mina kreativa erfarenheter från Gotland. Under tiden visades även min konst på flera platser, och jag mötte många karelska konstnärer som inspirerade mig vidare.`,
  `Efter att arbetet i Karelen avslutades 2007 fortsatte jag med utvecklingsprojekt i Sverige, parallellt med arbete som lärare på Komvux i Umeå. Under åren 1990 till 2010 ställde jag regelbundet ut min konst.`,
  `Sedan kom ett långt uppehåll. Min mamma drabbades av cancer i stämbanden, vilket först visade sig som heshet. När hon senare gick bort väcktes en stark oro hos mig, särskilt eftersom vi båda hade arbetat med lösningsmedel i samband med oljemåleri. När jag själv började känna heshet valde jag att sluta måla.`,
  `Nu, 15 år senare, har jag återvänt till måleriet. Med säkrare material och samma inre drivkraft har skapandet åter tagit plats i mitt liv. I dag planerar jag att ställa ut mina verk igen.`,
]

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl md:text-5xl mb-16">Om Christina</h1>

      <div className="grid md:grid-cols-[1fr_1.6fr] gap-16 items-start">
        {/* Portrait image */}
        <div className="sticky top-28">
          <div className="aspect-[3/4] bg-warm-dark flex items-center justify-center text-[#BBB] text-sm">
            Porträttbild
          </div>
          <p className="text-xs text-[#AAA] mt-3 text-center">Christina Hammarström, Umeå</p>
        </div>

        {/* Bio text */}
        <div className="space-y-5">
          {/* Lead paragraph */}
          <p className="font-serif text-xl md:text-2xl text-[#1C1C1C] leading-relaxed">
            {bio[0]}
          </p>

          <div className="w-12 h-px bg-gold my-8" />

          {/* Rest of bio */}
          {bio.slice(1).map((paragraph, i) => (
            <p key={i} className="text-[#444] leading-relaxed">
              {paragraph}
            </p>
          ))}

          <div className="pt-6 border-t border-warm-dark">
            <p className="text-sm text-[#999]">Umeå</p>
          </div>
        </div>
      </div>
    </div>
  )
}
