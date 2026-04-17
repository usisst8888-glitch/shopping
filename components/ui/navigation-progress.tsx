'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setLoading(true)
    setWidth(70)

    const timer = setTimeout(() => {
      setWidth(100)
      setTimeout(() => {
        setLoading(false)
        setWidth(0)
      }, 200)
    }, 300)

    return () => clearTimeout(timer)
  }, [pathname])

  if (!loading && width === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-zinc-900 transition-all duration-300 ease-out"
        style={{ width: `${width}%`, opacity: loading ? 1 : 0 }}
      />
    </div>
  )
}
