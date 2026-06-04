export type HeaderAuthItem =
  | { id: string; type: 'link'; label: string; href: string; visible: boolean; adminOnly?: boolean }
  | { id: string; type: 'logout'; label: string; visible: boolean }
  | { id: string; type: 'bell'; label?: string; visible: boolean }

export type HeaderAuthConfig = {
  font_size: number
  color: string
  bubble_bg: string
  bubble_color: string
  bubble_text: string // {point} 변수 치환 가능
  anon_items: HeaderAuthItem[]
  logged_in_items: HeaderAuthItem[]
}

export const DEFAULT_ANON_ITEMS: HeaderAuthItem[] = [
  { id: 'login', type: 'link', label: '로그인', href: '/login', visible: true },
  { id: 'signup', type: 'link', label: '회원가입', href: '/signup', visible: true },
  { id: 'cart', type: 'link', label: '장바구니', href: '/cart', visible: true },
]

export const DEFAULT_LOGGED_IN_ITEMS: HeaderAuthItem[] = [
  { id: 'admin', type: 'link', label: '관리자', href: '/admin', visible: true, adminOnly: true },
  { id: 'mypage', type: 'link', label: '마이페이지', href: '/mypage', visible: true },
  { id: 'orders', type: 'link', label: '주문내역', href: '/mypage', visible: true },
  { id: 'cart', type: 'link', label: '장바구니', href: '/cart', visible: true },
  { id: 'logout', type: 'logout', label: '로그아웃', visible: true },
  { id: 'bell', type: 'bell', visible: true },
]

export const DEFAULT_HEADER_AUTH_CONFIG: HeaderAuthConfig = {
  font_size: 12,
  color: '#2a2a2a',
  bubble_bg: '#18181b',
  bubble_color: '#ffffff',
  bubble_text: '+{point}원',
  anon_items: DEFAULT_ANON_ITEMS,
  logged_in_items: DEFAULT_LOGGED_IN_ITEMS,
}

export function getHeaderAuthConfig(raw: unknown): HeaderAuthConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_HEADER_AUTH_CONFIG
  const c = raw as Partial<HeaderAuthConfig>
  return {
    font_size: typeof c.font_size === 'number' && c.font_size >= 8 ? c.font_size : 12,
    color: typeof c.color === 'string' ? c.color : DEFAULT_HEADER_AUTH_CONFIG.color,
    bubble_bg: typeof c.bubble_bg === 'string' ? c.bubble_bg : DEFAULT_HEADER_AUTH_CONFIG.bubble_bg,
    bubble_color: typeof c.bubble_color === 'string' ? c.bubble_color : DEFAULT_HEADER_AUTH_CONFIG.bubble_color,
    bubble_text: typeof c.bubble_text === 'string' ? c.bubble_text : DEFAULT_HEADER_AUTH_CONFIG.bubble_text,
    anon_items: Array.isArray(c.anon_items) && c.anon_items.length > 0 ? c.anon_items : DEFAULT_ANON_ITEMS,
    logged_in_items:
      Array.isArray(c.logged_in_items) && c.logged_in_items.length > 0
        ? c.logged_in_items
        : DEFAULT_LOGGED_IN_ITEMS,
  }
}

export function formatBubbleText(template: string, point: number): string {
  return template.replace(/\{point\}/g, point.toLocaleString())
}
