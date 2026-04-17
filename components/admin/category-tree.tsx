'use client'

import { useState } from 'react'
import type { Category } from '@/app/admin/(dashboard)/categories/actions'
import { deleteCategory } from '@/app/admin/(dashboard)/categories/actions'

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  onAddChild,
}: {
  categories: Category[]
  selectedId: string | null
  onSelect: (cat: Category | null) => void
  onAddChild: (parentId: string, parentLevel: number) => void
}) {
  return (
    <div className="space-y-1">
      {categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          등록된 카테고리가 없습니다.
        </p>
      ) : (
        categories.map((cat) => (
          <TreeNode
            key={cat.id}
            category={cat}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
          />
        ))
      )}
    </div>
  )
}

function TreeNode({
  category,
  selectedId,
  onSelect,
  onAddChild,
}: {
  category: Category
  selectedId: string | null
  onSelect: (cat: Category | null) => void
  onAddChild: (parentId: string, parentLevel: number) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = category.children && category.children.length > 0
  const isSelected = selectedId === category.id
  const canAddChild = category.level < 4

  const levelColors = [
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-amber-500',
    'border-l-rose-500',
  ]

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?\n하위 카테고리도 함께 삭제됩니다.`)) return
    await deleteCategory(category.id)
    if (isSelected) onSelect(null)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-sm cursor-pointer transition ${
          levelColors[category.level - 1]
        } ${isSelected ? 'bg-blue-50 text-blue-900' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
        style={{ marginLeft: (category.level - 1) * 16 }}
        onClick={() => onSelect(category)}
      >
        {/* 펼침/접힘 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
            className="flex h-5 w-5 items-center justify-center text-zinc-400 hover:text-zinc-700"
          >
            {open ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* 레벨 뱃지 */}
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          {category.level}차
        </span>

        {/* 카테고리 번호 */}
        {category.category_no && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-600">
            {category.category_no}
          </span>
        )}

        {/* 메인 표시 뱃지 */}
        {category.is_main && (
          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
            메인
          </span>
        )}

        {/* 이미지 표시 */}
        {category.image_url && (
          <img src={category.image_url} alt="" className="h-5 w-5 rounded object-cover" />
        )}

        {/* 이름 */}
        <span className="flex-1 truncate font-medium">{category.name}</span>

        {/* 액션 버튼 */}
        <div className="hidden items-center gap-1 group-hover:flex">
          {canAddChild && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(category.id, category.level)
              }}
              className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100"
              title="하위 카테고리 추가"
            >
              +하위
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
            title="삭제"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 하위 카테고리 */}
      {hasChildren && open && (
        <div className="mt-1 space-y-1">
          {category.children!.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}
