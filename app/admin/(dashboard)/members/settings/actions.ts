'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FIELD_ORDER, type MemberSettings } from './config'

export async function updateMemberSettings(siteId: string, settings: MemberSettings) {
  const supabase = await createClient()

  for (const k of FIELD_ORDER) {
    const f = settings.signup_fields[k]
    if (f.required && !f.use) {
      f.required = false
    }
  }

  const { error } = await supabase
    .from('sites')
    .update({
      login_enabled: settings.login_enabled,
      terms_mode: settings.terms_mode,
      social_signup_require_terms: settings.social_signup_require_terms,
      terms_all_includes_optional: settings.terms_all_includes_optional,
      signup_notice: settings.signup_notice.trim() || null,
      signup_bonus_points: Math.max(0, Math.floor(settings.signup_bonus_points || 0)),
      signup_fields: settings.signup_fields,
    })
    .eq('id', siteId)

  if (error) return { error: '회원 설정 저장 중 오류가 발생했습니다.' }
  revalidatePath('/admin/members')
  revalidatePath('/admin/members/settings')
  revalidatePath('/signup')
  return { success: true }
}
