'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  if (password.length < 6) {
    return { error: '비밀번호는 최소 6자 이상이어야 합니다.' }
  }

  const email = formData.get('email') as string
  const name = (formData.get('name') as string)?.trim()

  if (!name) {
    return { error: '이름을 입력해주세요.' }
  }

  const { data: signUpData, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' }
  }

  // profiles에 이름 저장
  if (signUpData.user) {
    await supabase
      .from('profiles')
      .update({ name })
      .eq('id', signUpData.user.id)
  }

  // 회원가입 후 바로 로그인
  await supabase.auth.signInWithPassword({ email, password })

  redirect('/')
}
