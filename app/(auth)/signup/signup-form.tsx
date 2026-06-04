'use client'

import { useMemo, useState } from 'react'
import { signup } from './actions'
import type { MemberSettings, FieldKey } from '@/app/admin/(dashboard)/members/settings/config'
import { AddressSearchButton } from '@/components/address-search-button'
import { BirthdatePicker } from '@/components/birthdate-picker'
import { Spinner } from '@/components/spinner'

const TERMS_LIST: { key: string; label: string; required: boolean }[] = [
  { key: 'service', label: '이용약관 동의', required: true },
  { key: 'privacy', label: '개인정보 수집·이용 동의', required: true },
  { key: 'marketing', label: '마케팅 정보 수신 동의', required: false },
]

export function SignupForm({ settings }: { settings: MemberSettings }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'terms' | 'form'>(
    settings.terms_mode === 'agree_step' ? 'terms' : 'form',
  )

  const [agreed, setAgreed] = useState<Record<string, boolean>>({})
  const allChecked = TERMS_LIST.every((t) => agreed[t.key])
  const requiredChecked = TERMS_LIST.filter((t) => t.required).every((t) => agreed[t.key])

  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = {}
    for (const t of TERMS_LIST) {
      next[t.key] = settings.terms_all_includes_optional ? v : t.required ? v : agreed[t.key] ?? false
    }
    setAgreed(next)
  }

  const fields = settings.signup_fields

  // 사용 켜진 필드만 렌더 순서대로 (이름은 항상 맨 위 별도)
  const activeExtraFields = useMemo<FieldKey[]>(
    () =>
      (['gender', 'phone', 'homepage', 'address', 'birthdate', 'referrer'] as FieldKey[]).filter(
        (k) => fields[k].use,
      ),
    [fields],
  )

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    // 필수 약관 검사 (inline_notice 모드도 동의 간주, agree_step만 명시 체크)
    if (settings.terms_mode === 'agree_step' && !requiredChecked) {
      setError('필수 약관에 동의해 주세요.')
      setLoading(false)
      return
    }

    // 필수 입력 검사
    for (const k of activeExtraFields) {
      if (fields[k].required && !(formData.get(k) as string)?.trim()) {
        setError(`${LABEL[k]}은(는) 필수 입력 항목입니다.`)
        setLoading(false)
        return
      }
    }

    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  // 약관 동의 단계
  if (step === 'terms') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-zinc-200 p-4">
          <label className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 pb-3">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => toggleAll(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-zinc-900">전체 약관에 동의합니다.</span>
          </label>
          <div className="mt-3 space-y-2">
            {TERMS_LIST.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!agreed[t.key]}
                  onChange={(e) => setAgreed((p) => ({ ...p, [t.key]: e.target.checked }))}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700">
                  {t.label}
                  <span className={`ml-1 text-xs ${t.required ? 'text-rose-500' : 'text-zinc-400'}`}>
                    ({t.required ? '필수' : '선택'})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <button
          type="button"
          onClick={() => {
            if (!requiredChecked) {
              setError('필수 약관에 동의해 주세요.')
              return
            }
            setError(null)
            setStep('form')
          }}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          다음
        </button>
        <p className="text-center text-sm text-zinc-500">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="font-medium text-zinc-900 hover:underline">로그인</a>
        </p>
      </div>
    )
  }

  return (
    <form
      action={handleSubmit}
      aria-busy={loading}
      className={`space-y-4 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 이름 (항상 표시) */}
      <TextField id="name" label="이름" required={fields.name.required} placeholder="이름을 입력하세요" />

      {/* 이메일 / 비밀번호 (계정 기본) */}
      <TextField id="email" label="이메일" type="email" required />
      <TextField id="password" label="비밀번호" type="password" required minLength={6} />
      <TextField id="confirmPassword" label="비밀번호 확인" type="password" required minLength={6} />

      {/* 동적 항목 */}
      {activeExtraFields.map((k) => renderField(k, fields[k].required))}

      {/* inline_notice 모드: 입력 하단 약관 문구 */}
      {settings.terms_mode === 'inline_notice' && (
        <p className="text-center text-xs leading-relaxed text-zinc-500">
          회원가입을 진행하면 <a href="/terms" className="underline">이용약관</a> 및{' '}
          <a href="/privacy" className="underline">개인정보 처리방침</a>에 동의하는 것으로 간주됩니다.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-80"
      >
        {loading && <Spinner />}
        {loading ? '가입 중...' : '회원가입'}
      </button>
      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="font-medium text-zinc-900 hover:underline">로그인</a>
      </p>
    </form>
  )
}

const LABEL: Record<FieldKey, string> = {
  name: '이름',
  gender: '성별',
  homepage: '홈페이지',
  phone: '연락처',
  address: '주소',
  birthdate: '생년월일',
  referrer: '추천인',
}

function renderField(key: FieldKey, required: boolean) {
  if (key === 'gender') {
    return <GenderField key={key} required={required} />
  }
  if (key === 'address') {
    return <AddressFields key={key} required={required} />
  }
  if (key === 'birthdate') {
    return (
      <div key={key}>
        <Label htmlFor="birthdate" required={required}>생년월일</Label>
        <BirthdatePicker name="birthdate" required={required} />
      </div>
    )
  }
  if (key === 'phone') {
    return <TextField key={key} id="phone" label="연락처" type="tel" required={required} placeholder="010-0000-0000" />
  }
  if (key === 'homepage') {
    return <TextField key={key} id="homepage" label="홈페이지" type="url" required={required} placeholder="https://" />
  }
  if (key === 'referrer') {
    return <TextField key={key} id="referrer" label="추천인" required={required} placeholder="추천인 아이디/이름" />
  }
  return null
}

function TextField({
  id,
  label,
  type = 'text',
  required = false,
  placeholder,
  minLength,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  placeholder?: string
  minLength?: number
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
    </div>
  )
}

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string
  required: boolean
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-zinc-700">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  )
}

function GenderField({ required }: { required: boolean }) {
  const [value, setValue] = useState<'male' | 'female' | ''>('')

  const baseBtn =
    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition'

  return (
    <div>
      <Label htmlFor="gender" required={required}>성별</Label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setValue('male')}
          className={`${baseBtn} ${
            value === 'male'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="10" cy="14" r="5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l5-5m0 0h-4m4 0v4" />
          </svg>
          남자
        </button>
        <button
          type="button"
          onClick={() => setValue('female')}
          className={`${baseBtn} ${
            value === 'female'
              ? 'border-rose-500 bg-rose-50 text-rose-600'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="9" r="5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m-3-3h6" />
          </svg>
          여자
        </button>
      </div>
      <input type="hidden" name="gender" value={value} />
    </div>
  )
}

function AddressFields({ required }: { required: boolean }) {
  const [zipcode, setZipcode] = useState('')
  const [address, setAddress] = useState('')
  const [detail, setDetail] = useState('')

  return (
    <div>
      <Label htmlFor="address" required={required}>주소</Label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            id="zipcode"
            name="zipcode"
            type="text"
            readOnly
            required={required}
            value={zipcode}
            placeholder="우편번호"
            className="w-32 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <AddressSearchButton
            onSelect={({ zipcode: z, address: a }) => {
              setZipcode(z)
              setAddress(a)
            }}
          />
        </div>
        <input
          id="address"
          name="address"
          type="text"
          readOnly
          required={required}
          value={address}
          placeholder="주소 검색 결과"
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />
        <input
          id="address_detail"
          name="address_detail"
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="상세주소 (선택)"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>
    </div>
  )
}
