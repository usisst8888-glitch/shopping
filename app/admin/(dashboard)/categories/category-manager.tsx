'use client'

import { useState } from 'react'
import { CategoryTree } from '@/components/admin/category-tree'
import { CategoryForm } from '@/components/admin/category-form'
import type { Category } from './actions'

type FormState =
  | { mode: 'idle' }
  | { mode: 'create'; parentId: string | null; parentLevel: number }
  | { mode: 'edit'; category: Category }

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [formState, setFormState] = useState<FormState>({ mode: 'idle' })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleSelect(cat: Category | null) {
    if (cat) {
      setSelectedId(cat.id)
      setFormState({ mode: 'edit', category: cat })
    } else {
      setSelectedId(null)
      setFormState({ mode: 'idle' })
    }
  }

  function handleAddChild(parentId: string, parentLevel: number) {
    setSelectedId(null)
    setFormState({ mode: 'create', parentId, parentLevel })
  }

  function handleAddRoot() {
    setSelectedId(null)
    setFormState({ mode: 'create', parentId: null, parentLevel: 0 })
  }

  function handleDone() {
    setSelectedId(null)
    setFormState({ mode: 'idle' })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* 좌측: 트리 뷰 */}
      <div className="lg:col-span-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">카테고리 목록</h2>
            <button
              onClick={handleAddRoot}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + 1차 카테고리 추가
            </button>
          </div>

          <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> 1차
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> 2차
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> 3차
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> 4차
            </span>
          </div>

          <CategoryTree
            categories={initialCategories}
            selectedId={selectedId}
            onSelect={handleSelect}
            onAddChild={handleAddChild}
          />
        </div>
      </div>

      {/* 우측: 폼 */}
      <div className="lg:col-span-2">
        {formState.mode === 'idle' ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-center text-sm text-zinc-400">
              카테고리를 선택하거나 새로 추가하세요.
            </p>
          </div>
        ) : formState.mode === 'create' ? (
          <CategoryForm
            key={`create-${formState.parentId}`}
            mode="create"
            parentId={formState.parentId}
            parentLevel={formState.parentLevel}
            onDone={handleDone}
          />
        ) : (
          <CategoryForm
            key={`edit-${formState.category.id}`}
            mode="edit"
            category={formState.category}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  )
}
