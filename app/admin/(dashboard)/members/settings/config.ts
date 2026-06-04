import type { Site } from '@/app/admin/(dashboard)/settings/actions'

export type TermsMode = 'agree_step' | 'inline_notice' | 'disabled'

export type FieldKey =
  | 'name'
  | 'gender'
  | 'homepage'
  | 'phone'
  | 'address'
  | 'birthdate'
  | 'referrer'

export type FieldSetting = { use: boolean; required: boolean }

export type SignupFields = Record<FieldKey, FieldSetting>

export type MemberSettings = {
  login_enabled: boolean
  terms_mode: TermsMode
  social_signup_require_terms: boolean
  terms_all_includes_optional: boolean
  signup_notice: string
  signup_bonus_points: number
  signup_fields: SignupFields
}

export const FIELD_META: Record<FieldKey, { label: string }> = {
  name: { label: '이름' },
  gender: { label: '성별' },
  homepage: { label: '홈페이지' },
  phone: { label: '연락처' },
  address: { label: '주소' },
  birthdate: { label: '생년월일' },
  referrer: { label: '추천인' },
}

export const FIELD_ORDER: FieldKey[] = [
  'name',
  'gender',
  'homepage',
  'phone',
  'address',
  'birthdate',
  'referrer',
]

export const DEFAULT_FIELDS: SignupFields = {
  name: { use: true, required: true },
  gender: { use: true, required: true },
  homepage: { use: false, required: false },
  phone: { use: true, required: true },
  address: { use: true, required: true },
  birthdate: { use: true, required: true },
  referrer: { use: true, required: false },
}

export function getMemberSettings(site: Site): MemberSettings {
  const raw = (site as unknown as { signup_fields?: Partial<SignupFields> }).signup_fields ?? {}
  const fields = { ...DEFAULT_FIELDS } as SignupFields
  for (const k of FIELD_ORDER) {
    const v = raw[k]
    if (v) fields[k] = { use: Boolean(v.use), required: Boolean(v.required) }
  }
  const s = site as unknown as Partial<MemberSettings>
  return {
    login_enabled: s.login_enabled ?? true,
    terms_mode: (s.terms_mode as TermsMode) ?? 'agree_step',
    social_signup_require_terms: s.social_signup_require_terms ?? true,
    terms_all_includes_optional: s.terms_all_includes_optional ?? true,
    signup_notice: s.signup_notice ?? '',
    signup_bonus_points: s.signup_bonus_points ?? 0,
    signup_fields: fields,
  }
}
