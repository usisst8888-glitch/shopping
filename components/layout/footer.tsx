import Link from 'next/link'
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
  const phone = design?.footer_phone ?? '010-0000-0000'
  const hours = design?.footer_hours ?? '평일 10:00 - 18:00'
  const lunch = design?.footer_lunch ?? '12:00 - 13:00'

  return (
    <footer className="border-t border-zinc-100 bg-zinc-900 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">{siteName}</h3>
            <p className="text-sm leading-relaxed">
              {description ?? '최상급 명품 레플리카를 합리적인 가격에 만나보세요.'}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">고객센터</h4>
            <ul className="space-y-2 text-sm">
              <li>전화: {phone}</li>
              <li>운영시간: {hours}</li>
              <li>점심시간: {lunch}</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">이용안내</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white">이용약관</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white">개인정보처리방침</Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white">교환 및 반품 안내</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-800 pt-8 text-center text-xs">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
