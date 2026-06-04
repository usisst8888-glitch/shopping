// 서버 전용 — 'use server' 액션 파일 또는 server component 안에서만 import 할 것
import { createClient } from '@/lib/supabase/server'
import type { NotificationType } from './notifications'

/**
 * 알림 생성 — 서버 액션 내부에서만 호출.
 * RLS 정책에 의해 자기 사용자 또는 관리자 컨텍스트에서만 insert 가능.
 */
export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  href?: string
}): Promise<void> {
  const supabase = await createClient()
  await supabase.from('notifications').insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  })
}
