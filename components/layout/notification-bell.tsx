'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationRow,
} from '@/lib/notifications-client-actions'
import { NOTIFICATION_TYPE_META, type NotificationType } from '@/lib/notifications'

function formatRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

export function NotificationBell({
  initialList,
  initialUnread,
}: {
  initialList: NotificationRow[]
  initialUnread: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<NotificationRow[]>(initialList)
  const [unread, setUnread] = useState(initialUnread)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 드롭다운 열기 시 최신화
  const refresh = useCallback(async () => {
    const r = await getMyNotifications(30)
    setList(r.list)
    setUnread(r.unread)
  }, [])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toggle() {
    if (!open) refresh()
    setOpen((v) => !v)
  }

  async function handleClickItem(n: NotificationRow) {
    if (!n.read_at) {
      // 낙관적 갱신
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      setUnread((c) => Math.max(0, c - 1))
      await markNotificationRead(n.id)
    }
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  async function handleMarkAll() {
    setList((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    setUnread(0)
    await markAllNotificationsRead()
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setList((prev) => prev.filter((n) => n.id !== id))
    setUnread((c) => {
      const target = list.find((n) => n.id === id)
      return target && !target.read_at ? Math.max(0, c - 1) : c
    })
    await deleteNotification(id)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#2a2a2a] hover:bg-zinc-100"
        aria-label="알림"
        title="알림"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900">
              알림 {unread > 0 && <span className="ml-1 text-rose-600">{unread}</span>}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900"
              >
                모두 읽음
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-zinc-400">
              새 알림이 없습니다.
            </div>
          ) : (
            <ul className="max-h-[480px] divide-y divide-zinc-100 overflow-y-auto">
              {list.map((n) => {
                const meta = NOTIFICATION_TYPE_META[n.type as NotificationType] ?? { icon: '🔔', tone: 'text-zinc-600' }
                const isUnread = !n.read_at
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClickItem(n)}
                      className={`group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 ${
                        isUnread ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <span className="mt-0.5 text-base leading-none">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
                        )}
                        <p className="mt-1 text-[10px] text-zinc-400">{formatRel(n.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, n.id)}
                        className="ml-1 shrink-0 cursor-pointer rounded p-1 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
                        title="삭제"
                        aria-label="삭제"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-zinc-100 px-4 py-2 text-center">
            <Link
              href="/mypage"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-500 hover:text-zinc-900"
            >
              마이페이지에서 더 보기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
