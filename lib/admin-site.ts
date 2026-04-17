'use server'

import { cookies } from 'next/headers'
import type { Site } from '@/app/admin/(dashboard)/settings/actions'

const COOKIE_NAME = 'admin_site_id'

export async function getAdminSiteId(sites: Site[]): Promise<string> {
  if (sites.length === 0) return ''

  const cookieStore = await cookies()
  const stored = cookieStore.get(COOKIE_NAME)?.value

  if (stored && sites.some((s) => s.id === stored)) {
    return stored
  }

  return sites[0].id
}

export async function setAdminSiteId(siteId: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, siteId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1년
    httpOnly: false,
    sameSite: 'lax',
  })
}
