'use client'

import { useState, useEffect } from 'react'

type PopupData = {
  id: string
  title: string
  image_url: string
  link_url: string | null
  position: string
  width: number
}

export function LayerPopup({ popups }: { popups: PopupData[] }) {
  const [visiblePopups, setVisiblePopups] = useState<PopupData[]>([])

  useEffect(() => {
    const filtered = popups.filter((p) => {
      const dismissed = localStorage.getItem(`popup_dismiss_${p.id}`)
      if (!dismissed) return true
      return Date.now() > parseInt(dismissed)
    })
    setVisiblePopups(filtered)
  }, [popups])

  function handleClose(id: string) {
    setVisiblePopups((prev) => prev.filter((p) => p.id !== id))
  }

  function handleCloseToday(id: string) {
    const tomorrow = new Date()
    tomorrow.setHours(23, 59, 59, 999)
    localStorage.setItem(`popup_dismiss_${id}`, tomorrow.getTime().toString())
    handleClose(id)
  }

  if (visiblePopups.length === 0) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      {visiblePopups.map((popup) => {
        const posClass =
          popup.position === 'left'
            ? 'mr-auto ml-4'
            : popup.position === 'right'
              ? 'ml-auto mr-4'
              : 'mx-auto'

        return (
          <div
            key={popup.id}
            className={`relative ${posClass}`}
            style={{ width: `${popup.width}px`, maxWidth: 'calc(100vw - 32px)' }}
          >
            {popup.link_url ? (
              <a href={popup.link_url} target={popup.link_url.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer">
                <img src={popup.image_url} alt={popup.title} className="w-full rounded-t-lg" />
              </a>
            ) : (
              <img src={popup.image_url} alt={popup.title} className="w-full rounded-t-lg" />
            )}
            <div className="flex rounded-b-lg bg-white">
              <button
                onClick={() => handleCloseToday(popup.id)}
                className="flex-1 border-r border-zinc-200 py-3 text-xs text-zinc-500 hover:bg-zinc-50"
              >
                오늘 하루 보지 않기
              </button>
              <button
                onClick={() => handleClose(popup.id)}
                className="flex-1 py-3 text-xs text-zinc-500 hover:bg-zinc-50"
              >
                닫기
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
