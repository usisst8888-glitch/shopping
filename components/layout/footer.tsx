import type { SiteDesign } from '@/lib/types/design'

export function Footer({
  siteName,
  description,
  design,
}: {
  siteName: string
  description: string | null
  design?: SiteDesign | null
}) {
  const hours = design?.footer_hours ?? ''
  const lunch = design?.footer_lunch ?? ''
  const extra = design?.footer_extra ?? ''

  return (
    <footer className="border-t border-zinc-100 bg-zinc-900 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center">
          <h3 className="mb-4 text-2xl tracking-widest text-white" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{siteName}</h3>
          <p className="text-sm leading-relaxed">
            {description ?? '최상급 명품 레플리카를 합리적인 가격에 만나보세요.'}
          </p>

          {(hours || lunch) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-zinc-400">
              {hours && (
                <span>
                  <span className="text-zinc-500">운영시간 </span>
                  <span className="text-zinc-200">{hours}</span>
                </span>
              )}
              {lunch && (
                <span>
                  <span className="text-zinc-500">점심시간 </span>
                  <span className="text-zinc-200">{lunch}</span>
                </span>
              )}
            </div>
          )}

          {extra && (
            <div
              className="prose prose-sm prose-invert mx-auto mt-6 max-w-2xl text-center text-zinc-300"
              dangerouslySetInnerHTML={{ __html: extra }}
            />
          )}
        </div>
        <div className="mt-8 border-t border-zinc-800 pt-8 text-center text-xs">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
