import { redirect } from 'next/navigation'
import { getCurrentMemberSettings } from '@/lib/member-settings'
import { SignupForm } from './signup-form'

export const metadata = { title: '회원가입' }

export default async function SignupPage() {
  const settings = await getCurrentMemberSettings()

  if (!settings.login_enabled) {
    redirect('/')
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900">
          회원가입
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          계정을 생성하세요
        </p>
        {settings.signup_notice && (
          <div className="mb-6 whitespace-pre-line rounded-lg bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">
            {settings.signup_notice}
          </div>
        )}
        <SignupForm settings={settings} />
      </div>
    </div>
  )
}
