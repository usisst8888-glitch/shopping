'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function PageTracker({ siteId }: { siteId: string }) {
  const pathname = usePathname()
  const tracked = useRef<string | null>(null)

  useEffect(() => {
    if (!siteId || pathname === tracked.current) return
    tracked.current = pathname

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, path: pathname }),
    }).catch(() => {})
  }, [siteId, pathname])

  return null
}
