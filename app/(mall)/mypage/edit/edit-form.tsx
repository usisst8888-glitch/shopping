'use client'

import { useState, useRef, useMemo } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { updateProfile } from '../actions'

// Window.daum 전역 타입은 components/address-search-button.tsx 에서 선언

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i) // desc
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

function splitDate(iso: string): { y: string; m: string; d: string } {
  if (!iso) return { y: '', m: '', d: '' }
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { y: '', m: '', d: '' }
  return { y: m[1], m: String(parseInt(m[2])), d: String(parseInt(m[3])) }
}

export function EditProfileForm({
  initialName,
  email,
  initialGender,
  initialPhone,
  initialZipcode,
  initialAddress,
  initialAddressDetail,
  initialBirthdate,
  initialAvatarUrl,
}: {
  initialName: string
  email: string
  initialGender: 'male' | 'female' | null
  initialPhone: string
  initialZipcode: string
  initialAddress: string
  initialAddressDetail: string
  initialBirthdate: string
  initialAvatarUrl: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [name, setName] = useState(initialName)
  const [gender, setGender] = useState<'male' | 'female' | null>(initialGender)
  const [phone, setPhone] = useState(initialPhone)
  const [zipcode, setZipcode] = useState(initialZipcode)
  const [address, setAddress] = useState(initialAddress)
  const [addressDetail, setAddressDetail] = useState(initialAddressDetail)

  const initBirth = useMemo(() => splitDate(initialBirthdate), [initialBirthdate])
  const [year, setYear] = useState(initBirth.y)
  const [month, setMonth] = useState(initBirth.m)
  const [day, setDay] = useState(initBirth.d)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = useMemo(() => {
    const max = daysInMonth(parseInt(year), parseInt(month))
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [year, month])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.')
      return
    }
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.set('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setAvatarUrl(json.url)
      } else {
        alert(json.error ?? '업로드 실패')
      }
    } catch {
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function openPostcode() {
    if (!window.daum?.Postcode) {
      alert('주소찾기 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setZipcode(data.zonecode)
        setAddress(data.roadAddress || data.jibunAddress)
      },
    }).open()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 비밀번호 입력했으면 일치 확인
    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
        return
      }
    }

    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (!gender) return setError('성별을 선택해주세요.')
    if (!phone.trim()) return setError('연락처를 입력해주세요.')
    if (!address.trim()) return setError('주소를 입력해주세요.')
    if (!year || !month || !day) return setError('생년월일을 선택해주세요.')

    const birthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

    setSaving(true)
    const r = await updateProfile({
      name,
      gender,
      phone,
      zipcode,
      address,
      addressDetail,
      birthdate,
      avatarUrl,
      newPassword: password,
    })
    setSaving(false)
    if (r.error) {
      setError(r.error)
      return
    }
    setPassword('')
    setPasswordConfirm('')
    router.refresh()
    alert('정보가 저장되었습니다.')
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-5 shadow-sm md:p-8"
      >
        {/* 프로필 이미지 */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                  이미지
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="프로필 사진 변경"
            >
              {uploadingAvatar ? (
                <svg className="h-4 w-4 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* 이메일 (수정 불가) */}
        <div className="mb-3">
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500"
          />
        </div>

        {/* 비밀번호 */}
        <div className="mb-1">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 변경 하는 경우 입력하세요"
            autoComplete="new-password"
            className="w-full rounded-md border border-zinc-200 bg-blue-50/40 px-3 py-2.5 text-sm focus:border-zinc-900 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="mb-1">
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <p className="mb-5 text-[11px] text-zinc-400">
          8자리 이상의 대소문자, 숫자, 특수문자를 사용해 주세요.
        </p>

        {/* 이름 */}
        <FieldLabel required>이름</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-5 w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
        />

        {/* 성별 */}
        <FieldLabel required>성별</FieldLabel>
        <div className="mb-5 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="gender"
              checked={gender === 'male'}
              onChange={() => setGender('male')}
              className="h-4 w-4 cursor-pointer accent-zinc-900"
            />
            남자
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="gender"
              checked={gender === 'female'}
              onChange={() => setGender('female')}
              className="h-4 w-4 cursor-pointer accent-zinc-900"
            />
            여자
          </label>
        </div>

        {/* 연락처 */}
        <FieldLabel required>연락처</FieldLabel>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01012345678"
          className="mb-5 w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
        />

        {/* 주소 */}
        <FieldLabel required>주소</FieldLabel>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={zipcode}
            readOnly
            placeholder="우편번호"
            className="w-28 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600"
          />
          <button
            type="button"
            onClick={openPostcode}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            주소찾기
          </button>
        </div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="주소"
          className="mb-2 w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
        />
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="상세주소"
          className="mb-5 w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
        />

        {/* 생년월일 */}
        <FieldLabel required>생년월일</FieldLabel>
        <div className="mb-6 grid grid-cols-3 gap-2">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="cursor-pointer rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">년도</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="cursor-pointer rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">월</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="cursor-pointer rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">일</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {/* 확인 버튼 */}
        <button
          type="submit"
          disabled={saving}
          className="w-full cursor-pointer rounded-md bg-zinc-900 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '확인'}
        </button>
      </form>
    </>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-zinc-700">
      {children}
      {required && <span className="ml-1 text-blue-500">•</span>}
    </label>
  )
}
