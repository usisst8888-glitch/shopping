import { WithdrawForm } from './withdraw-form'

export const metadata = { title: '회원탈퇴' }

export default function WithdrawPage() {
  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-zinc-900">회원탈퇴</h2>
      <div className="rounded-xl bg-white p-5 shadow-sm md:p-6">
        <h3 className="text-sm font-semibold text-zinc-900">탈퇴 전 꼭 확인해주세요</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
          <li>· 보유한 <strong className="text-zinc-900">포인트는 모두 소멸</strong> 됩니다.</li>
          <li>· 찜한 상품, 장바구니가 모두 삭제됩니다.</li>
          <li>· 진행 중인 주문이 있다면 탈퇴 후에도 관리자 페이지에서 처리됩니다.</li>
          <li>· 동일한 이메일로 재가입은 가능하지만, 기존 정보는 복구되지 않습니다.</li>
        </ul>

        <WithdrawForm />
      </div>
    </section>
  )
}
