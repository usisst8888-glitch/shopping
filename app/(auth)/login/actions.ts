'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { recordLogin } from '@/lib/login-log'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  if (data.user) {
    await recordLogin(data.user.id)
  }

  redirect('/')
}
