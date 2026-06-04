'use client'

import { useState } from 'react'
import {
  type HeaderAuthConfig,
  type HeaderAuthItem,
  DEFAULT_HEADER_AUTH_CONFIG,
  formatBubbleText,
} from '@/lib/header-auth-config'
import { saveHeaderAuthConfigDraft } from './actions'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function HeaderAuthEditor({
  siteId,
  initialConfig,
  onClose,
  onApplied,
}: {
  siteId: string
  initialConfig: HeaderAuthConfig
  onClose: () => void
  /** 메모리에 새 config 를 적용 (부모 state). DB 정식 저장은 하지 않음. */
  onApplied: (next: HeaderAuthConfig) => void
}) {
  const [tab, setTab] = useState<'anon' | 'loggedIn'>('anon')
  const [config, setConfig] = useState<HeaderAuthConfig>(initialConfig)
  const [saving, setSaving] = useState(false)

  const items = tab === 'anon' ? config.anon_items : config.logged_in_items
  const setItems = (next: HeaderAuthItem[]) =>
    setConfig((c) => ({ ...c, [tab === 'anon' ? 'anon_items' : 'logged_in_items']: next }))

  function updateItem(idx: number, patch: Partial<HeaderAuthItem>) {
    const next = items.map((it, i) => (i === idx ? ({ ...it, ...patch } as HeaderAuthItem) : it))
    setItems(next)
  }
  function moveItem(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setItems(next)
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }
  function addLink() {
    setItems([
      ...items,
      { id: uid(), type: 'link', label: '새 메뉴', href: '/', visible: true },
    ])
  }

  // 「적용」 — 미리보기 draft 에만 저장 + 부모 state 갱신. 정식 저장은 외부 「저장」 버튼에서.
  async function handleApply() {
    setSaving(true)
    const r = await saveHeaderAuthConfigDraft(siteId, config)
    setSaving(false)
    if (r.error) {
      alert(r.error)
      return
    }
    onApplied(config)
  }

  function resetDefaults() {
    if (!confirm('초기 설정으로 되돌리시겠습니까?')) return
    setConfig(DEFAULT_HEADER_AUTH_CONFIG)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-900">헤더 우측 메뉴 편집</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 공통 스타일 */}
          <section className="mb-5">
            <h4 className="mb-2 text-sm font-semibold text-zinc-800">공통 스타일</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="텍스트 크기 (px)">
                <input
                  type="number"
                  min={8}
                  max={20}
                  value={config.font_size}
                  onChange={(e) =>
                    setConfig({ ...config, font_size: parseInt(e.target.value) || 12 })
                  }
                  className="h-9 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
              </Field>
              <Field label="텍스트 색상">
                <ColorInput
                  value={config.color}
                  onChange={(v) => setConfig({ ...config, color: v })}
                />
              </Field>
            </div>
          </section>

          {/* 보너스 말풍선 */}
          <section className="mb-5">
            <h4 className="mb-2 text-sm font-semibold text-zinc-800">회원가입 보너스 말풍선</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="배경색">
                <ColorInput
                  value={config.bubble_bg}
                  onChange={(v) => setConfig({ ...config, bubble_bg: v })}
                />
              </Field>
              <Field label="글자색">
                <ColorInput
                  value={config.bubble_color}
                  onChange={(v) => setConfig({ ...config, bubble_color: v })}
                />
              </Field>
              <Field label="말풍선 문구 (변수: {point})">
                <input
                  type="text"
                  value={config.bubble_text}
                  onChange={(e) => setConfig({ ...config, bubble_text: e.target.value })}
                  placeholder="+{point}원"
                  className="h-9 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
              </Field>
              <div>
                <span className="mb-1 block text-xs font-medium text-zinc-500">미리보기</span>
                <span
                  className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: config.bubble_bg,
                    color: config.bubble_color,
                  }}
                >
                  {formatBubbleText(config.bubble_text || '+{point}원', 5000)}
                </span>
              </div>
            </div>
          </section>

          {/* 탭: 비로그인 / 로그인 */}
          <section>
            <div className="mb-3 flex border-b border-zinc-200">
              {(['anon', 'loggedIn'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                    tab === t
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {t === 'anon' ? '비로그인 상태' : '로그인 상태'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  onChange={(patch) => updateItem(idx, patch)}
                  onMoveUp={() => moveItem(idx, -1)}
                  onMoveDown={() => moveItem(idx, +1)}
                  onRemove={() => removeItem(idx)}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addLink}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              + 링크 항목 추가
            </button>
          </section>
        </div>

        <p className="border-t border-zinc-100 bg-amber-50 px-6 py-2 text-[11px] text-amber-700">
          ⓘ 「적용」은 미리보기에만 반영됩니다. 실제 저장은 편집기를 닫은 뒤 우하단 「저장」 버튼을 눌러야 완료됩니다.
        </p>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50 px-6 py-3">
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-white"
          >
            기본값으로 초기화
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-white"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              title="미리보기에만 임시 적용됩니다. 최종 저장은 우하단 「저장」 버튼."
            >
              {saving ? '적용 중...' : '적용'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-zinc-300 bg-white"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 flex-1 rounded-md border border-zinc-300 px-3 font-mono text-xs"
      />
    </div>
  )
}

function ItemRow({
  item,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: {
  item: HeaderAuthItem
  onChange: (patch: Partial<HeaderAuthItem>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const typeLabel =
    item.type === 'link' ? '링크' : item.type === 'logout' ? '로그아웃' : '알림 종(아이콘)'
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
        >▲</button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
        >▼</button>
      </div>

      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {typeLabel}
        </span>
        {item.type !== 'bell' ? (
          <input
            type="text"
            value={(item as { label: string }).label}
            onChange={(e) => onChange({ label: e.target.value } as Partial<HeaderAuthItem>)}
            placeholder="텍스트"
            className="mt-0.5 h-8 w-full rounded-md border border-zinc-300 px-2 text-sm"
          />
        ) : (
          <span className="text-xs text-zinc-400">아이콘만 표시</span>
        )}
      </div>

      <div>
        {item.type === 'link' ? (
          <>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">링크</span>
            <input
              type="text"
              value={item.href}
              onChange={(e) => onChange({ href: e.target.value } as Partial<HeaderAuthItem>)}
              placeholder="/login"
              className="mt-0.5 h-8 w-full rounded-md border border-zinc-300 px-2 font-mono text-xs"
            />
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={item.visible}
            onChange={(e) => onChange({ visible: e.target.checked } as Partial<HeaderAuthItem>)}
            className="h-3.5 w-3.5"
          />
          노출
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-rose-500 hover:bg-rose-50"
          title="삭제"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
