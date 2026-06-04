'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBoard, updateBoard, deleteBoard } from './actions'
import type { Board } from './actions'

const DEFAULT_DESIGN = {
  // 구성 요소
  show_board_name: true,
  show_total_count: false,
  show_profile_image: false,
  show_search: false,
  image_lightbox: true,
  // 리스트 항목
  show_author_name: true,
  show_created_time: true,
  show_content_preview: true,
  show_category: true,
  show_view_count: true,
  show_comment_count: false,
  show_like_count: false,
  show_share: false,
  show_print: false,
  // 리스트
  image_ratio: '4:3',
  cols_desktop: 4,
  gap_px: 30,
  visible_rows: 12,
  cols_mobile: 2,
  keep_cols_on_expand: true,
  // 텍스트
  title_font_size: 14,
  content_font_size: 12,
  padding_px: 20,
  content_preview_lines: 1,
  text_align: 'left',
  title_color: '#18181b',
  content_color: '#71717a',
  // 배경/테두리
  border_radius: 0,
  border_width: 1,
}
type DesignState = typeof DEFAULT_DESIGN

function designFromBoard(board: Board | null): DesignState {
  if (!board) return { ...DEFAULT_DESIGN }
  return {
    show_board_name: board.show_board_name ?? true,
    show_total_count: board.show_total_count ?? false,
    show_profile_image: board.show_profile_image ?? false,
    show_search: board.show_search ?? false,
    image_lightbox: board.image_lightbox ?? true,
    show_author_name: board.show_author_name ?? true,
    show_created_time: board.show_created_time ?? true,
    show_content_preview: board.show_content_preview ?? true,
    show_category: board.show_category ?? true,
    show_view_count: board.show_view_count ?? true,
    show_comment_count: board.show_comment_count ?? false,
    show_like_count: board.show_like_count ?? false,
    show_share: board.show_share ?? false,
    show_print: board.show_print ?? false,
    image_ratio: board.image_ratio ?? '4:3',
    cols_desktop: board.cols_desktop ?? 4,
    gap_px: board.gap_px ?? 30,
    visible_rows: board.visible_rows ?? 12,
    cols_mobile: board.cols_mobile ?? 2,
    keep_cols_on_expand: board.keep_cols_on_expand ?? true,
    title_font_size: board.title_font_size ?? 14,
    content_font_size: board.content_font_size ?? 12,
    padding_px: board.padding_px ?? 20,
    content_preview_lines: board.content_preview_lines ?? 1,
    text_align: board.text_align ?? 'left',
    title_color: board.title_color ?? '#18181b',
    content_color: board.content_color ?? '#71717a',
    border_radius: board.border_radius ?? 0,
    border_width: board.border_width ?? 1,
  }
}

export function BoardManager({
  siteId,
  boards,
}: {
  siteId: string
  boards: Board[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [catList, setCatList] = useState<string[]>([])
  const [newCat, setNewCat] = useState('')

  // 상단 배너
  const [bannerImageUrl, setBannerImageUrl] = useState('')
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null)
  const [bannerVideoName, setBannerVideoName] = useState<string | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  // 디자인 설정 (구성 요소, 리스트 항목, 리스트, 텍스트, 배경/테두리)
  const [design, setDesign] = useState<DesignState>({ ...DEFAULT_DESIGN })
  // 폼 탭
  const [activeTab, setActiveTab] = useState<'settings' | 'design'>('settings')

  function resetBanner() {
    setBannerImageUrl('')
    setBannerVideoUrl(null)
    setBannerVideoName(null)
  }

  async function handleBannerImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const result = await res.json()
    if (result.url) setBannerImageUrl(result.url)
    else setError(result.error ?? '배너 이미지 업로드 실패')
    setBannerUploading(false)
  }

  async function handleBannerVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoUploading(true)
    setVideoProgress(0)
    setBannerVideoName(file.name)
    try {
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })
      const { signedUrl, publicUrl, error: urlError } = await res.json()
      if (urlError) throw new Error(urlError)
      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setVideoProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('업로드 실패')))
        xhr.onerror = () => reject(new Error('업로드 실패'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.send(file)
      })
      setBannerVideoUrl(publicUrl)
    } catch (err) {
      setBannerVideoName(null)
      setBannerVideoUrl(null)
      alert(err instanceof Error ? err.message : '영상 업로드 실패')
    } finally {
      setVideoUploading(false)
      setVideoProgress(0)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('board_categories', JSON.stringify(catList))
    formData.set('banner_url', bannerImageUrl)
    formData.set('banner_video_url', bannerVideoUrl ?? '')
    Object.entries(design).forEach(([k, v]) => formData.set(k, String(v)))

    const result = editingBoard
      ? await updateBoard(editingBoard.id, formData)
      : await createBoard(siteId, formData)

    if (result.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setEditingBoard(null)
      router.refresh()
    }
    setLoading(false)
  }

  function handleEdit(board: Board) {
    setEditingBoard(board)
    setCatList(board.board_categories ?? [])
    setBannerImageUrl(board.banner_url ?? '')
    setBannerVideoUrl(board.banner_video_url ?? null)
    setBannerVideoName(board.banner_video_url ? board.banner_video_url.split('/').pop() ?? '등록됨' : null)
    setDesign(designFromBoard(board))
    setActiveTab('settings')
    setShowForm(true)
    setError(null)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingBoard(null)
    setCatList([])
    setNewCat('')
    resetBanner()
    setDesign({ ...DEFAULT_DESIGN })
    setError(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 게시판 목록 */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="font-semibold text-zinc-900">게시판 목록</h3>
          <button
            onClick={() => { setShowForm(true); setEditingBoard(null); setCatList([]); resetBanner(); setDesign({ ...DEFAULT_DESIGN }); setActiveTab('settings'); setError(null) }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            게시판 추가
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">등록된 게시판이 없습니다.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900">{board.name}</p>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">/board/{board.slug}</span>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                      {board.board_type === 'gallery' ? '갤러리형' : board.board_type === 'webzine' ? '웹진형' : '리스트형'}
                    </span>
                    {!board.is_active && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">비활성</span>
                    )}
                  </div>
                  {board.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">{board.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(board)}
                    className="rounded-md bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100"
                  >
                    수정
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`"${board.name}" 게시판을 삭제하시겠습니까? 게시글도 모두 삭제됩니다.`)) {
                        await deleteBoard(board.id)
                        router.refresh()
                      }
                    }}
                    className="rounded-md bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 게시판 추가/수정 폼 */}
      {showForm && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            {editingBoard ? '게시판 수정' : '게시판 추가'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 탭 */}
            <div className="flex gap-1 border-b border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`cursor-pointer px-4 py-2 text-sm font-medium transition ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                게시판 설정
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className={`cursor-pointer px-4 py-2 text-sm font-medium transition ${
                  activeTab === 'design'
                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                디자인
              </button>
            </div>

            {/* 게시판 설정 탭 (위) */}
            <div className={`space-y-4 ${activeTab === 'settings' ? '' : 'hidden'}`}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">게시판명</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingBoard?.name ?? ''}
                  placeholder="공지사항"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">슬러그 (URL)</label>
                <input
                  name="slug"
                  type="text"
                  required
                  defaultValue={editingBoard?.slug ?? ''}
                  placeholder="notice"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <p className="mt-1 text-xs text-zinc-400">영문, 숫자, 하이픈만 사용. 예: notice, faq, qna</p>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">게시판 유형</label>
              <div className="flex gap-3">
                {[
                  { value: 'list', label: '리스트형', desc: '제목 목록' },
                  { value: 'gallery', label: '갤러리형', desc: '이미지 카드' },
                  { value: 'webzine', label: '웹진형', desc: '이미지+본문' },
                ].map((type) => (
                  <label
                    key={type.value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
                  >
                    <input
                      type="radio"
                      name="board_type"
                      value={type.value}
                      defaultChecked={(editingBoard?.board_type ?? 'list') === type.value}
                      className="h-4 w-4 border-zinc-300 text-zinc-900"
                    />
                    <div>
                      <p className="font-medium text-zinc-900">{type.label}</p>
                      <p className="text-[11px] text-zinc-400">{type.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">설명 (선택)</label>
              <input
                name="description"
                type="text"
                defaultValue={editingBoard?.description ?? ''}
                placeholder="게시판 설명"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            {/* 게시판 카테고리 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">게시판 카테고리 (선택)</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {catList.map((cat, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                    {cat}
                    <button type="button" onClick={() => setCatList(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = newCat.trim()
                      if (v && !catList.includes(v)) { setCatList(prev => [...prev, v]); setNewCat('') }
                    }
                  }}
                  placeholder="카테고리명 입력 후 Enter"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = newCat.trim()
                    if (v && !catList.includes(v)) { setCatList(prev => [...prev, v]); setNewCat('') }
                  }}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200"
                >
                  추가
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-400">글 작성 시 카테고리를 선택할 수 있습니다.</p>
            </div>

            </div>

            {/* 디자인 탭 */}
            <div className={`space-y-4 ${activeTab === 'design' ? '' : 'hidden'}`}>
            {/* 상단 배너 */}
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm font-medium text-zinc-900">상단 배너</p>
              <p className="mb-3 text-xs text-zinc-400">게시판 페이지 상단에 표시됩니다. 영상이 있으면 영상이 우선됩니다.</p>

              {/* 배너 이미지 */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-zinc-600">배너 이미지</label>
                <div className="flex items-start gap-3">
                  {bannerImageUrl ? (
                    <div className="relative">
                      <img src={bannerImageUrl} alt="배너" className="h-20 w-auto max-w-[280px] rounded-lg border border-zinc-200 object-cover" />
                      <button type="button" onClick={() => setBannerImageUrl('')} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600">&times;</button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-[280px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-400">이미지 없음</div>
                  )}
                  <label className="cursor-pointer rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
                    {bannerUploading ? '업로드 중...' : bannerImageUrl ? '이미지 변경' : '이미지 업로드'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} />
                  </label>
                </div>
              </div>

              {/* 배너 영상 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">배너 영상 (선택)</label>
                <div className="flex items-center gap-3">
                  {bannerVideoName ? (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                      <span className="max-w-[160px] truncate text-xs text-zinc-700">{bannerVideoName}</span>
                      {!videoUploading && (
                        <button type="button" onClick={() => { setBannerVideoName(null); setBannerVideoUrl(null) }} className="text-red-500 hover:text-red-600">&times;</button>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-9 w-[160px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-400">영상 없음</div>
                  )}
                  <label className={`cursor-pointer rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 ${videoUploading ? 'pointer-events-none opacity-50' : ''}`}>
                    {videoUploading ? `업로드 중... ${videoProgress}%` : bannerVideoName ? '영상 변경' : '영상 업로드'}
                    <input type="file" accept="video/*" className="hidden" onChange={handleBannerVideoChange} disabled={videoUploading} />
                  </label>
                </div>
                {videoUploading && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full bg-zinc-900 transition-all" style={{ width: `${videoProgress}%` }} />
                  </div>
                )}
                <p className="mt-1 text-[11px] text-zinc-400">영상 등록 시 이미지 대신 자동재생됩니다. (MP4 권장)</p>
              </div>
            </div>

            {/* 디자인 옵션 카드 (구성 요소·리스트 항목·리스트·텍스트·배경/테두리) */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* 구성 요소 */}
              <div className="border-b border-zinc-100 p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">구성 요소</h4>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ['show_board_name', '게시판 이름'],
                    ['show_total_count', '전체 글 수'],
                    ['show_profile_image', '프로필 이미지'],
                    ['show_search', '검색창'],
                    ['image_lightbox', '본문 이미지 클릭 시 라이트박스'],
                  ] as const).map(([k, label]) => {
                    const on = design[k] as boolean
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setDesign((d) => ({ ...d, [k]: !d[k] }))}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                          on
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
                        }`}
                      >
                        {on && (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 리스트 항목 */}
              <div className="border-b border-zinc-100 p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">리스트 항목</h4>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ['show_author_name', '글쓴이'],
                    ['show_created_time', '작성시각'],
                    ['show_content_preview', '글 내용'],
                    ['show_category', '카테고리'],
                    ['show_view_count', '조회수'],
                    ['show_comment_count', '댓글수'],
                    ['show_like_count', '좋아요'],
                    ['show_share', '공유'],
                    ['show_print', '인쇄'],
                  ] as const).map(([k, label]) => {
                    const on = design[k] as boolean
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setDesign((d) => ({ ...d, [k]: !d[k] }))}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                          on
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
                        }`}
                      >
                        {on && (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 리스트 */}
              <div className="border-b border-zinc-100 p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">리스트</h4>
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">이미지 비율</label>
                    <select
                      value={design.image_ratio}
                      onChange={(e) => setDesign((d) => ({ ...d, image_ratio: e.target.value }))}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    >
                      {['4:3', '1:1', '16:9', '3:4', '2:1'].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">한 줄 표시</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={1} max={8}
                        value={design.cols_desktop}
                        onChange={(e) => setDesign((d) => ({ ...d, cols_desktop: Number(e.target.value) || 4 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">개</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">간격</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0}
                        value={design.gap_px}
                        onChange={(e) => setDesign((d) => ({ ...d, gap_px: Number(e.target.value) || 0 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">세로 줄 수</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={1}
                        value={design.visible_rows}
                        onChange={(e) => setDesign((d) => ({ ...d, visible_rows: Number(e.target.value) || 12 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">줄</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">모바일</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={1} max={4}
                        value={design.cols_mobile}
                        onChange={(e) => setDesign((d) => ({ ...d, cols_mobile: Number(e.target.value) || 2 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">개</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDesign((d) => ({ ...d, keep_cols_on_expand: !d.keep_cols_on_expand }))}
                    className={`mb-px inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      design.keep_cols_on_expand
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {design.keep_cols_on_expand && (
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    가로 확장시 갯수 유지
                  </button>
                </div>
              </div>

              {/* 텍스트 */}
              <div className="border-b border-zinc-100 p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">텍스트</h4>
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">제목</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={8} max={48}
                        value={design.title_font_size}
                        onChange={(e) => setDesign((d) => ({ ...d, title_font_size: Number(e.target.value) || 14 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-lg border border-zinc-200" title="제목 색">
                        <span className="block h-full w-full" style={{ backgroundColor: design.title_color }} />
                        <input
                          type="color"
                          value={design.title_color}
                          onChange={(e) => setDesign((d) => ({ ...d, title_color: e.target.value }))}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">내용</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={8} max={32}
                        value={design.content_font_size}
                        onChange={(e) => setDesign((d) => ({ ...d, content_font_size: Number(e.target.value) || 12 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-lg border border-zinc-200" title="내용 색">
                        <span className="block h-full w-full" style={{ backgroundColor: design.content_color }} />
                        <input
                          type="color"
                          value={design.content_color}
                          onChange={(e) => setDesign((d) => ({ ...d, content_color: e.target.value }))}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">안쪽 여백</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0}
                        value={design.padding_px}
                        onChange={(e) => setDesign((d) => ({ ...d, padding_px: Number(e.target.value) || 0 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">표시 줄 수</label>
                    <select
                      value={String(design.content_preview_lines)}
                      onChange={(e) => setDesign((d) => ({ ...d, content_preview_lines: Number(e.target.value) || 1 }))}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}줄까지</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">정렬</label>
                    <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200">
                      {([['left', '←'], ['center', '↔'], ['right', '→']] as const).map(([v, glyph]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDesign((d) => ({ ...d, text_align: v }))}
                          className={`cursor-pointer px-2.5 py-1.5 text-xs transition ${
                            design.text_align === v ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'
                          }`}
                        >
                          {glyph}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 배경/테두리 */}
              <div className="p-4">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">배경/테두리</h4>
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">라운드</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0}
                        value={design.border_radius}
                        onChange={(e) => setDesign((d) => ({ ...d, border_radius: Number(e.target.value) || 0 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">선두께</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0}
                        value={design.border_width}
                        onChange={(e) => setDesign((d) => ({ ...d, border_width: Number(e.target.value) || 0 }))}
                        className="w-14 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-zinc-900 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-400">px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            </div>

            {/* 게시판 설정 탭 (아래 - 활성화 토글) */}
            <div className={`${activeTab === 'settings' ? '' : 'hidden'}`}>
            {editingBoard && (
              <div className="flex items-center gap-2">
                <input name="is_active" type="hidden" value={editingBoard.is_active ? 'true' : 'false'} />
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    defaultChecked={editingBoard.is_active}
                    onChange={(e) => {
                      const hidden = e.target.parentElement?.parentElement?.querySelector('input[name=is_active]') as HTMLInputElement
                      if (hidden) hidden.value = e.target.checked ? 'true' : 'false'
                    }}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  활성화
                </label>
              </div>
            )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? '저장 중...' : editingBoard ? '수정 완료' : '게시판 추가'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
