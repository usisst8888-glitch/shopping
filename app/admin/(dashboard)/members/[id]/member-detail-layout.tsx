'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  adjustMemberPoints,
  updateMemberMemo,
  updateMemberProfile,
  type Member,
  type MemberLoginInfo,
  type PointHistoryEntry,
} from '../actions'
import { assignMemberGroup, type MemberGroup } from '../groups/actions'
import { addBlockedIp } from '@/app/admin/(dashboard)/settings/actions'
import { formatRelativeTime } from '@/lib/relative-time'
import { BirthdatePicker } from '@/components/birthdate-picker'
import { AddressSearchButton } from '@/components/address-search-button'

const SOURCE_LABEL: Record<string, string> = {
  order_use: '주문 사용',
  order_earn: '구매 적립',
  order_cancel_restore: '취소 복원',
  admin_grant: '관리자 지급',
  admin_revoke: '관리자 회수',
}

export function MemberDetailLayout({
  member,
  history,
  loginInfo,
  groups,
}: {
  member: Member
  history: PointHistoryEntry[]
  loginInfo: MemberLoginInfo
  groups: MemberGroup[]
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <MemberInfoCard member={member} groups={groups} />
        <MemoCard member={member} />
      </div>
      <div className="space-y-5">
        <ActivityCard member={member} loginInfo={loginInfo} />
        <PointsCard member={member} history={history} />
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-[15px] font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Row({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-5 py-3">
      <div className="text-right text-sm text-zinc-500 whitespace-nowrap">
        {label}
        {required && <span className="ml-1 text-[11px] text-rose-500 font-normal">(필수)</span>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const ROW_HEIGHT = 'h-10'

const LINE_INPUT =
  `block w-full ${ROW_HEIGHT} border-0 border-b border-zinc-300 bg-transparent px-0 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-0`

function MemberInfoCard({ member, groups }: { member: Member; groups: MemberGroup[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState<null | string>(null)
  const [name, setName] = useState(member.name ?? '')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(member.gender ?? '')
  const [phone, setPhone] = useState(member.phone ?? '')
  const [zipcode, setZipcode] = useState(member.zipcode ?? '')
  const [address, setAddress] = useState(member.address ?? '')
  const [addressDetail, setAddressDetail] = useState(member.address_detail ?? '')
  const [referrer, setReferrer] = useState(member.referrer ?? '')

  const dirty =
    name !== (member.name ?? '') ||
    gender !== (member.gender ?? '') ||
    phone !== (member.phone ?? '') ||
    zipcode !== (member.zipcode ?? '') ||
    address !== (member.address ?? '') ||
    addressDetail !== (member.address_detail ?? '') ||
    referrer !== (member.referrer ?? '')

  async function save() {
    setSaving('field')
    const r = await updateMemberProfile(member.id, {
      name,
      gender: gender || null,
      phone,
      zipcode,
      address,
      address_detail: addressDetail,
      referrer,
    })
    setSaving(null)
    if (r.error) {
      alert(r.error)
      return
    }
    router.refresh()
  }

  async function saveBirthdate(value: string) {
    setSaving('birthdate')
    await updateMemberProfile(member.id, { birthdate: value || null })
    setSaving(null)
    router.refresh()
  }

  return (
    <Card title="회원 정보">
      {/* 아바타 + 이름 */}
      <div className="mb-4 flex flex-col items-center pb-2">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 ring-1 ring-zinc-200">
          <svg className="h-10 w-10 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5Z" />
          </svg>
          <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 ring-1 ring-zinc-200">
            <svg className="h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3l2-2h8l2 2h3v12H3V7Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-900">{member.name || '-'}</p>
      </div>

      <div className="divide-y divide-zinc-100">
        <Row label="회원 유형">
          <span className="text-sm text-zinc-900">{member.role === 'admin' ? '관리자' : '일반회원'}</span>
        </Row>
        <Row label="그룹">
          <GroupSelect
            memberId={member.id}
            currentGroupId={member.group_id}
            groups={groups}
            onChanged={() => router.refresh()}
          />
        </Row>
        <Row label="계정" required>
          <p className="text-sm text-zinc-900">{member.email}</p>
        </Row>
        <Row label="비밀번호">
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 h-9 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={() => alert('비밀번호 변경 메일이 전송됩니다. (추후 연결)')}
          >
            비밀번호 변경
          </button>
        </Row>
        <Row label="이름" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={LINE_INPUT}
          />
        </Row>
        <Row label="성별" required>
          <div className="flex h-10 items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              남자
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              여자
            </label>
          </div>
        </Row>
        <Row label="연락처" required>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className={LINE_INPUT}
          />
        </Row>
        <Row label="주소">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={zipcode}
                placeholder="우편번호"
                className="block h-10 w-28 border-0 border-b border-zinc-300 bg-transparent px-0 text-sm text-zinc-900 focus:outline-none"
              />
              <AddressSearchButton
                onSelect={({ zipcode: z, address: a }) => {
                  setZipcode(z)
                  setAddress(a)
                }}
              />
            </div>
            <input
              type="text"
              readOnly
              value={address}
              placeholder="기본주소"
              className={LINE_INPUT}
            />
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="상세주소"
              className={LINE_INPUT}
            />
          </div>
        </Row>
        <Row label="생년월일" required>
          <BirthdateInline
            defaultValue={member.birthdate ?? undefined}
            onChange={(v) => saveBirthdate(v)}
            loading={saving === 'birthdate'}
          />
        </Row>
        <Row label="추천인">
          <input
            type="text"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
            placeholder="-"
            className={LINE_INPUT}
          />
        </Row>
      </div>

      {dirty && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving === 'field'}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving === 'field' ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      )}
    </Card>
  )
}

function BirthdateInline({
  defaultValue,
  onChange,
  loading,
}: {
  defaultValue?: string
  onChange: (v: string) => void
  loading: boolean
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  return (
    <div className={loading ? 'pointer-events-none opacity-60' : ''}>
      <BirthdatePicker
        name="birthdate-inline"
        defaultValue={value}
        onValueChange={(v) => {
          setValue(v)
          if (v.length === 10) onChange(v)
        }}
      />
    </div>
  )
}

function formatKst(iso: string): string {
  // 서버/클라이언트 어디서나 동일한 결과를 보장하기 위해
  // toLocaleString 대신 UTC + 9h(KST)로 직접 포매팅
  const d = new Date(iso)
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`
}

function LastLoginIp({ ip, memberLabel }: { ip: string; memberLabel: string }) {
  const [blocking, setBlocking] = useState(false)
  const [blocked, setBlocked] = useState(false)

  async function handleBlock() {
    if (blocked || blocking) return
    if (!confirm(`「${memberLabel}」 의 IP 「${ip}」 를 차단하시겠습니까?\n차단된 IP는 사이트에 접속할 수 없습니다.`)) return
    setBlocking(true)
    const r = await addBlockedIp(ip, `회원상세 차단: ${memberLabel}`)
    setBlocking(false)
    if (r.error) {
      // 이미 차단된 경우 메시지 그대로 노출하되 UI도 차단 상태로 전환
      if (r.error.includes('이미 차단')) {
        setBlocked(true)
      } else {
        alert(r.error)
        return
      }
    }
    setBlocked(true)
  }

  return (
    <div className="flex items-center gap-2">
      <p className="font-mono text-sm text-zinc-900">{ip}</p>
      {blocked ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          차단됨
        </span>
      ) : (
        <button
          type="button"
          onClick={handleBlock}
          disabled={blocking}
          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-60"
          title="이 IP의 사이트 접속을 차단합니다"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
          {blocking ? '차단 중...' : '차단'}
        </button>
      )}
    </div>
  )
}

function GroupSelect({
  memberId,
  currentGroupId,
  groups,
  onChanged,
}: {
  memberId: string
  currentGroupId: string | null
  groups: MemberGroup[]
  onChanged: () => void
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <select
        value={currentGroupId ?? ''}
        disabled={saving}
        onChange={async (e) => {
          const next = e.target.value || null
          setSaving(true)
          const r = await assignMemberGroup(memberId, next)
          setSaving(false)
          if (r.error) {
            alert(r.error)
            return
          }
          onChanged()
        }}
        className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:border-zinc-900 focus:outline-none"
      >
        <option value="">그룹 없음</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-zinc-400">저장 중…</span>}
    </div>
  )
}

function ActivityCard({ member, loginInfo }: { member: Member; loginInfo: MemberLoginInfo }) {
  const joined = formatKst(member.created_at)

  return (
    <Card title="활동 정보">
      <div className="divide-y divide-zinc-100">
        <Row label="가입일">
          <p className="text-sm text-zinc-900">{joined}</p>
        </Row>
        <Row label="로그인">
          {loginInfo.last_login_at ? (
            <p className="text-sm text-zinc-900">
              {formatRelativeTime(loginInfo.last_login_at)}
              {loginInfo.login_count > 0 && (
                <span className="ml-1 text-zinc-500">({loginInfo.login_count.toLocaleString()}회)</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-zinc-400">기록 없음</p>
          )}
        </Row>
        <Row label="최종 로그인 IP">
          {loginInfo.last_login_ip ? (
            <LastLoginIp ip={loginInfo.last_login_ip} memberLabel={member.name || member.email} />
          ) : (
            <p className="text-sm text-zinc-400">기록 없음</p>
          )}
        </Row>
        <div className="grid grid-cols-[120px_1fr] items-start gap-5 py-3">
          <div className="pt-1 text-right text-sm text-zinc-500">작성</div>
          <div className="min-w-0 space-y-2">
            <ActivityLine label="게시물" count={member.post_count} />
            <ActivityLine label="댓글" count={0} />
            <ActivityLine label="구매평" count={0} />
            <ActivityLine label="문의" count={0} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function ActivityLine({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className={`font-mono font-semibold ${count > 0 ? 'text-blue-600' : 'text-zinc-300'}`}>
        {count}
      </span>
    </div>
  )
}

function PointsCard({ member, history }: { member: Member; history: PointHistoryEntry[] }) {
  const router = useRouter()
  const [direction, setDirection] = useState<'grant' | 'revoke'>('grant')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const n = parseInt(amount) || 0
    if (n <= 0) {
      setError('1 이상의 금액을 입력해주세요.')
      return
    }
    if (!reason.trim()) {
      setError('사유를 입력해주세요.')
      return
    }
    setSubmitting(true)
    const r = await adjustMemberPoints(
      member.id,
      direction === 'grant' ? n : -n,
      reason,
    )
    setSubmitting(false)
    if (r.error) {
      setError(r.error)
      return
    }
    setAmount('')
    setReason('')
    router.refresh()
  }

  return (
    <Card title="적립금">
      <div className="mb-5 rounded-lg bg-zinc-50/70 px-4 py-3">
        <p className="text-xs text-zinc-500">보유 적립금</p>
        <p className="mt-1 font-mono text-xl font-semibold text-zinc-900">
          {member.points.toLocaleString()}
          <span className="ml-1 text-sm font-normal text-zinc-500">포인트 (KRW)</span>
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">적립금 지급/차감</p>
        <div className="flex items-center gap-2">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'grant' | 'revoke')}
            className="h-10 w-20 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="grant">지급</option>
            <option value="revoke">차감</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액"
            className="h-10 w-24 rounded-md border border-zinc-300 px-3 text-right font-mono text-sm focus:border-zinc-900 focus:outline-none"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유 / 내용 입력"
            className="h-10 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="h-10 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            확인
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-zinc-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
              <th className="px-3 py-2 text-left font-medium">일자</th>
              <th className="px-3 py-2 text-left font-medium">사유</th>
              <th className="px-3 py-2 text-left font-medium">관련주문</th>
              <th className="px-3 py-2 text-right font-medium">증감</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-400">
                  적립 내역이 없습니다.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600">
                    {new Date(h.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {SOURCE_LABEL[h.source] ?? h.source}
                    {h.reason ? <span className="text-zinc-400"> · {h.reason}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {h.order_id ? <span className="font-mono">{h.order_id.slice(0, 8)}</span> : '-'}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${h.delta > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {h.delta > 0 ? '+' : ''}{h.delta.toLocaleString()}원
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-400">최근 적립 내역만 출력됩니다.</p>
    </Card>
  )
}

function MemoCard({ member }: { member: Member }) {
  const router = useRouter()
  const [value, setValue] = useState(member.memo ?? '')
  const [saving, setSaving] = useState(false)
  const MAX = 500

  async function save() {
    setSaving(true)
    const r = await updateMemberMemo(member.id, value)
    setSaving(false)
    if (r.error) {
      alert(r.error)
      return
    }
    router.refresh()
  }

  return (
    <Card title="관리자 메모">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX))}
        placeholder="내용입력(최대 500자)"
        rows={4}
        className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      <div className="mt-1.5 text-right text-xs text-zinc-400">
        {value.length}/{MAX}
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-5 h-10 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </Card>
  )
}
