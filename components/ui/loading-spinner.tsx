export function LoadingSpinner({ message = '로딩 중...' }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 animate-bounce rounded-full bg-red-500 [animation-delay:-0.3s]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
        <span className="h-3 w-3 animate-bounce rounded-full bg-sky-500" />
      </div>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}
