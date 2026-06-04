'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import type { NavItem, NavSubItem } from '@/lib/types/design'

const VIEWPORT_PAD = 16 // popup 과 viewport 상하단 사이 최소 외부 여백

function SubMenu({ item }: { item: NavSubItem }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLAnchorElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [popupOffsetY, setPopupOffsetY] = useState(0)
  const hasChildren = item.children && item.children.length > 0

  // 3차 popup 이 viewport 아래로 잘리면 위로 끌어올리고, 그래도 길면 max-height 로 자체 스크롤
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popupRef.current) return
    const compute = () => {
      const t = triggerRef.current
      const p = popupRef.current
      if (!t || !p) return
      const tRect = t.getBoundingClientRect()
      const vh = window.innerHeight
      const maxH = vh - 2 * VIEWPORT_PAD
      // popup 의 실제 콘텐츠 높이 (max-height 가 걸리기 전 기준)
      const naturalH = Math.min(p.scrollHeight, maxH)
      // popup top(viewport 좌표) = tRect.top + offsetY
      // 조건: tRect.top + offsetY + naturalH <= vh - VIEWPORT_PAD
      //       tRect.top + offsetY >= VIEWPORT_PAD
      const bottomOverflow = tRect.top + naturalH - (vh - VIEWPORT_PAD)
      let offsetY = 0
      if (bottomOverflow > 0) offsetY = -bottomOverflow
      if (tRect.top + offsetY < VIEWPORT_PAD) offsetY = VIEWPORT_PAD - tRect.top
      setPopupOffsetY(offsetY)
    }
    compute()
    const raf = requestAnimationFrame(compute) // 콘텐츠 렌더 후 한 번 더
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        ref={triggerRef}
        href={item.href}
        className="flex items-center justify-between whitespace-nowrap px-5 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      >
        {item.label}
        {hasChildren && (
          <svg className="ml-3 h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Link>

      {open && hasChildren && (
        <div
          ref={popupRef}
          className="absolute left-full z-50 ml-0.5 overflow-y-auto overscroll-contain rounded-xl border border-zinc-100 bg-white py-2 shadow-lg [scrollbar-width:thin]"
          style={{
            minWidth: '140px',
            width: 'max-content',
            top: popupOffsetY,
            maxHeight: `calc(100vh - ${VIEWPORT_PAD * 2}px)`,
          }}
        >
          {item.children!.map((child, index) => (
            <Link
              key={`${child.href}-${index}`}
              href={child.href}
              className="block whitespace-nowrap px-5 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function NavDropdown({
  item,
  fontSize = 13,
  color = '#484848',
  hoverColor = '#18181b',
}: {
  item: NavItem
  fontSize?: number
  color?: string
  hoverColor?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={item.href}
        className="px-5 font-bold transition-colors hover:text-[color:var(--nav-hover)]"
        style={{
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          fontSize: `${fontSize}px`,
          color,
          ['--nav-hover' as string]: hoverColor,
        }}
      >
        {item.label}
      </Link>

      {open && item.children && item.children.length > 0 && (
        <div
          className="absolute left-1/2 top-full z-50 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-xl border border-zinc-100 bg-white py-2 shadow-lg [scrollbar-width:thin]"
          style={{
            minWidth: '160px',
            width: 'max-content',
            // trigger 바로 아래에 떠 있으므로 trigger 의 viewport 위치를 기준으로 잔여 높이를 계산.
            // 100vh - (트리거 하단 ≒ 헤더 + 네비 높이) - 여백
            maxHeight: 'calc(100vh - 140px)',
          }}
        >
          {item.children.map((child, index) => (
            <SubMenu key={`${child.href}-${index}`} item={child} />
          ))}
        </div>
      )}
    </div>
  )
}
