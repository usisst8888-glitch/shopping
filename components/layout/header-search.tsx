'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HeaderSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색"
        className="w-48 border-b border-zinc-300 bg-transparent px-1 py-0.5 text-[12px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none lg:w-56"
      />
      <button type="submit" className="text-zinc-600 hover:text-zinc-900">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>
    </form>
  )
}
