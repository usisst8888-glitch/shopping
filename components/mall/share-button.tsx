'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  path: string
  title?: string
  className?: string
  inline?: boolean
  // 커스텀 콘텐츠 (아이콘 등). 지정하면 텍스트 라벨 대신 이걸 표시
  children?: React.ReactNode
}

type SnsItem = {
  key: 'line' | 'band' | 'naver' | 'facebook' | 'twitter'
  label: string
  color: string
  icon: React.ReactNode
}

// 공유 버튼: 클릭 시 SNS 공유 모달이 열림.
// 모달 안에서 라인/밴드/네이버/페이스북/X 또는 URL 복사 선택 가능.
export function ShareButton({ path, title, className, inline = false, children }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined' ? window.location.origin + path : path
  const encodedUrl = encodeURIComponent(fullUrl)
  const encodedTitle = encodeURIComponent(title ?? '')

  const SNS_LIST: SnsItem[] = [
    {
      key: 'line',
      label: '라인',
      color: 'bg-[#00C300]',
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      ),
    },
    {
      key: 'band',
      label: '밴드',
      color: 'bg-[#44D54B]',
      icon: (
        <span className="text-base font-black">B</span>
      ),
    },
    {
      key: 'naver',
      label: '네이버',
      color: 'bg-[#03C75A]',
      icon: <span className="text-lg font-black">N</span>,
    },
    {
      key: 'facebook',
      label: '페이스북',
      color: 'bg-[#1877F2]',
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: 'twitter',
      label: 'X',
      color: 'bg-black',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ]

  const SNS_HREF: Record<SnsItem['key'], string> = {
    line: `https://lineit.line.me/share/ui?url=${encodedUrl}&text=${encodedTitle}`,
    band: `https://band.us/plugin/share?body=${encodedTitle}%0A${encodedUrl}&route=${encodedUrl}`,
    naver: `https://share.naver.com/web/shareView?url=${encodedUrl}&title=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
  }

  function handleClickTrigger(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setCopied(false)
    setOpen(true)
  }

  function openSns(key: SnsItem['key']) {
    window.open(SNS_HREF[key], '_blank', 'width=600,height=620,noopener,noreferrer')
  }

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return
      }
    } catch {
      // fallthrough
    }
    prompt('아래 링크를 복사하세요:', fullUrl)
  }

  const triggerButton = children ? (
    <button
      type="button"
      onClick={handleClickTrigger}
      title="공유"
      aria-label="공유"
      className={className ?? 'cursor-pointer text-zinc-500 hover:text-zinc-900'}
    >
      {children}
    </button>
  ) : inline ? (
    <button
      type="button"
      onClick={handleClickTrigger}
      className={className ?? 'cursor-pointer hover:text-zinc-700'}
    >
      공유
    </button>
  ) : (
    <button
      type="button"
      onClick={handleClickTrigger}
      className={
        className ??
        'cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50'
      }
    >
      공유
    </button>
  )

  return (
    <>
      {triggerButton}

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <h4 className="text-base font-semibold text-zinc-900">공유하기</h4>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 본문 */}
              <div className="px-5 py-5">
                {/* SNS 5종 */}
                <ul className="grid grid-cols-5 gap-2 sm:gap-3">
                  {SNS_LIST.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => openSns(s.key)}
                        className="flex w-full cursor-pointer flex-col items-center gap-2"
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition group-hover:scale-105 ${s.color}`}
                        >
                          {s.icon}
                        </span>
                        <span className="text-[11px] text-zinc-600">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* URL 복사 */}
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50/50 p-1.5">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-zinc-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 cursor-pointer rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    {copied ? '복사됨' : '복사'}
                  </button>
                </div>
                {copied && (
                  <p className="mt-2 text-center text-xs text-emerald-600">링크가 복사되었습니다.</p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
