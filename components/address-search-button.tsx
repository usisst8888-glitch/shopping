'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

type DaumPostcodeData = {
  zonecode: string
  address: string
  roadAddress: string
  jibunAddress: string
  buildingName?: string
  bname?: string
  userSelectedType?: 'R' | 'J'
}

type DaumPostcode = {
  open: () => void
  embed: (element: HTMLElement) => void
}

type DaumNamespace = {
  Postcode: new (opts: {
    oncomplete: (data: DaumPostcodeData) => void
    onclose?: (state: string) => void
    width?: string | number
    height?: string | number
  }) => DaumPostcode
}

declare global {
  interface Window {
    daum?: { Postcode: DaumNamespace['Postcode'] }
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('SSR'))
      return
    }
    if (window.daum?.Postcode) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('load error')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('load error'))
    document.head.appendChild(script)
  })
}

export function AddressSearchButton({
  onSelect,
  className,
  children = '주소 검색',
}: {
  onSelect: (data: { zipcode: string; address: string }) => void
  className?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const embedRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // 모달 열림 시 body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // 모달 열림 시 임베드 마운트
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    loadScript()
      .then(() => {
        if (cancelled || !embedRef.current || !window.daum?.Postcode) return
        embedRef.current.innerHTML = ''
        new window.daum.Postcode({
          width: '100%',
          height: '100%',
          oncomplete: (data) => {
            const address =
              data.userSelectedType === 'J' ? data.jibunAddress : data.roadAddress || data.address
            onSelectRef.current({ zipcode: data.zonecode, address })
            setOpen(false)
          },
        }).embed(embedRef.current)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          className ??
          'shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50'
        }
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={handleClose}
        >
          <div
            className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[560px] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">주소 검색</h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="닫기"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative flex-1">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
                  불러오는 중...
                </div>
              )}
              <div ref={embedRef} className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
