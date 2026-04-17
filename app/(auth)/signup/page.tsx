import { SignupForm } from './signup-form'

export const metadata = { title: '회원가입' }

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900">
          회원가입
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500">
          계정을 생성하세요
        </p>
        <SignupForm />
      </div>
    </div>
  )
}
