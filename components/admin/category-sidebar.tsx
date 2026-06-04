'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Category = {
  id: string
  name: string
  category_no: string | null
  parent_id: string | null
  level: number
}

type TreeNode = Category & { children: TreeNode[] }

const levelBorderColors = [
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-amber-500',
  'border-l-rose-500',
]

export function CategorySidebar({
  categories,
  currentCategoryId,
}: {
  categories: Category[]
  currentCategoryId: string
}) {
  const searchParams = useSearchParams()

  // 트리 구성 (입력 순서 유지)
  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] })
    }
    for (const cat of categories) {
      const node = map.get(cat.id)!
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }, [categories])

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  // 선택된 카테고리의 조상은 자동 펼침 (단, 펼침/접힘은 이후 사용자가 자유롭게 조작 가능)
  useEffect(() => {
    if (!currentCategoryId) return
    setOpenIds((prev) => {
      const next = new Set(prev)
      let pid = categories.find((c) => c.id === currentCategoryId)?.parent_id ?? null
      while (pid) {
        next.add(pid)
        pid = categories.find((c) => c.id === pid)?.parent_id ?? null
      }
      return next
    })
  }, [categories, currentCategoryId])

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function buildUrl(catId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (catId) params.set('category', catId)
    else params.delete('category')
    params.delete('page')
    const qs = params.toString()
    return `/admin/products${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="w-80 flex-shrink-0">
      <div className="sticky top-20 rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-zinc-900">카테고리</h3>
        <div className="space-y-1">
          <Link
            href={buildUrl('')}
            className={`block rounded-lg px-3 py-2 text-[13px] ${
              !currentCategoryId
                ? 'bg-zinc-900 font-bold text-white'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            전체
          </Link>
          {tree.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-400">
              등록된 카테고리가 없습니다.
            </p>
          ) : (
            tree.map((node) => (
              <SidebarNode
                key={node.id}
                node={node}
                currentCategoryId={currentCategoryId}
                openIds={openIds}
                onToggle={toggle}
                buildUrl={buildUrl}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SidebarNode({
  node,
  currentCategoryId,
  openIds,
  onToggle,
  buildUrl,
}: {
  node: TreeNode
  currentCategoryId: string
  openIds: Set<string>
  onToggle: (id: string) => void
  buildUrl: (catId: string) => string
}) {
  const hasChildren = node.children.length > 0
  const isSelected = currentCategoryId === node.id
  const isOpen = openIds.has(node.id)

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-lg border-l-4 px-2 py-1.5 text-[13px] transition ${
          levelBorderColors[node.level - 1]
        } ${
          isSelected
            ? 'bg-blue-50 font-semibold text-blue-900'
            : 'bg-white text-zinc-700 hover:bg-zinc-50'
        }`}
        style={{ marginLeft: (node.level - 1) * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-700"
          >
            {isOpen ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        <span className="flex-shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          {node.level}차
        </span>

        <Link
          href={buildUrl(node.id)}
          className="flex-1 truncate"
          title={node.name}
        >
          {node.name}
        </Link>
      </div>

      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <SidebarNode
              key={child.id}
              node={child}
              currentCategoryId={currentCategoryId}
              openIds={openIds}
              onToggle={onToggle}
              buildUrl={buildUrl}
            />
          ))}
        </div>
      )}
    </div>
  )
}
