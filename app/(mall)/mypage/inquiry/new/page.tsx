import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewInquiryForm } from './new-inquiry-form'

export const metadata = { title: '문의 작성' }

export default async function NewInquiryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 최근 주문 (관련 주문 선택용)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_no, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">문의 작성</h2>
        <Link href="/mypage/inquiry" className="text-sm text-zinc-500 hover:text-zinc-900">
          목록으로
        </Link>
      </div>
      <NewInquiryForm orders={orders ?? []} />
    </section>
  )
}
