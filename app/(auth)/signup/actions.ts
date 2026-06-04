'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMemberSettings } from '@/lib/member-settings'
import { FIELD_ORDER, type FieldKey } from '@/app/admin/(dashboard)/members/settings/config'
import { recordLogin } from '@/lib/login-log'

function pickStr(formData: FormData, key: string): string {
  return ((formData.get(key) as string) ?? '').trim()
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const settings = await getCurrentMemberSettings()

  if (!settings.login_enabled) {
    return { error: '현재 회원가입이 비활성화되어 있습니다.' }
  }

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  if (password !== confirmPassword) return { error: '비밀번호가 일치하지 않습니다.' }
  if (password.length < 6) return { error: '비밀번호는 최소 6자 이상이어야 합니다.' }

  const email = formData.get('email') as string
  const name = pickStr(formData, 'name')
  if (!name) return { error: '이름을 입력해주세요.' }

  // 활성 + 필수인 추가 필드 검증
  for (const k of FIELD_ORDER) {
    if (k === 'name') continue
    const f = settings.signup_fields[k]
    if (f.use && f.required && !pickStr(formData, k)) {
      return { error: `${LABEL[k]}을(를) 입력해주세요.` }
    }
  }

  const { data: signUpData, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    console.error('[signup] supabase.auth.signUp failed', {
      email,
      code: error.code,
      status: error.status,
      message: error.message,
    })
    if (error.code === 'user_already_exists' || error.status === 422) {
      return { error: '이미 가입된 이메일입니다. 로그인해주세요.' }
    }
    if (error.code === 'weak_password') {
      return { error: '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.' }
    }
    return { error: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }
  if (!signUpData.user) {
    console.error('[signup] signUp returned no user', { email, signUpData })
    return { error: '회원가입 정보를 처리하지 못했습니다.' }
  }

  // 세션을 먼저 확보해야 본인 RLS 정책으로 profiles 업데이트가 가능
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !signInData.user) {
    console.error('[signup] auto signIn failed', {
      email,
      code: signInError?.code,
      status: signInError?.status,
      message: signInError?.message,
    })
    return { error: '가입은 되었지만 자동 로그인에 실패했습니다. 로그인 페이지에서 다시 시도해주세요.' }
  }

  // 추가 필드 채우기
  const update: Record<string, string | number | null> = { name }
  for (const k of FIELD_ORDER) {
    if (k === 'name') continue
    if (!settings.signup_fields[k].use) continue
    const v = pickStr(formData, k)
    update[k] = v || null
  }
  if (settings.signup_fields.address.use) {
    const zipcode = pickStr(formData, 'zipcode')
    const detail = pickStr(formData, 'address_detail')
    update.zipcode = zipcode || null
    update.address_detail = detail || null
  }

  // 가입 보너스 포인트 지급 (설정값 > 0인 경우)
  const bonus = Math.max(0, Math.floor(settings.signup_bonus_points || 0))
  if (bonus > 0) {
    update.points = bonus
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', signUpData.user.id)
  if (profileError) {
    console.error('[signup] profiles update failed', {
      email,
      userId: signUpData.user.id,
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    })
    return { error: '회원 정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }

  // 포인트 변동 이력 기록
  if (bonus > 0) {
    const { error: histError } = await supabase.from('point_history').insert({
      user_id: signUpData.user.id,
      delta: bonus,
      balance_after: bonus,
      reason: '신규 가입 보너스',
      source: 'signup_bonus',
    })
    if (histError) {
      console.error('[signup] point_history insert failed', {
        userId: signUpData.user.id,
        message: histError.message,
        details: histError.details,
      })
    }
  }

  await recordLogin(signInData.user.id)

  // 관리자 회원 목록을 즉시 갱신
  revalidatePath('/admin/members')

  redirect('/')
}

const LABEL: Record<FieldKey, string> = {
  name: '이름',
  gender: '성별',
  homepage: '홈페이지',
  phone: '연락처',
  address: '주소',
  birthdate: '생년월일',
  referrer: '추천인',
}
