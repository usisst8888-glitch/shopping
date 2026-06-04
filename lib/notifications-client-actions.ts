'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { NotificationType } from '@/lib/notifications'

export type NotificationRow = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export async function getMyNotifications(limit = 30): Promise<{ list: NotificationRow[]; unread: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { list: [], unread: 0 }
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, href, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  const list = (data ?? []) as NotificationRow[]
  const unread = list.filter((n) => !n.read_at).length
  return { list, unread }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  revalidatePath('/')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  revalidatePath('/')
  return { success: true }
}

export async function deleteNotification(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/')
  return { success: true }
}
