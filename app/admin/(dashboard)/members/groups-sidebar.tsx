'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createGroup, updateGroup, deleteGroup, type MemberGroup } from './groups/actions'

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#ec4899',
  '#6b7280',
]

export function GroupsSidebar({
  groups,
  totalMembers,
  noneCount,
}: {
  groups: MemberGroup[]
  totalMembers: number
  noneCount: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get('group') ?? 'all'
  const [editing, setEditing] = useState<MemberGroup | null>(null)
  const [creating, setCreating] = useState(false)

  function go(value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (!value || value === 'all') sp.delete('group')
    else sp.set('group', value)
    const qs = sp.toString()
    router.push(`/admin/members${qs ? `?${qs}` : ''}`)
  }

  return (
    <aside className="rounded-xl bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-2 py-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">그룹</h3>
        <button
          type="button"
          onClick={() => setCreating(true)}
          title="새 그룹"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <nav className="space-y-0.5">
        <SidebarItem
          active={active === 'all'}
          onClick={() => go('all')}
          color="#a1a1aa"
          label="전체"
          count={totalMembers}
        />
        <SidebarItem
          active={active === 'none'}
          onClick={() => go('none')}
          color="#d4d4d8"
          label="그룹없음"
          count={noneCount}
        />

        {groups.length > 0 && (
          <div className="my-2 border-t border-zinc-100" />
        )}

        {groups.map((g) => (
          <SidebarItem
            key={g.id}
            active={active === g.id}
            onClick={() => go(g.id)}
            color={g.color}
            label={g.name}
            count={g.member_count ?? 0}
            onEdit={() => setEditing(g)}
            onDelete={async () => {
              if (!confirm(`「${g.name}」 그룹을 삭제하시겠습니까? 소속된 회원의 그룹 정보가 비워집니다.`)) return
              const r = await deleteGroup(g.id)
              if (r.error) alert(r.error)
              else {
                if (active === g.id) go('all')
                else router.refresh()
              }
            }}
          />
        ))}
      </nav>

      {(creating || editing) && (
        <GroupEditModal
          group={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            setEditing(null)
            setCreating(false)
            router.refresh()
          }}
        />
      )}
    </aside>
  )
}

function SidebarItem({
  active,
  onClick,
  color,
  label,
  count,
  onEdit,
  onDelete,
}: {
  active: boolean
  onClick: () => void
  color: string
  label: string
  count: number
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`group/item flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
        active ? 'bg-zinc-100' : 'hover:bg-zinc-50'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className={`flex-1 truncate text-sm ${active ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>
          {label}
        </span>
        <span className="text-xs text-zinc-400">{count}</span>
      </button>
      {(onEdit || onDelete) && (
        <div className="flex items-center opacity-0 transition group-hover/item:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="수정"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="삭제"
              className="rounded p-1 text-zinc-400 hover:bg-rose-100 hover:text-rose-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function GroupEditModal({
  group,
  onClose,
  onSaved,
}: {
  group: MemberGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!group
  const [name, setName] = useState(group?.name ?? '')
  const [color, setColor] = useState(group?.color ?? DEFAULT_COLORS[0])
  const [description, setDescription] = useState(group?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('그룹 이름을 입력해주세요.')
      return
    }
    setSaving(true)
    setError(null)
    const r = isEdit
      ? await updateGroup(group!.id, { name, color, description })
      : await createGroup({ name, color, description })
    setSaving(false)
    if (r.error) {
      setError(r.error)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {isEdit ? '그룹 수정' : '새 그룹'}
          </h3>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">그룹 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: VIP, 신규 가입자"
              className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">색상</label>
            <div className="flex flex-wrap items-center gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                    color === c ? 'ring-2 ring-zinc-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-md border border-zinc-300"
                title="직접 지정"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 그룹의 용도를 짧게 설명해주세요"
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
          )}
        </div>
        <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : isEdit ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
