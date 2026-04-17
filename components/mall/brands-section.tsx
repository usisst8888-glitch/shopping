const defaultBrands = [
  'GUCCI',
  'LOUIS VUITTON',
  'CHANEL',
  'HERMES',
  'DIOR',
  'PRADA',
  'BALENCIAGA',
  'BOTTEGA VENETA',
]

export function BrandsSection({ brandsList }: { brandsList?: string[] }) {
  const brands =
    brandsList && brandsList.length > 0 ? brandsList : defaultBrands

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">
        취급 브랜드
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-8">
        {brands.map((brand) => (
          <span
            key={brand}
            className="text-sm font-medium tracking-wider text-zinc-400"
          >
            {brand}
          </span>
        ))}
      </div>
    </section>
  )
}
