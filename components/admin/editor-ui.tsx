'use client'

import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Type } from 'lucide-react'

export const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px']
export const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

/**
 * 모달 안의 overflow 컨테이너에 갇히지 않도록 드롭다운 메뉴를 body 로 portal.
 * 트리거 위치 기준으로 fixed 좌표를 계산하고, dropUp 여부에 따라 위/아래로 배치한다.
 */
function DropdownMenu({
  triggerRef,
  dropUp,
  onClose,
  children,
  menuClassName,
}: {
  triggerRef: React.RefObject<HTMLElement | null>
  dropUp: boolean
  onClose: () => void
  children: ReactNode
  menuClassName?: string
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  })

  // 위치 계산 — open 시 1회 + 윈도우 스크롤/리사이즈 시 갱신
  useLayoutEffect(() => {
    const update = () => {
      const t = triggerRef.current
      const m = menuRef.current
      if (!t) return
      const r = t.getBoundingClientRect()
      let top: number
      if (dropUp) {
        const menuH = m?.offsetHeight ?? 0
        top = r.top - menuH - 4
      } else {
        top = r.bottom + 4
      }
      // 화면 좌측으로 정렬, 우측이 잘리면 우측 정렬로 보정
      let left = r.left
      const menuW = m?.offsetWidth ?? 0
      if (menuW && left + menuW > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - menuW - 8)
      }
      // 화면 위쪽도 보정
      if (top < 8) top = 8
      setPos({ top, left, ready: true })
    }
    update()
    // 메뉴 콘텐츠 렌더 후 정확한 사이즈로 한 번 더
    const raf = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [triggerRef, dropUp])

  // 바깥 클릭 시 닫힘 — 트리거/메뉴 둘 다 무시
  useEffect(() => {
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [triggerRef, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        // 측정 전까지 깜빡임 방지
        visibility: pos.ready ? 'visible' : 'hidden',
      }}
      className={menuClassName}
    >
      {children}
    </div>,
    document.body,
  )
}

// 어두운 툴바용 아이콘 버튼
export function ToolBtn({
  active = false,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded transition ${
        active ? 'bg-white/25 text-white' : 'text-zinc-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function Divider() {
  return <div className="mx-1 h-5 w-px bg-white/15" />
}

// 글자 크기 드롭다운 (T▾)
export function FontSizeDropdown({ onPick, dropUp = false }: { onPick: (size: string) => void; dropUp?: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="글자 크기"
        aria-label="글자 크기"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-0.5 rounded px-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
      >
        <Type size={15} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <DropdownMenu
          triggerRef={triggerRef}
          dropUp={dropUp}
          onClose={() => setOpen(false)}
          menuClassName="max-h-56 w-16 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(s); setOpen(false) }}
              className="block w-full cursor-pointer px-3 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100"
            >
              {parseInt(s)}
            </button>
          ))}
        </DropdownMenu>
      )}
    </>
  )
}

// 색상 드롭다운 (글자색/배경색 공용)
export function ColorDropdown({
  icon,
  title,
  current,
  onPick,
  dropUp = false,
}: {
  icon: ReactNode
  title: string
  current?: string
  onPick: (color: string) => void
  dropUp?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('#000000')
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        aria-label={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 flex-col items-center justify-center gap-0.5 rounded text-zinc-300 transition hover:bg-white/10 hover:text-white"
      >
        {icon}
        <span className="h-[3px] w-4 rounded-sm" style={{ backgroundColor: current || 'transparent' }} />
      </button>
      {open && (
        <DropdownMenu
          triggerRef={triggerRef}
          dropUp={dropUp}
          onClose={() => setOpen(false)}
          menuClassName="w-max rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
        >
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(c); setOpen(false) }}
                className="h-8 w-8 cursor-pointer rounded-md border border-zinc-300 transition hover:scale-110"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-zinc-300"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(custom); setOpen(false) }}
              className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              적용
            </button>
          </div>
        </DropdownMenu>
      )}
    </>
  )
}
