// 우측 하단 고정 플로팅 메뉴 (카카오톡 상담 등)
// 상담 링크는 관리자 > 디자인 설정에서 변경 가능. 미설정 시 아래 임시 링크 사용.
const TEMP_KAKAO_LINK = 'https://pf.kakao.com/_example' // TODO: 실제 채널 링크로 교체 (관리자 설정)

export function FloatingButtons({ kakaoLink }: { kakaoLink?: string | null }) {
  const link = kakaoLink?.trim() || TEMP_KAKAO_LINK

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex flex-col items-center gap-3">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="카카오톡 상담"
        title="카카오톡 상담"
        className="block h-14 w-14 transition-transform duration-200 hover:scale-110 md:h-16 md:w-16"
      >
        <img
          src="/assets/kakao-talk.png"
          alt="카카오톡 상담"
          className="h-full w-full rounded-full object-contain drop-shadow-lg"
        />
      </a>
    </div>
  )
}
