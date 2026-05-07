'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { NavItem } from '@/lib/types/design'

export function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={item.href}
        className="px-5 text-[13px] font-bold text-[#484848] hover:text-zinc-900"
        style={{ height: '50px', display: 'flex', alignItems: 'center' }}
      >
        {item.label}
      </Link>

      {open && item.children && item.children.length > 0 && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 rounded-xl border border-zinc-100 bg-white py-2 shadow-lg" style={{ minWidth: '160px', width: 'max-content' }}>
          {item.children.map((child, index) => (
            <Link
              key={`${child.href}-${index}`}
              href={child.href}
              className="block whitespace-nowrap px-5 py-2 text-[13px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              onClick={() => setOpen(false)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
