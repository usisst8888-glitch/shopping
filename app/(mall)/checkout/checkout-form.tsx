'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { placeOrder } from './actions'

type Item = {
  id: string
  name: string
  price: number
  thumbnail_url: string | null
  quantity: number
}

type SiteConfig = {
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
  shippingFee: number
  freeShippingThreshold: number
  pointEarnRate: number
  pointMinBalance: number
  pointMinOrderAmount: number
}

type DeliveryMemo =
  | ''
  | '부재 시 경비실에 맡겨주세요.'
  | '부재 시 문 앞에 놓아주세요.'
  | '배송 전 연락 부탁드립니다.'
  | 'custom'

const DELIVERY_MEMO_OPTIONS: { value: DeliveryMemo; label: string }[] = [
  { value: '', label: '배송메모를 선택해 주세요.' },
  { value: '부재 시 경비실에 맡겨주세요.', label: '부재 시 경비실에 맡겨주세요.' },
  { value: '부재 시 문 앞에 놓아주세요.', label: '부재 시 문 앞에 놓아주세요.' },
  { value: '배송 전 연락 부탁드립니다.', label: '배송 전 연락 부탁드립니다.' },
  { value: 'custom', label: '직접 입력' },
]

// Daum Postcode 전역 타입은 components/address-search-button.tsx에서 선언

export function CheckoutForm({
  source,
  buyNowProductId,
  buyNowQuantity,
  cartItemIds,
  items,
  userEmail,
  userName,
  userPhone = '',
  userZipcode = '',
  userAddress = '',
  userAddressDetail = '',
  userPoints,
  site,
}: {
  source: 'cart' | 'buy_now'
  buyNowProductId?: string
  buyNowQuantity?: number
  cartItemIds?: string[]
  items: Item[]
  userEmail: string
  userName: string
  userPhone?: string
  userZipcode?: string
  userAddress?: string
  userAddressDetail?: string
  userPoints: number
  site: SiteConfig
}) {
  const router = useRouter()

  // 주문자 정보 — 프로필에서 기본값
  const [ordererName, setOrdererName] = useState(userName)
  const [ordererPhone, setOrdererPhone] = useState(userPhone)
  const [ordererEmail, setOrdererEmail] = useState(userEmail)
  const [editingOrderer, setEditingOrderer] = useState(false)

  // 배송지
  const [sameAsOrderer, setSameAsOrderer] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [addToAddressBook, setAddToAddressBook] = useState(false) // 추후 주소록 기능 대비
  void addToAddressBook

  // 배송메모
  const [memoSelect, setMemoSelect] = useState<DeliveryMemo>('')
  const [memoCustom, setMemoCustom] = useState('')

  // 개인통관고유부호
  const [customsNo, setCustomsNo] = useState('')

  // 포인트 사용
  const [pointsUsedStr, setPointsUsedStr] = useState('0')

  // 약관
  const [agreeTerms, setAgreeTerms] = useState(false)

  // 진행상태
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // "주문자 정보와 동일" 체크 시 배송지 = 주문자 + 회원 프로필 주소 자동 채우기
  function toggleSameAsOrderer(checked: boolean) {
    setSameAsOrderer(checked)
    if (checked) {
      setRecipientName(ordererName)
      setRecipientPhone(ordererPhone)
      if (userZipcode) setPostalCode(userZipcode)
      if (userAddress) setAddress1(userAddress)
      if (userAddressDetail) setAddress2(userAddressDetail)
    }
  }

  // 금액 계산
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const shippingFee =
    site.freeShippingThreshold > 0 && subtotal >= site.freeShippingThreshold ? 0 : site.shippingFee

  // 포인트 사용 검증
  const pointsUsed = Math.max(0, Math.min(
    parseInt(pointsUsedStr) || 0,
    userPoints,
    subtotal, // 포인트로 배송비는 차감 불가
  ))
  const canUsePoints =
    userPoints >= site.pointMinBalance && subtotal >= site.pointMinOrderAmount

  const totalAmount = Math.max(0, subtotal + shippingFee - pointsUsed)
  const pointsEarned = Math.floor(Math.max(0, subtotal - pointsUsed) * site.pointEarnRate / 100)

  const memoToSend = memoSelect === 'custom' ? memoCustom : memoSelect

  function openPostcode() {
    if (!window.daum?.Postcode) {
      alert('주소찾기 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setPostalCode(data.zonecode)
        setAddress1(data.roadAddress || data.jibunAddress)
      },
    }).open()
  }

  function applyMaxPoints() {
    if (!canUsePoints) return
    const max = Math.min(userPoints, subtotal)
    setPointsUsedStr(String(max))
  }

  async function handleSubmit() {
    setError(null)
    if (!ordererName.trim() || !ordererPhone.trim() || !ordererEmail.trim()) {
      setError('주문자 정보를 모두 입력해주세요.')
      return
    }
    if (!recipientName.trim() || !recipientPhone.trim() || !address1.trim()) {
      setError('배송지 정보를 모두 입력해주세요.')
      return
    }
    if (!agreeTerms) {
      setError('이용 및 정보 제공 약관에 동의해주세요.')
      return
    }

    setSubmitting(true)
    const r = await placeOrder({
      source,
      buyNowProductId,
      buyNowQuantity,
      cartItemIds,
      ordererName,
      ordererPhone,
      ordererEmail,
      recipientName,
      recipientPhone,
      postalCode,
      address1,
      address2,
      deliveryMemo: memoToSend,
      customsClearanceNo: customsNo,
      pointsUsed,
    })
    setSubmitting(false)

    if (r.error) {
      setError(r.error)
      return
    }
    if (r.orderId) {
      router.push(`/orders/${r.orderId}?success=1`)
    }
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── 좌측 폼 ── */}
        <div className="space-y-5">
          {/* 주문 상품 정보 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">주문 상품 정보</h3>
            <div className="rounded-lg border border-zinc-200">
              <div className="divide-y divide-zinc-100">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 p-3">
                    {it.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover ring-1 ring-zinc-200" />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{it.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">필수</span>
                        <span className="text-xs text-zinc-500">{it.quantity}개</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-zinc-900">{(it.price * it.quantity).toLocaleString()}원</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-center text-xs text-zinc-600">
                배송비 <span className="font-semibold text-zinc-900">{shippingFee.toLocaleString()}원</span>
                {shippingFee === 0 && site.freeShippingThreshold > 0 && ' (무료배송)'}
              </div>
            </div>
          </section>

          {/* 주문자 정보 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">주문자 정보</h3>
            <div className="mb-4 rounded-lg border-l-4 border-blue-400 bg-blue-50/50 px-4 py-2.5 text-sm text-zinc-700">
              &ldquo;무통장입금&rdquo; 으로 결제해주세요
            </div>
            {!editingOrderer ? (
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-900">{ordererName || '주문자명 미입력'}</p>
                  <p>{ordererPhone || '연락처 미입력'}</p>
                  <p>{ordererEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOrderer(true)}
                  className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  수정
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={ordererName}
                  onChange={(e) => setOrdererName(e.target.value)}
                  placeholder="이름"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={ordererPhone}
                  onChange={(e) => setOrdererPhone(e.target.value)}
                  placeholder="연락처"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  value={ordererEmail}
                  onChange={(e) => setOrdererEmail(e.target.value)}
                  placeholder="이메일"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setEditingOrderer(false)}
                  className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  완료
                </button>
              </div>
            )}
          </section>

          {/* 배송 정보 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">배송 정보</h3>

            <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={sameAsOrderer}
                onChange={(e) => toggleSameAsOrderer(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300"
              />
              주문자 정보와 동일
            </label>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="수령인"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="연락처"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="우편번호"
                className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={openPostcode}
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                주소찾기
              </button>
            </div>
            <input
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="주소"
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="상세주소"
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={addToAddressBook}
                onChange={(e) => setAddToAddressBook(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300"
              />
              배송지 목록에 추가
            </label>

            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-zinc-700">배송메모</label>
              <select
                value={memoSelect}
                onChange={(e) => setMemoSelect(e.target.value as DeliveryMemo)}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {DELIVERY_MEMO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {memoSelect === 'custom' && (
                <input
                  type="text"
                  value={memoCustom}
                  onChange={(e) => setMemoCustom(e.target.value)}
                  placeholder="배송메모 직접 입력"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              )}
            </div>
          </section>

          {/* 개인통관고유부호 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-zinc-900">개인통관고유부호</h3>
            <input
              type="text"
              value={customsNo}
              onChange={(e) => setCustomsNo(e.target.value)}
              placeholder="번호입력"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              대한민국 법에 따라 일부 해외배송 물품은 개인통관고유부호가 필요합니다. 관세청에서 발급한 개인통관고유부호를 입력해 주세요.{' '}
              <a href="https://unipass.customs.go.kr" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                발급 및 확인
              </a>
            </p>
          </section>

          {/* 포인트 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-zinc-900">포인트</h3>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={pointsUsedStr}
                onChange={(e) => setPointsUsedStr(e.target.value)}
                onBlur={() => {
                  const n = Math.max(0, Math.min(parseInt(pointsUsedStr) || 0, userPoints, subtotal))
                  setPointsUsedStr(String(n))
                }}
                disabled={!canUsePoints}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-right text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
              />
              <button
                type="button"
                onClick={applyMaxPoints}
                disabled={!canUsePoints}
                className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                전액사용
              </button>
            </div>
            <div className="mt-2 text-right text-xs text-zinc-500">
              사용 가능 포인트 <span className="font-semibold text-zinc-900">{canUsePoints ? Math.min(userPoints, subtotal).toLocaleString() : 0}</span>
              {' / '}
              보유 포인트 <span className="font-semibold text-zinc-900">{userPoints.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-center text-xs text-zinc-400">
              보유 포인트 {site.pointMinBalance.toLocaleString()} 이상 {site.pointMinOrderAmount.toLocaleString()}원 이상 구매 시 사용 가능
            </p>
          </section>
        </div>

        {/* ── 우측 요약 + 결제 ── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {/* 주문 요약 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-zinc-900">주문 요약</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">상품가격</dt>
                <dd className="text-zinc-900">{subtotal.toLocaleString()}원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">배송비</dt>
                <dd className="text-zinc-900">+ {shippingFee.toLocaleString()}원</dd>
              </div>
              {pointsUsed > 0 && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">포인트 사용</dt>
                  <dd className="text-rose-600">− {pointsUsed.toLocaleString()}원</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-zinc-100 pt-3">
                <dt className="text-base font-bold text-zinc-900">총 주문금액</dt>
                <dd className="text-xl font-bold text-zinc-900">{totalAmount.toLocaleString()}원</dd>
              </div>
            </dl>
            {pointsEarned > 0 && (
              <p className="mt-3 text-xs text-zinc-500">
                {pointsEarned.toLocaleString()} 포인트 적립예정
              </p>
            )}
          </section>

          {/* 결제수단 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-zinc-900">결제수단</h3>
            <div className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white">
              무통장입금
            </div>
            {site.bankName ? (
              <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                <p>입금 계좌</p>
                <p className="mt-1 font-mono text-sm font-medium text-zinc-900">
                  {site.bankName} {site.bankAccountNumber}
                </p>
                <p className="text-zinc-500">예금주 {site.bankAccountHolder}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">계좌 정보는 주문 완료 후 안내됩니다.</p>
            )}
          </section>

          {/* 약관 + 결제 */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-zinc-900">이용 및 정보 제공 약관</h3>
            <p className="mb-3 text-xs leading-relaxed text-zinc-600">
              결제 전 이용 및 정보 제공 약관 등의 내용을 확인했으며 이에 동의합니다.
            </p>
            <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300"
              />
              구매조건 확인 및 결제진행 동의
            </label>
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="block w-full cursor-pointer rounded-lg bg-zinc-900 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? '결제 중...' : '결제하기'}
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
