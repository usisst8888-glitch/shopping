import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  FIELD_ORDER,
  type FieldKey,
  type MemberSettings,
  type SignupFields,
  type TermsMode,
} from '@/app/admin/(dashboard)/members/settings/config'

const DEFAULT_FIELDS: SignupFields = {
  name: { use: true, required: true },
  gender: { use: true, required: true },
  homepage: { use: false, required: false },
  phone: { use: true, required: true },
  address: { use: true, required: true },
  birthdate: { use: true, required: true },
  referrer: { use: true, required: false },
}

const FALLBACK: MemberSettings = {
  login_enabled: true,
  terms_mode: 'agree_step',
  social_signup_require_terms: true,
  terms_all_includes_optional: true,
  signup_notice: '',
  signup_bonus_points: 0,
  signup_fields: DEFAULT_FIELDS,
}

type RawRow = {
  login_enabled?: boolean | null
  terms_mode?: string | null
  social_signup_require_terms?: boolean | null
  terms_all_includes_optional?: boolean | null
  signup_notice?: string | null
  signup_bonus_points?: number | null
  signup_fields?: Partial<SignupFields> | null
}

function fromRow(row: RawRow | null): MemberSettings {
  if (!row) return FALLBACK
  const fields = { ...DEFAULT_FIELDS } as SignupFields
  const raw = row.signup_fields ?? {}
  for (const k of FIELD_ORDER) {
    const v = raw[k as FieldKey]
    if (v) fields[k] = { use: Boolean(v.use), required: Boolean(v.required) }
  }
  return {
    login_enabled: row.login_enabled ?? true,
    terms_mode: ((row.terms_mode as TermsMode) ?? 'agree_step'),
    social_signup_require_terms: row.social_signup_require_terms ?? true,
    terms_all_includes_optional: row.terms_all_includes_optional ?? true,
    signup_notice: row.signup_notice ?? '',
    signup_bonus_points: row.signup_bonus_points ?? 0,
    signup_fields: fields,
  }
}

export const getCurrentMemberSettings = cache(async (): Promise<MemberSettings> => {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'

  const supabase = await createClient()
  const { data } = await supabase
    .from('sites')
    .select('login_enabled, terms_mode, social_signup_require_terms, terms_all_includes_optional, signup_notice, signup_bonus_points, signup_fields')
    .eq('domain', host)
    .single()

  if (data) return fromRow(data as RawRow)

  const { data: fallback } = await supabase
    .from('sites')
    .select('login_enabled, terms_mode, social_signup_require_terms, terms_all_includes_optional, signup_notice, signup_bonus_points, signup_fields')
    .limit(1)
    .single()

  return fromRow((fallback as RawRow) ?? null)
})
