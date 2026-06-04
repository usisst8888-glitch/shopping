export const metadata = { title: '접속 차단' }

export default function BlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md rounded-2xl bg-white p-10 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303-3.75c.512 1.61.794 3.33.794 5.114 0 5.66-2.78 10.273-6.997 11.114a8.286 8.286 0 01-3.6-.001C7.28 23.273 4.5 18.66 4.5 13c0-1.784.282-3.504.794-5.114m17.018 0a47.997 47.997 0 00-9.797-1.886A47.997 47.997 0 002.682 7.886m17.018 0a48.184 48.184 0 00-1.123-.08m-15.895 0c.376.027.75.054 1.123.08m0 0a48.97 48.97 0 015.916 0M12 16h.008v.008H12V16z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-900">접속이 차단되었습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          현재 사용 중인 IP에서 이 사이트에 접속할 수 없습니다.<br />
          문의가 필요한 경우 관리자에게 연락해 주세요.
        </p>
      </div>
    </div>
  )
}
