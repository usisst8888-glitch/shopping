'use client'

import { useState } from 'react'
import Link from 'next/link'

type Category = {
  id: string
  name: string
  parent_id: string | null
  level: number
}

export function HeaderCategories({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const topLevel = categories.filter((c) => c.level === 1)

  if (topLevel.length === 0) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="text-sm text-zinc-600 hover:text-zinc-900">
        카테고리
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-zinc-100 bg-white p-4 shadow-lg">
          <div className="flex gap-6">
            {topLevel.map((cat) => {
              const children = categories.filter(
                (c) => c.parent_id === cat.id && c.level === 2,
              )
              return (
                <div key={cat.id} className="min-w-[120px]">
                  <Link
                    href={`/category/${cat.id}`}
                    className="block text-sm font-semibold text-zinc-900 hover:text-zinc-600"
                    onClick={() => setOpen(false)}
                  >
                    {cat.name}
                  </Link>
                  {children.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.id}`}
                          className="block text-xs text-zinc-500 hover:text-zinc-900"
                          onClick={() => setOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
