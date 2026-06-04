'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FIELD_META,
  FIELD_ORDER,
  type FieldKey,
  type MemberSettings,
  type TermsMode,
} from './config'
import { updateMemberSettings } from './actions'

const TERMS_OPTIONS: { value: TermsMode; label: string; sub?: string }[] = [
  { value: 'agree_step', label: '가입시 약관 동의 단계 거치기 (권장)' },
  { value: 'inline_notice', label: '약관 동의 단계 대신 회원정보 입력 하단에 약관동의 문구 표시' },
  { value: 'disabled', label: '약관 동의를 사용하지 않음' },
]

export function MemberSettingsForm({
  siteId,
  initial,
}: {
  siteId: string
  initial: MemberSettings
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [loginEnabled, setLoginEnabled] = useState(initial.login_enabled)
  const [termsMode, setTermsMode] = useState<TermsMode>(initial.terms_mode)
  const [socialTerms, setSocialTerms] = useState(initial.social_signup_require_terms)
  const [allIncludesOptional, setAllIncludesOptional] = useState(initial.terms_all_includes_optional)
  const [signupNotice, setSignupNotice] = useState(initial.signup_notice)
  const [signupBonus, setSignupBonus] = useState(String(initial.signup_bonus_points ?? 0))
  const [fields, setFields] = useState(initial.signup_fields)

  function updateField(key: FieldKey, patch: Partial<{ use: boolean; required: boolean }>) {
    setFields((prev) => {
      const next = { ...prev[key], ...patch }
      // 사용 끄면 필수도 자동 해제
      if (next.use === false) next.required = false
      return { ...prev, [key]: next }
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateMemberSettings(siteId, {
      login_enabled: loginEnabled,
      terms_mode: termsMode,
      social_signup_require_terms: socialTerms,
      terms_all_includes_optional: allIncludesOptional,
      signup_notice: signupNotice,
      signup_bonus_points: Math.max(0, parseInt(signupBonus) || 0),
      signup_fields: fields,
    })
    setSaving(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '저장되었습니다.' })
      setTimeout(() => setMessage(null), 2500)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* 가입 설정 카드 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">가입 설정</h3>
        </div>

        <div className="divide-y divide-zinc-100">
          {/* 가입설정 */}
          <Row label="가입설정">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={loginEnabled}
                onChange={(e) => setLoginEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">
                <span className="font-medium text-zinc-900">로그인/가입 사용</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                  로그인 및 회원 가입 버튼을 표시합니다.<br />
                  이를 해제하더라도 기존에 가입된 회원은 특정한 경로(예: 회원 권한이 필요한 메뉴에서 로그인)로 로그인이 가능합니다.
                </span>
              </span>
            </label>
          </Row>

          {/* 약관동의 */}
          <Row label="약관동의">
            <div className="space-y-2">
              {TERMS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="terms_mode"
                    value={opt.value}
                    checked={termsMode === opt.value}
                    onChange={() => setTermsMode(opt.value)}
                    className="h-4 w-4 cursor-pointer border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </Row>

          {/* 기타 약관동의 */}
          <Row label="기타 약관동의">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={socialTerms}
                  onChange={(e) => setSocialTerms(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-800">소셜 로그인시에도 신규 회원인 경우 약관 동의 받기</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={allIncludesOptional}
                  onChange={(e) => setAllIncludesOptional(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-800">전체 약관 동의 클릭 시 선택 항목까지 동의 체크하기</span>
              </label>
            </div>
          </Row>

          {/* 가입 보너스 포인트 */}
          <Row label="가입 보너스">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={signupBonus}
                onChange={(e) => setSignupBonus(e.target.value)}
                onBlur={() => setSignupBonus(String(Math.max(0, parseInt(signupBonus) || 0)))}
                placeholder="0"
                className="h-10 w-32 rounded-lg border border-zinc-300 px-3 text-right font-mono text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <span className="text-sm text-zinc-500">포인트</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              회원가입 직후 자동으로 지급됩니다. 0이면 지급하지 않습니다.
            </p>
          </Row>

          {/* 가입안내 */}
          <Row label="가입안내">
            <div>
              <textarea
                value={signupNotice}
                onChange={(e) => setSignupNotice(e.target.value)}
                placeholder="예: 아래 항목을 빠짐없이 입력해 주세요."
                rows={3}
                className="w-full resize-none rounded-lg border-0 border-b border-zinc-300 bg-transparent px-0 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-0"
              />
              <p className="mt-2 text-xs text-zinc-500">
                회원가입시 정보입력 단계 상단에 표시될 내용입니다. (여러줄 입력 가능)
              </p>
            </div>
          </Row>
        </div>
      </div>

      {/* 가입 폼 관리 카드 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">가입 폼 관리</h3>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              className="h-4 w-4 rounded border-zinc-300 text-blue-600"
            />
            <span className="text-sm font-medium text-zinc-900">일반회원</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-2.5 text-left">항목</th>
                  <th className="w-24 px-4 py-2.5 text-center">사용</th>
                  <th className="w-24 px-4 py-2.5 text-center">필수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {FIELD_ORDER.map((key) => {
                  const f = fields[key]
                  // 이름은 항상 사용/필수 고정
                  const locked = key === 'name'
                  return (
                    <tr key={key} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 text-zinc-800">{FIELD_META[key].label}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={f.use}
                          disabled={locked}
                          onChange={(e) => updateField(key, { use: e.target.checked })}
                          className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={f.required}
                          disabled={locked || !f.use}
                          onChange={(e) => updateField(key, { required: e.target.checked })}
                          className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            사용 해제된 항목은 가입 폼과 회원 목록에서 함께 숨겨집니다. 「이름」은 기본 필수 항목입니다.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-6 px-6 py-5">
      <div className="pt-0.5 text-sm font-medium text-zinc-500">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
