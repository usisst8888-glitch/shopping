// 알림 타입/메타 — 클라이언트/서버 모두에서 import 가능 (서버 전용 모듈 import 금지)

export type NotificationType =
  | 'order_paid'
  | 'order_preparing'
  | 'order_shipping'
  | 'order_delivered'
  | 'order_cancelled'
  | 'inquiry_reply'
  | 'points_earned'
  | 'points_admin'
  | 'announcement'

export const NOTIFICATION_TYPE_META: Record<NotificationType, { icon: string; tone: string }> = {
  order_paid: { icon: '💳', tone: 'text-blue-600' },
  order_preparing: { icon: '📦', tone: 'text-indigo-600' },
  order_shipping: { icon: '🚚', tone: 'text-violet-600' },
  order_delivered: { icon: '✅', tone: 'text-emerald-600' },
  order_cancelled: { icon: '❌', tone: 'text-zinc-500' },
  inquiry_reply: { icon: '💬', tone: 'text-blue-600' },
  points_earned: { icon: '⭐', tone: 'text-emerald-600' },
  points_admin: { icon: '🎁', tone: 'text-emerald-600' },
  announcement: { icon: '📢', tone: 'text-amber-600' },
}
