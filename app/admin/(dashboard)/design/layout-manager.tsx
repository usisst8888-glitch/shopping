'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  Banner,
  LayoutSection,
  BannerSectionConfig,
  FeaturedSectionConfig,
  CategoriesSectionConfig,
  CardBannerGroupConfig,
  CategoryCard,
  DividerWidgetConfig,
  TextWidgetConfig,
  SpacerWidgetConfig,
  BoardSectionConfig,
  SiteDesign,
} from '@/lib/types/design'
import { saveLayout, saveLayoutDraft, clearLayoutDraft, saveNavStyleDraft } from './actions'
import { HeaderAuthEditor } from './header-auth-editor'
import { getHeaderAuthConfig, type HeaderAuthConfig } from '@/lib/header-auth-config'
import { BannerPickerModal } from './banner-picker-modal'
import { InlineEditor } from '@/components/admin/inline-editor'

function generateId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

type CategoryOption = {
  id: string
  name: string
  level: number
  parent_id: string | null
}

type BoardOption = {
  id: string
  name: string
  slug: string
}

export function LayoutManager({
  siteId,
  layout: initialLayout,
  banners,
  categories: allCategories,
  boards,
  design,
}: {
  siteId: string
  layout: LayoutSection[]
  banners: Banner[]
  categories: CategoryOption[]
  boards: BoardOption[]
  design: SiteDesign | null
}) {
  const [sections, setSections] = useState<LayoutSection[]>(initialLayout)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [pickerSection, setPickerSection] =
    useState<BannerSectionConfig | null>(null)
  const [pickerIndex, setPickerIndex] = useState<number>(-1)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [viewMode, setViewMode] = useState<'pc' | 'mobile'>('pc')
  const [previewKey, setPreviewKey] = useState(0)

  // 네비게이션 위젯 편집 모달
  const [editingNav, setEditingNav] = useState(false)
  // 입력 자유도를 위해 string 으로 보관 (빈 값/한 자리도 허용) — blur/save 시 10 이하면 10 으로 보정
  const [navFontSize, setNavFontSize] = useState<string>(String(design?.nav_font_size ?? 13))
  const [navColor, setNavColor] = useState<string>(design?.nav_color ?? '#484848')
  const [navHoverColor, setNavHoverColor] = useState<string>(design?.nav_hover_color ?? '#18181b')
  const [navSaving, setNavSaving] = useState(false)
  // 마지막 「저장」 한 시점의 nav 스타일 (되돌리기 기준)
  const [savedNav, setSavedNav] = useState({
    nav_font_size: design?.nav_font_size ?? 13,
    nav_color: design?.nav_color ?? '#484848',
    nav_hover_color: design?.nav_hover_color ?? '#18181b',
  })
  const [prevSavedNav, setPrevSavedNav] = useState<typeof savedNav | null>(null)

  const openNavEditor = () => {
    // 모달 열 때 현재 저장된 값으로 리셋
    setNavFontSize(String(design?.nav_font_size ?? 13))
    setNavColor(design?.nav_color ?? '#484848')
    setNavHoverColor(design?.nav_hover_color ?? '#18181b')
    setEditingNav(true)
  }

  // 입력 값에서 px 폰트 크기 정규화 (10 미만 → 10, 24 초과 → 24, 비어있음 → 13)
  const normalizeNavFontSize = (s: string) => {
    const n = parseInt(s)
    if (!Number.isFinite(n)) return 13
    return Math.min(24, Math.max(10, n))
  }

  // 네비 스타일 「적용」 — draft 에만 임시 저장. 정식 저장은 우하단 「저장」.
  const handleApplyNavStyle = async () => {
    setNavSaving(true)
    const fz = normalizeNavFontSize(navFontSize)
    setNavFontSize(String(fz))
    const next = {
      nav_font_size: fz,
      nav_color: navColor,
      nav_hover_color: navHoverColor,
    }
    const result = await saveNavStyleDraft(siteId, next)
    setNavSaving(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setEditingNav(false)
      setDirty(true)
      setPreviewKey((k) => k + 1) // iframe 새로고침으로 미리보기 반영
    }
  }
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
  const [sectionRects, setSectionRects] = useState<
    Record<string, { top: number; left: number; width: number; height: number }>
  >({})
  const [iframeHeight, setIframeHeight] = useState<number>(720)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // 헤더 네비게이션 영역 좌표 (iframe document 기준 절대 top + 높이)
  const [navRect, setNavRect] = useState<{ top: number; height: number } | null>(null)
  const [hoveredNav, setHoveredNav] = useState(false)
  // 헤더 우측 인증 메뉴 영역
  const [authRect, setAuthRect] = useState<{ top: number; right: number; width: number; height: number } | null>(null)
  const [hoveredAuth, setHoveredAuth] = useState(false)
  const [editingHeaderAuth, setEditingHeaderAuth] = useState(false)
  const initialHeaderAuthConfig = getHeaderAuthConfig(
    (design as unknown as { header_auth_config?: unknown } | null)?.header_auth_config,
  )
  const [headerAuthConfig, setHeaderAuthConfig] = useState<HeaderAuthConfig>(initialHeaderAuthConfig)
  const [savedHeaderAuthConfig, setSavedHeaderAuthConfig] = useState<HeaderAuthConfig>(initialHeaderAuthConfig)
  const [prevSavedHeaderAuthConfig, setPrevSavedHeaderAuthConfig] = useState<HeaderAuthConfig | null>(null)
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [categoryLabel, setCategoryLabel] = useState('')
  const [categorySubtitle, setCategorySubtitle] = useState('')
  const [editingCardBannerIndex, setEditingCardBannerIndex] = useState<number | null>(null)
  const [cardBannerLabel, setCardBannerLabel] = useState('')
  const [cardBannerHeight, setCardBannerHeight] = useState<number>(100)
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([])
  const [uploadingCardImage, setUploadingCardImage] = useState(false)

  // 변경 사항 추적 (저장 버튼 강조용)
  const [dirty, setDirty] = useState(false)
  // sections 를 직접 갱신하는 헬퍼 — 항상 dirty 플래그도 함께 켠다
  const updateSections = (updater: (prev: LayoutSection[]) => LayoutSection[]) => {
    setSections(updater)
    setDirty(true)
  }

  // 마지막으로 「저장」 한 시점의 layout (= 되돌리기 기준점).
  // 「저장」 버튼을 눌렀을 때만 갱신. props 변경(자동 draft revalidate 등)에 동기화하지 않음.
  const [savedLayout, setSavedLayout] = useState<LayoutSection[]>(initialLayout)
  // 직전 저장본 — 「저장」 직후 「되돌리기」 로 마지막 저장을 undo 할 수 있게 보관
  const [prevSavedLayout, setPrevSavedLayout] = useState<LayoutSection[] | null>(null)

  // ─── 미리보기용 임시 저장 (DB site_design.homepage_layout_draft) ───
  // 정식 layout 은 절대 건드리지 않음. 일반 방문자는 항상 정식 layout 만 보고,
  // draft 는 admin 미리보기 iframe (?preview=draft) 에서만 사용됨.
  useEffect(() => {
    if (!dirty) return
    const handle = setTimeout(async () => {
      await saveLayoutDraft(siteId, sections)
      setPreviewKey((k) => k + 1)
    }, 500)
    return () => clearTimeout(handle)
  }, [sections, dirty, siteId])

  // (toggleVisibility / deleteSection / moveSection 은 iframeRef 가 선언된 아래에서 정의)

  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [editingFeaturedIndex, setEditingFeaturedIndex] = useState<number | null>(null)
  const [featuredTitleModal, setFeaturedTitleModal] = useState<{ categoryId: string; categoryName: string; isEdit: boolean } | null>(null)
  const [featuredLabel, setFeaturedLabel] = useState('')
  const [featuredSubtitle, setFeaturedSubtitle] = useState('')
  const [featuredMoreAction, setFeaturedMoreAction] = useState<'link' | 'expand'>('link')
  const [featuredShowMore, setFeaturedShowMore] = useState(true)
  const [featuredDisplay, setFeaturedDisplay] = useState<'grid' | 'slider'>('grid')
  const [featuredPerRow, setFeaturedPerRow] = useState(4)
  const [featuredRows, setFeaturedRows] = useState(2)
  const [featuredPerRowMobile, setFeaturedPerRowMobile] = useState(2)
  const [featuredRowsMobile, setFeaturedRowsMobile] = useState(2)
  const [featuredTotalItems, setFeaturedTotalItems] = useState(8)
  const [featuredSortBy, setFeaturedSortBy] = useState<'created' | 'popular' | 'priceAsc' | 'priceDesc'>('created')
  const [featuredAutoSeconds, setFeaturedAutoSeconds] = useState(0)
  const [featuredPreviewTab, setFeaturedPreviewTab] = useState<'pc' | 'mobile'>('pc')
  const [showCatPickerInModal, setShowCatPickerInModal] = useState(false)

  // 게시판 위젯 모달 상태
  const [editingBoardIndex, setEditingBoardIndex] = useState<number | null>(null) // -1 = 신규
  const [showBoardPicker, setShowBoardPicker] = useState(false) // 추가 시 게시판 선택 단계
  const [boardWidgetBoardId, setBoardWidgetBoardId] = useState('')
  const [boardWidgetLabel, setBoardWidgetLabel] = useState('')
  const [boardWidgetSubtitle, setBoardWidgetSubtitle] = useState('')
  const [boardWidgetPerRow, setBoardWidgetPerRow] = useState(1)
  const [boardWidgetRows, setBoardWidgetRows] = useState(5)
  const [boardWidgetShowMore, setBoardWidgetShowMore] = useState(true)
  const [boardWidgetShowThumb, setBoardWidgetShowThumb] = useState(true)
  const [boardWidgetShowDate, setBoardWidgetShowDate] = useState(true)

  const addSection = (type: LayoutSection['type']) => {
    const id = generateId()

    if (type === 'banner') {
      // 배너는 모달에서 먼저 배너를 골라야 storefront 에 노드가 생김
      // → 빈 placeholder 섹션으로 BannerPickerModal 을 띄우고, confirm 시점에 추가
      setShowAddMenu(false)
      const placeholder: BannerSectionConfig = {
        id,
        type: 'banner',
        visible: true,
        label: '새 배너',
        display: 'carousel',
        bannerIds: [],
      }
      setPickerSection(placeholder)
      setPickerIndex(-1) // -1 = 새로 추가 모드
      return
    } else if (type === 'featured') {
      setShowAddMenu(false)
      setShowCategoryPicker(true)
      return
    } else if (type === 'board') {
      // 게시판 위젯: 게시판 선택 → 편집 모달
      setShowAddMenu(false)
      setShowBoardPicker(true)
      return
    } else if (type === 'cardBannerGroup') {
      // 카드배너 그룹도 빈 카드면 storefront 에 렌더 안 되므로 모달 먼저
      setShowAddMenu(false)
      setCategoryCards([])
      setCardBannerLabel('카드배너')
      setCardBannerHeight(100)
      setEditingCardBannerIndex(-1) // -1 = 새로 추가 모드
      return
    }

    // 단순 위젯: 편집 모달부터 띄우고, 사용자가 「저장」 눌러야 실제로 추가됨
    if (type === 'divider') {
      setShowAddMenu(false)
      setWidgetThickness(1)
      setWidgetColor('#e4e4e7')
      setWidgetMarginY(24)
      setWidgetStyle('solid')
      setEditingWidget({ idx: -1, type: 'divider' }) // -1 = 새로 추가 모드
      return
    } else if (type === 'text') {
      setShowAddMenu(false)
      setWidgetHtml('')
      setWidgetAlign('left')
      setWidgetMarginY(16)
      setEditingWidget({ idx: -1, type: 'text' })
      return
    } else if (type === 'spacer') {
      setShowAddMenu(false)
      setWidgetHeight(40)
      setEditingWidget({ idx: -1, type: 'spacer' })
      return
    }

    const newSection: LayoutSection = { id, type, visible: true } as LayoutSection
    setShowAddMenu(false)
    // iframe DOM 으로 흉내 낼 수 없으므로 즉시 저장 후 iframe 새로고침
    void saveAndRefresh([...sections, newSection])
  }

  const addFeaturedWithCategory = (categoryId: string, categoryName: string) => {
    setShowCategoryPicker(false)
    setFeaturedLabel(categoryName)
    setFeaturedSubtitle('')
    setFeaturedMoreAction('link')
    setFeaturedShowMore(true)
    setFeaturedDisplay('grid')
    setFeaturedPerRow(4)
    setFeaturedRows(2)
    setFeaturedPerRowMobile(2)
    setFeaturedRowsMobile(2)
    setFeaturedTotalItems(8)
    setFeaturedSortBy('created')
    setFeaturedAutoSeconds(0)
    setFeaturedTitleModal({ categoryId, categoryName, isEdit: false })
  }

  const confirmFeaturedTitle = () => {
    if (!featuredTitleModal) return
    const { categoryId, isEdit } = featuredTitleModal

    const common = {
      categoryId,
      label: featuredLabel,
      subtitle: featuredSubtitle,
      moreAction: featuredMoreAction,
      showMoreButton: featuredShowMore,
      display: featuredDisplay,
      perRow: featuredPerRow,
      rows: featuredRows,
      perRowMobile: featuredPerRowMobile,
      rowsMobile: featuredRowsMobile,
      totalItems: featuredTotalItems,
      sortBy: featuredSortBy,
      autoSeconds: featuredAutoSeconds,
    }
    let newSections: LayoutSection[]
    if (isEdit && editingFeaturedIndex !== null) {
      newSections = sections.map((s, i) =>
        i === editingFeaturedIndex
          ? ({ ...s, ...common } as FeaturedSectionConfig)
          : s
      )
    } else {
      const id = generateId()
      const newSection: FeaturedSectionConfig = {
        id,
        type: 'featured',
        visible: true,
        ...common,
      }
      newSections = [...sections, newSection]
    }
    setFeaturedTitleModal(null)
    setEditingFeaturedIndex(null)
    setShowCatPickerInModal(false)
    void saveAndRefresh(newSections)
  }

  // 게시판 위젯 — 게시판 선택 후 편집 모달 열기
  const addBoardWidget = (boardId: string, boardName: string) => {
    setShowBoardPicker(false)
    setBoardWidgetBoardId(boardId)
    setBoardWidgetLabel(boardName)
    setBoardWidgetSubtitle('')
    setBoardWidgetPerRow(1)
    setBoardWidgetRows(5)
    setBoardWidgetShowMore(true)
    setBoardWidgetShowThumb(true)
    setBoardWidgetShowDate(true)
    setEditingBoardIndex(-1)
  }

  const confirmBoardWidget = () => {
    if (editingBoardIndex === null) return
    if (!boardWidgetBoardId) return

    let newSections: LayoutSection[]
    if (editingBoardIndex === -1) {
      const newSection: BoardSectionConfig = {
        id: generateId(),
        type: 'board',
        visible: true,
        boardId: boardWidgetBoardId,
        label: boardWidgetLabel,
        subtitle: boardWidgetSubtitle,
        perRow: boardWidgetPerRow,
        rows: boardWidgetRows,
        showMoreButton: boardWidgetShowMore,
        showThumbnail: boardWidgetShowThumb,
        showDate: boardWidgetShowDate,
      }
      newSections = [...sections, newSection]
    } else {
      newSections = sections.map((s, i) =>
        i === editingBoardIndex
          ? {
              ...s,
              boardId: boardWidgetBoardId,
              label: boardWidgetLabel,
              subtitle: boardWidgetSubtitle,
              perRow: boardWidgetPerRow,
              rows: boardWidgetRows,
              showMoreButton: boardWidgetShowMore,
              showThumbnail: boardWidgetShowThumb,
              showDate: boardWidgetShowDate,
            } as BoardSectionConfig
          : s,
      )
    }
    setEditingBoardIndex(null)
    void saveAndRefresh(newSections)
  }

  const openBannerPicker = (idx: number) => {
    const section = sections[idx] as BannerSectionConfig
    setPickerSection(section)
    setPickerIndex(idx)
  }

  const handlePickerConfirm = (updated: BannerSectionConfig) => {
    const newSections =
      pickerIndex === -1
        ? [...sections, updated] // 새 배너 섹션 추가
        : sections.map((s, i) => (i === pickerIndex ? updated : s)) // 기존 편집
    setPickerSection(null)
    setPickerIndex(-1)
    void saveAndRefresh(newSections)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const navPayload = {
      nav_font_size: normalizeNavFontSize(navFontSize),
      nav_color: navColor,
      nav_hover_color: navHoverColor,
    }
    // layout + 헤더 우측 메뉴 + 네비 스타일을 한 번에 commit
    const result = await saveLayout(siteId, sections, headerAuthConfig, navPayload)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '레이아웃이 저장되었습니다.' })
      setTimeout(() => setMessage(null), 3000)
      setDirty(false)
      // 직전 저장본을 보관 (저장 직후 「되돌리기」 가능)
      setPrevSavedLayout(savedLayout)
      setPrevSavedHeaderAuthConfig(savedHeaderAuthConfig)
      setPrevSavedNav(savedNav)
      // 새 저장본 갱신
      setSavedLayout(sections)
      setSavedHeaderAuthConfig(headerAuthConfig)
      setSavedNav(navPayload)
      // 저장된 깨끗한 상태로 iframe 새로고침
      setPreviewKey((k) => k + 1)
    }
    setSaving(false)
  }

  // 되돌리기 — 마지막 저장 상태로 메모리 복원 + 미리보기용 임시 draft 비움.
  // 정식 layout 은 건드리지 않으므로 일반 방문자에게 보이는 화면은 동일.
  const canRevert = dirty || prevSavedLayout !== null

  const handleRevert = async () => {
    if (!canRevert) return

    if (dirty) {
      // 저장 안 한 변경 취소 — 현재 저장본으로 메모리 복원, draft 비움
      if (!confirm('저장하지 않은 변경사항을 취소하고 마지막 저장 상태로 되돌리시겠습니까?')) return
      setSections(savedLayout)
      setHeaderAuthConfig(savedHeaderAuthConfig)
      setNavFontSize(String(savedNav.nav_font_size))
      setNavColor(savedNav.nav_color)
      setNavHoverColor(savedNav.nav_hover_color)
      setDirty(false)
      await clearLayoutDraft(siteId)
      setPreviewKey((k) => k + 1)
      setMessage({ type: 'success', text: '마지막 저장 상태로 되돌렸습니다.' })
      setTimeout(() => setMessage(null), 2500)
      return
    }

    // 저장 직후의 「되돌리기」 — 직전 저장본으로 DB 까지 commit 해서 마지막 저장을 undo
    if (!prevSavedLayout) return
    if (!confirm('마지막 저장을 취소하고 직전에 저장된 상태로 되돌리시겠습니까?')) return
    const navPayload = prevSavedNav ?? savedNav
    const headerPayload = prevSavedHeaderAuthConfig ?? savedHeaderAuthConfig
    setSaving(true)
    const result = await saveLayout(siteId, prevSavedLayout, headerPayload, navPayload)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      setSaving(false)
      return
    }
    setSections(prevSavedLayout)
    setHeaderAuthConfig(headerPayload)
    setNavFontSize(String(navPayload.nav_font_size))
    setNavColor(navPayload.nav_color)
    setNavHoverColor(navPayload.nav_hover_color)
    setSavedLayout(prevSavedLayout)
    setSavedHeaderAuthConfig(headerPayload)
    setSavedNav(navPayload)
    // 직전 저장본 한 단계만 보관 → undo 후 다시 사용 못 함
    setPrevSavedLayout(null)
    setPrevSavedHeaderAuthConfig(null)
    setPrevSavedNav(null)
    setDirty(false)
    setSaving(false)
    setPreviewKey((k) => k + 1)
    setMessage({ type: 'success', text: '직전 저장 상태로 되돌렸습니다.' })
    setTimeout(() => setMessage(null), 2500)
  }

  // 콘텐츠 추가/편집: 미리보기(local state) 에만 반영하고 dirty 표시.
  // 실제 저장은 사용자가 「변경사항 저장」 을 눌렀을 때만 이루어진다.
  const saveAndRefresh = (newSections: LayoutSection[]) => {
    setSections(newSections)
    setDirty(true)
  }

  // iframe 안의 섹션 좌표 측정 → 오버레이 위치 동기화
  const measureSections = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    const nodes = doc.querySelectorAll<HTMLElement>('[data-section-id]')
    const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
    nodes.forEach((el) => {
      const id = el.getAttribute('data-section-id')
      if (!id) return
      const r = el.getBoundingClientRect()
      next[id] = { top: el.offsetTop, left: r.left, width: r.width, height: r.height }
      // offsetTop는 iframe document 기준 절대 y(스크롤 영향 없음); 가로는 viewport 기준이라 left는 0으로 가정
      next[id].left = 0
    })
    // 헤더 네비게이션 좌표 측정 (admin 컨텍스트에서만 활용)
    const navEl = doc.querySelector<HTMLElement>('[data-nav-widget]')
    if (navEl) {
      // body 기준 누적 offsetTop 으로 absolute 위치 계산
      let top = 0
      let cur: HTMLElement | null = navEl
      while (cur) {
        top += cur.offsetTop
        cur = cur.offsetParent as HTMLElement | null
      }
      setNavRect({ top, height: navEl.offsetHeight })
    } else {
      setNavRect(null)
    }

    // 헤더 우측 인증 메뉴 영역 측정
    const authEl = doc.querySelector<HTMLElement>('[data-header-auth]')
    if (authEl) {
      const rect = authEl.getBoundingClientRect()
      let top = 0
      let cur: HTMLElement | null = authEl
      while (cur) {
        top += cur.offsetTop
        cur = cur.offsetParent as HTMLElement | null
      }
      setAuthRect({
        top,
        right: doc.documentElement.clientWidth - rect.right,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setAuthRect(null)
    }
    // 전체 문서 높이도 갱신 (iframe 안 콘텐츠가 길어지면 따라가게)
    const docHeight = Math.max(
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0,
    )
    if (docHeight > 0) setIframeHeight(docHeight)
    setSectionRects(next)
  }, [])

  // iframe 로드 + scroll/resize 시 재측정. previewKey가 바뀌면 iframe 재로드되므로 다시 바인딩.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measureSections)
    }
    const onLoad = () => {
      schedule()
      const win = iframe.contentWindow
      const doc = iframe.contentDocument
      if (!win || !doc) return
      win.addEventListener('resize', schedule)
      const ro = new ResizeObserver(schedule)
      if (doc.body) ro.observe(doc.body)
      // 이미지 등 늦게 로드되는 리소스 대응
      doc.querySelectorAll('img').forEach((img) => {
        if (!(img as HTMLImageElement).complete) {
          img.addEventListener('load', schedule, { once: true })
        }
      })
      // cleanup 저장
      ;(iframe as unknown as { _cleanup?: () => void })._cleanup = () => {
        win.removeEventListener('resize', schedule)
        ro.disconnect()
      }
    }
    iframe.addEventListener('load', onLoad)
    // 이미 로드된 상태일 수도 있음
    if (iframe.contentDocument?.readyState === 'complete') onLoad()
    return () => {
      iframe.removeEventListener('load', onLoad)
      const c = (iframe as unknown as { _cleanup?: () => void })._cleanup
      if (c) c()
      cancelAnimationFrame(raf)
    }
  }, [measureSections, previewKey, viewMode])

  // 섹션 라벨 도우미
  const getSectionLabel = (s: LayoutSection): { type: string; name: string } => {
    if (s.type === 'banner') return { type: '배너', name: (s as BannerSectionConfig).label || '배너' }
    if (s.type === 'categories') return { type: '카테고리', name: (s as CategoriesSectionConfig).label || '카드 배너' }
    if (s.type === 'featured') return { type: '메인상품추출', name: stripHtml((s as FeaturedSectionConfig).label) || '메인상품추출' }
    if (s.type === 'cardBannerGroup') return { type: '카드배너 그룹', name: (s as CardBannerGroupConfig).label || '카드배너 그룹' }
    if (s.type === 'divider') return { type: '가로선', name: '가로선' }
    if (s.type === 'text') return { type: '텍스트', name: stripHtml((s as TextWidgetConfig).html) || '텍스트' }
    if (s.type === 'spacer') return { type: '여백', name: `여백 ${(s as SpacerWidgetConfig).height ?? 40}px` }
    if (s.type === 'board') {
      const cfg = s as BoardSectionConfig
      const name = stripHtml(cfg.label) || boards.find((b) => b.id === cfg.boardId)?.name || '게시판'
      return { type: '게시판', name }
    }
    return { type: '브랜드', name: '브랜드' }
  }

  // 단순 위젯 편집 모달 (divider / text / spacer)
  const [editingWidget, setEditingWidget] = useState<{
    idx: number
    type: 'divider' | 'text' | 'spacer'
  } | null>(null)
  const [widgetHtml, setWidgetHtml] = useState('')
  const [widgetAlign, setWidgetAlign] = useState<'left' | 'center' | 'right'>('left')
  const [widgetMarginY, setWidgetMarginY] = useState(16)
  const [widgetThickness, setWidgetThickness] = useState(1)
  const [widgetColor, setWidgetColor] = useState('#e4e4e7')
  const [widgetStyle, setWidgetStyle] = useState<'solid' | 'dashed' | 'dotted' | 'double' | 'dashdot'>('solid')
  const [widgetHeight, setWidgetHeight] = useState(40)

  const openSectionEditor = (section: LayoutSection, idx: number) => {
    if (section.type === 'banner') {
      openBannerPicker(idx)
    } else if (section.type === 'categories') {
      const cfg = section as CategoriesSectionConfig
      setCategoryCards(cfg.cards ?? [])
      setCategoryLabel(cfg.label ?? '')
      setCategorySubtitle(cfg.subtitle ?? '')
      setEditingCategoryIndex(idx)
    } else if (section.type === 'cardBannerGroup') {
      const cfg = section as CardBannerGroupConfig
      setCategoryCards(cfg.cards ?? [])
      setEditingCardBannerIndex(idx)
      setCardBannerLabel(cfg.label || '카드배너')
      setCardBannerHeight(cfg.cardHeight ?? 100)
    } else if (section.type === 'featured') {
      const cfg = section as FeaturedSectionConfig
      setEditingFeaturedIndex(idx)
      setFeaturedLabel(cfg.label || '')
      setFeaturedSubtitle(cfg.subtitle || '')
      setFeaturedMoreAction(cfg.moreAction || 'link')
      setFeaturedShowMore(cfg.showMoreButton ?? true)
      setFeaturedDisplay(cfg.display || 'grid')
      setFeaturedPerRow(cfg.perRow || 4)
      setFeaturedRows(cfg.rows || 2)
      setFeaturedPerRowMobile(cfg.perRowMobile ?? 2)
      setFeaturedRowsMobile(cfg.rowsMobile ?? cfg.rows ?? 2)
      setFeaturedTotalItems(cfg.totalItems ?? (cfg.perRow || 4) * (cfg.rows || 2))
      setFeaturedSortBy(cfg.sortBy ?? 'created')
      setFeaturedAutoSeconds(cfg.autoSeconds || 0)
      setShowCatPickerInModal(false)
      setFeaturedTitleModal({ categoryId: cfg.categoryId || '', categoryName: cfg.label || '', isEdit: true })
    } else if (section.type === 'divider') {
      const cfg = section as DividerWidgetConfig
      setWidgetThickness(cfg.thickness ?? 1)
      setWidgetColor(cfg.color ?? '#e4e4e7')
      setWidgetMarginY(cfg.marginY ?? 24)
      setWidgetStyle(cfg.style ?? 'solid')
      setEditingWidget({ idx, type: 'divider' })
    } else if (section.type === 'text') {
      const cfg = section as TextWidgetConfig
      setWidgetHtml(cfg.html ?? '')
      setWidgetAlign(cfg.align ?? 'left')
      setWidgetMarginY(cfg.marginY ?? 16)
      setEditingWidget({ idx, type: 'text' })
    } else if (section.type === 'spacer') {
      const cfg = section as SpacerWidgetConfig
      setWidgetHeight(cfg.height ?? 40)
      setEditingWidget({ idx, type: 'spacer' })
    } else if (section.type === 'board') {
      const cfg = section as BoardSectionConfig
      setBoardWidgetBoardId(cfg.boardId ?? '')
      setBoardWidgetLabel(cfg.label ?? '')
      setBoardWidgetSubtitle(cfg.subtitle ?? '')
      setBoardWidgetPerRow(cfg.perRow ?? 1)
      setBoardWidgetRows(cfg.rows ?? 5)
      setBoardWidgetShowMore(cfg.showMoreButton ?? true)
      setBoardWidgetShowThumb(cfg.showThumbnail ?? true)
      setBoardWidgetShowDate(cfg.showDate ?? true)
      setEditingBoardIndex(idx)
    }
  }

  const saveWidget = () => {
    if (!editingWidget) return
    const { idx, type } = editingWidget

    let newSections: LayoutSection[]
    if (idx === -1) {
      // 신규 추가
      const id = generateId()
      let newSection: LayoutSection
      if (type === 'divider') {
        newSection = { id, type: 'divider', visible: true, thickness: widgetThickness, color: widgetColor, marginY: widgetMarginY, style: widgetStyle }
      } else if (type === 'text') {
        newSection = { id, type: 'text', visible: true, html: widgetHtml, align: widgetAlign, marginY: widgetMarginY }
      } else {
        newSection = { id, type: 'spacer', visible: true, height: widgetHeight }
      }
      newSections = [...sections, newSection]
    } else {
      newSections = sections.map((s, i) => {
        if (i !== idx) return s
        if (type === 'divider') {
          return { ...s, thickness: widgetThickness, color: widgetColor, marginY: widgetMarginY, style: widgetStyle } as DividerWidgetConfig
        }
        if (type === 'text') {
          return { ...s, html: widgetHtml, align: widgetAlign, marginY: widgetMarginY } as TextWidgetConfig
        }
        // spacer
        return { ...s, height: widgetHeight } as SpacerWidgetConfig
      })
    }

    setEditingWidget(null)
    void saveAndRefresh(newSections)
  }

  // iframe 안 섹션 노드 찾기
  const getIframeNode = (sectionId: string): HTMLElement | null => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return null
    return doc.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`)
  }

  // 좌표 재측정을 다음 frame 에서 (DOM mutation 후 layout 안정화 대기)
  const scheduleMeasure = () => {
    requestAnimationFrame(() => requestAnimationFrame(measureSections))
  }

  // 순서 변경 — iframe DOM도 즉시 reorder 해서 시각적으로 바로 반영
  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return

    const aId = sections[idx].id
    const bId = sections[target].id
    const aNode = getIframeNode(aId)
    const bNode = getIframeNode(bId)
    if (aNode && bNode && aNode.parentNode) {
      // 두 노드를 placeholder 로 swap
      const placeholder = aNode.ownerDocument.createComment('swap')
      aNode.parentNode.insertBefore(placeholder, aNode)
      bNode.parentNode!.insertBefore(aNode, bNode)
      placeholder.parentNode!.insertBefore(bNode, placeholder)
      placeholder.remove()
    }

    updateSections((prev) => {
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    scheduleMeasure()
  }

  // 표시/숨김 — iframe 안에서는 시각적으로 흐리게(opacity)만 변경
  const toggleVisibility = (idx: number) => {
    const id = sections[idx].id
    updateSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, visible: !s.visible } : s)),
    )
    const node = getIframeNode(id)
    if (node) {
      // 토글된 다음 상태 기준으로 스타일 적용
      const willBeVisible = !sections[idx].visible
      node.style.opacity = willBeVisible ? '' : '0.35'
      node.style.pointerEvents = willBeVisible ? '' : 'none'
    }
    scheduleMeasure()
  }

  // 삭제 — iframe DOM에서도 즉시 제거
  const deleteSection = (idx: number) => {
    if (!confirm('이 섹션을 삭제하시겠습니까?')) return
    const id = sections[idx].id
    const node = getIframeNode(id)
    if (node) node.remove()
    updateSections((prev) => prev.filter((_, i) => i !== idx))
    scheduleMeasure()
  }


  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* PC / 모바일 미리보기 토글 + 되돌리기 */}
      <div className="relative flex items-center justify-center">
        <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => setViewMode('pc')}
            className={`flex cursor-pointer items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
              viewMode === 'pc' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path strokeLinecap="round" d="M8 20h8M12 16v4" />
            </svg>
            PC
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex cursor-pointer items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
              viewMode === 'mobile' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <rect x="7" y="3" width="10" height="18" rx="2" />
              <path strokeLinecap="round" d="M11 18h2" />
            </svg>
            모바일
          </button>
        </div>

        {/* 맨 오른쪽: 되돌리기 — 저장 안 한 변경 취소 또는 직전 저장으로 undo */}
        {canRevert && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={saving}
            title={
              dirty
                ? '저장하지 않은 변경사항을 취소하고 마지막 저장 상태로 되돌립니다'
                : '마지막 저장을 취소하고 직전 저장 상태로 되돌립니다'
            }
            className="absolute right-0 flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h13a5 5 0 010 10h-3" />
            </svg>
            되돌리기
          </button>
        )}
      </div>

      {/* 실제 페이지 + 오버레이 편집 영역 */}
      <div className={`mx-auto transition-all ${viewMode === 'mobile' ? 'w-[420px]' : 'w-full'}`}>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <span className="ml-2 text-[11px] font-medium text-zinc-500">
                미리보기 위에서 바로 편집 · {viewMode === 'mobile' ? '모바일 (420px)' : 'PC (전체 너비)'}
              </span>
              {saving && (
                <span className="ml-2 flex items-center gap-1 text-[11px] text-blue-600">
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  저장 중…
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50"
                title="새로고침"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50"
                title="새 탭에서 열기"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                새 탭
              </a>
            </div>
          </div>

          {/* iframe + 오버레이 */}
          <div className="relative">
            <iframe
              ref={iframeRef}
              key={previewKey}
              src={dirty ? '/?preview=draft' : '/'}
              title="실제 페이지 미리보기"
              className="block w-full"
              style={{ height: `${iframeHeight}px`, border: 'none' }}
              scrolling="no"
            />

            {/* 섹션 오버레이 — 저장된 페이지의 섹션 위에 컨트롤 표시 */}
            <div className="pointer-events-none absolute inset-0">
              {/* 네비게이션 위젯 오버레이 — 헤더의 nav 영역 */}
              {navRect && (
                <div
                  onMouseEnter={() => setHoveredNav(true)}
                  onMouseLeave={() => setHoveredNav(false)}
                  className={`pointer-events-auto absolute transition ${
                    hoveredNav ? 'border-2 border-blue-500 bg-blue-500/5' : 'border-2 border-transparent hover:border-blue-300'
                  }`}
                  style={{ top: navRect.top, left: 0, width: '100%', height: navRect.height }}
                >
                  {/* 좌상단 타입 뱃지 */}
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    <span className="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      네비
                    </span>
                  </div>
                  {/* 우상단 컨트롤 — 네비는 위/아래/숨김/삭제 없이 「편집」만 */}
                  <div
                    className={`absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-md ring-1 ring-zinc-200 transition ${
                      hoveredNav ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={openNavEditor}
                      className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      편집
                    </button>
                  </div>
                </div>
              )}

              {/* 헤더 우측 인증 메뉴 오버레이 */}
              {authRect && (
                <div
                  onMouseEnter={() => setHoveredAuth(true)}
                  onMouseLeave={() => setHoveredAuth(false)}
                  className={`pointer-events-auto absolute transition ${
                    hoveredAuth ? 'border-2 border-purple-500 bg-purple-500/5' : 'border-2 border-transparent hover:border-purple-300'
                  }`}
                  style={{
                    top: authRect.top - 4,
                    right: Math.max(0, authRect.right - 8),
                    width: authRect.width + 16,
                    height: authRect.height + 8,
                  }}
                >
                  <div className="absolute -top-6 left-0 flex items-center gap-1">
                    <span className="rounded bg-purple-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      회원 메뉴
                    </span>
                  </div>
                  <div
                    className={`absolute -top-9 right-0 flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-md ring-1 ring-zinc-200 transition ${
                      hoveredAuth ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingHeaderAuth(true)}
                      className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-purple-600 hover:bg-purple-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      편집
                    </button>
                  </div>
                </div>
              )}

              {sections.map((section, idx) => {
                const rect = sectionRects[section.id]
                if (!rect) return null
                const { type } = getSectionLabel(section)
                const isHovered = hoveredSectionId === section.id
                return (
                  <div
                    key={section.id}
                    onMouseEnter={() => setHoveredSectionId(section.id)}
                    onMouseLeave={() => setHoveredSectionId((curr) => (curr === section.id ? null : curr))}
                    className={`pointer-events-auto absolute transition ${
                      isHovered
                        ? 'border-2 border-blue-500 bg-blue-500/5'
                        : 'border-2 border-transparent hover:border-blue-300'
                    } ${!section.visible ? 'bg-zinc-900/30' : ''}`}
                    style={{
                      top: rect.top,
                      left: 0,
                      width: '100%',
                      height: rect.height,
                    }}
                  >
                    {/* 좌상단 타입 뱃지 (항상 표시) */}
                    <div className="absolute left-2 top-2 flex items-center gap-1">
                      <span className="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                        {type}
                      </span>
                      {!section.visible && (
                        <span className="rounded bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                          숨김
                        </span>
                      )}
                    </div>

                    {/* 우상단 컨트롤 (호버 시 표시) */}
                    <div className={`absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-md ring-1 ring-zinc-200 transition ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                        title="위로"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                        title="아래로"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <span className="mx-0.5 h-4 w-px bg-zinc-200" />
                      <button
                        type="button"
                        onClick={() => openSectionEditor(section, idx)}
                        className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        편집
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(idx)}
                        className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                        title={section.visible ? '숨기기' : '표시'}
                      >
                        {section.visible ? (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(idx)}
                        className="cursor-pointer rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        title="삭제"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}

              {sections.length === 0 && (
                <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-zinc-50/90 text-sm text-zinc-400">
                  우하단 「위젯 추가」 버튼으로 레이아웃을 구성하세요
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-400">
          {dirty
            ? '🟡 편집 중 — 미리보기는 본인에게만 보이며 일반 방문자에게는 노출되지 않습니다 · 「저장」 또는 「되돌리기」 선택'
            : '미리보기는 저장된 상태입니다 · 변경하면 즉시 미리보기에 반영됩니다 (저장 전까지 실제 사이트엔 적용 안 됨)'}
        </p>
      </div>


      {/* 우하단 플로팅 — 저장 + 위젯 추가 */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-lg ring-1 transition disabled:cursor-not-allowed ${
            dirty
              ? 'bg-blue-600 text-white ring-blue-600/20 hover:bg-blue-700 hover:scale-105'
              : 'bg-white text-zinc-400 ring-zinc-200'
          } ${saving ? 'opacity-70' : ''}`}
        >
          {saving ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? '저장 중…' : dirty ? '변경사항 저장' : '저장됨'}
        </button>
        <div className="relative">
        {showAddMenu && (
          <>
            {/* 메뉴 바깥 클릭 시 닫힘 */}
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowAddMenu(false)}
            />
            <div className="absolute bottom-full right-0 z-10 mb-3 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                위젯 추가
              </div>
              <button
                onClick={() => addSection('banner')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                배너
              </button>
              <button
                onClick={() => addSection('featured')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                메인상품추출
              </button>
              <button
                onClick={() => addSection('cardBannerGroup')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
                </svg>
                카드배너 그룹
              </button>
              <button
                onClick={() => addSection('board')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
                </svg>
                게시판
              </button>
              <div className="my-1 border-t border-zinc-100" />
              <button
                onClick={() => addSection('text')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
                </svg>
                텍스트
              </button>
              <button
                onClick={() => addSection('divider')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
                </svg>
                가로선
              </button>
              <button
                onClick={() => addSection('spacer')}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4M12 16v4M4 12h4M16 12h4" />
                </svg>
                여백
              </button>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowAddMenu((v) => !v)}
          className={`relative z-10 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg ring-1 ring-zinc-900/10 transition hover:scale-105 hover:bg-zinc-800 ${
            showAddMenu ? 'rotate-45' : ''
          }`}
          title="위젯 추가"
          aria-label="위젯 추가"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
        </div>
      </div>

      {/* 배너 선택 모달 */}
      {pickerSection && (
        <BannerPickerModal
          banners={banners}
          section={pickerSection}
          onConfirm={handlePickerConfirm}
          onClose={() => {
            setPickerSection(null)
            setPickerIndex(-1)
          }}
        />
      )}

      {/* 카테고리 선택 모달 (새 메인상품추출 추가 시) */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">카테고리 선택</h3>
              <p className="mt-1 text-sm text-zinc-500">메인에 상품을 추출할 카테고리를 선택하세요</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4">
              <div className="space-y-0.5">
                <CategoryTreePicker
                  allCategories={allCategories}
                  onSelect={(catId, catName) => addFeaturedWithCategory(catId, catName)}
                />
              </div>
            </div>
            <div className="border-t border-zinc-100 px-6 py-3">
              <button
                onClick={() => setShowCategoryPicker(false)}
                className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시판 선택 모달 (게시판 위젯 추가 시) */}
      {showBoardPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">게시판 선택</h3>
              <p className="mt-1 text-sm text-zinc-500">메인에 추출할 게시판을 선택하세요</p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-3">
              {boards.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400">
                  먼저 게시판을 등록하세요 (관리자 → 게시판 관리)
                </div>
              ) : (
                <ul className="space-y-1">
                  {boards.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => addBoardWidget(b.id, b.name)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50"
                      >
                        <span className="text-sm font-medium text-zinc-900">{b.name}</span>
                        <span className="text-xs text-zinc-400">/{b.slug}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-100 px-6 py-3">
              <button
                onClick={() => setShowBoardPicker(false)}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시판 위젯 편집 모달 */}
      {editingBoardIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingBoardIndex === -1 ? '게시판 위젯 추가' : '게시판 위젯 편집'}
              </h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4">
                {/* 좌측 — 콘텐츠 */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">게시판</label>
                    <select
                      value={boardWidgetBoardId}
                      onChange={(e) => setBoardWidgetBoardId(e.target.value)}
                      className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">제목</label>
                    <div className="rounded-lg border border-zinc-300">
                      <InlineEditor value={boardWidgetLabel} onChange={setBoardWidgetLabel} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">부제 (선택)</label>
                    <div className="rounded-lg border border-zinc-300">
                      <InlineEditor value={boardWidgetSubtitle} onChange={setBoardWidgetSubtitle} />
                    </div>
                  </div>
                </div>
                {/* 우측 — 레이아웃 + 옵션 */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">한 줄에 (개)</label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={boardWidgetPerRow}
                        onChange={(e) => setBoardWidgetPerRow(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">줄 수</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={boardWidgetRows}
                        onChange={(e) => setBoardWidgetRows(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    총 {Math.max(1, boardWidgetPerRow) * Math.max(1, boardWidgetRows)}개 노출 ·{' '}
                    {boardWidgetPerRow > 1 ? '그리드' : '리스트'} 형식
                  </p>
                  <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    {[
                      { key: 'more', label: '더보기 버튼 표시', state: boardWidgetShowMore, set: setBoardWidgetShowMore },
                      { key: 'thumb', label: '썸네일 표시', state: boardWidgetShowThumb, set: setBoardWidgetShowThumb },
                      { key: 'date', label: '작성일 표시', state: boardWidgetShowDate, set: setBoardWidgetShowDate },
                    ].map((opt) => (
                      <label key={opt.key} className="flex cursor-pointer items-center justify-between gap-2 text-sm text-zinc-700">
                        <span>{opt.label}</span>
                        <button
                          type="button"
                          onClick={() => opt.set(!opt.state)}
                          className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition ${
                            opt.state ? 'bg-zinc-900' : 'bg-zinc-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              opt.state ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditingBoardIndex(null)}
                className="flex-1 cursor-pointer rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!boardWidgetBoardId}
                onClick={confirmBoardWidget}
                className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인상품추출 타이틀 설정 모달 */}
      {featuredTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">메인상품추출 설정</h3>
              <p className="mt-1 text-sm text-zinc-500">카테고리, 제목, 더보기 동작을 한 번에 설정하세요</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* 실시간 미리보기 — PC/모바일 탭 토글 */}
              <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">미리보기</span>
                    {/* PC / 모바일 탭 */}
                    <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setFeaturedPreviewTab('pc')}
                        className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition ${
                          featuredPreviewTab === 'pc' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <rect x="3" y="4" width="18" height="12" rx="2" />
                          <path strokeLinecap="round" d="M8 20h8M12 16v4" />
                        </svg>
                        PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedPreviewTab('mobile')}
                        className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition ${
                          featuredPreviewTab === 'mobile' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <rect x="7" y="3" width="10" height="18" rx="2" />
                          <path strokeLinecap="round" d="M11 18h2" />
                        </svg>
                        모바일
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {featuredSortBy === 'created' ? '등록순' : featuredSortBy === 'popular' ? '인기순' : featuredSortBy === 'priceAsc' ? '낮은 가격순' : '높은 가격순'}
                    {' · '}총 {featuredTotalItems}개
                    {' · '}{featuredDisplay === 'slider' ? '슬라이드' : '그리드'}
                  </span>
                </div>

                {featuredPreviewTab === 'pc' ? (
                  /* PC 미리보기 */
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="mb-3 px-0.5">
                      <div className="text-sm font-semibold [&_p]:my-0" dangerouslySetInnerHTML={{ __html: featuredLabel || '<span class="text-zinc-300">타이틀</span>' }} />
                      {featuredSubtitle && (
                        <div className="mt-0.5 text-xs text-zinc-500 [&_p]:my-0" dangerouslySetInnerHTML={{ __html: featuredSubtitle }} />
                      )}
                    </div>
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${featuredPerRow}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: Math.min(featuredTotalItems, featuredPerRow * featuredRows) }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <div className="aspect-square rounded bg-zinc-200" />
                          <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
                          <div className="h-2 w-1/2 rounded-full bg-zinc-300" />
                        </div>
                      ))}
                    </div>
                    {featuredShowMore && (
                      <div className="mt-4 text-center">
                        <span className="inline-block rounded-md border border-zinc-400 px-4 py-1.5 text-xs text-zinc-600">
                          더보기 {featuredMoreAction === 'expand' && '(펼치기)'}
                        </span>
                      </div>
                    )}
                    <p className="mt-3 text-center text-[10px] text-zinc-400">
                      PC · 한 줄 {featuredPerRow}개 × {featuredRows}줄
                    </p>
                  </div>
                ) : (
                  /* 모바일 미리보기 — 폰 프레임 */
                  <div className="flex justify-center py-2">
                    <div className="w-[260px] rounded-3xl border-[6px] border-zinc-300 bg-white p-3 shadow-sm">
                      <div className="mb-2 px-0.5">
                        <div className="text-xs font-semibold [&_p]:my-0" dangerouslySetInnerHTML={{ __html: featuredLabel || '<span class="text-zinc-300">타이틀</span>' }} />
                        {featuredSubtitle && (
                          <div className="mt-0.5 text-[10px] text-zinc-500 [&_p]:my-0" dangerouslySetInnerHTML={{ __html: featuredSubtitle }} />
                        )}
                      </div>
                      <div
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: `repeat(${featuredPerRowMobile}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: Math.min(featuredTotalItems, featuredPerRowMobile * featuredRowsMobile) }).map((_, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="aspect-square rounded bg-zinc-200" />
                            <div className="h-1.5 w-3/4 rounded-full bg-zinc-200" />
                            <div className="h-1.5 w-1/2 rounded-full bg-zinc-300" />
                          </div>
                        ))}
                      </div>
                      {featuredShowMore && (
                        <div className="mt-2.5 text-center">
                          <span className="inline-block rounded border border-zinc-400 px-3 py-1 text-[10px] text-zinc-600">
                            더보기
                          </span>
                        </div>
                      )}
                      <p className="mt-2.5 text-center text-[9px] text-zinc-400">
                        모바일 · 한 줄 {featuredPerRowMobile}개 × {featuredRowsMobile}줄
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* 좌측 — 콘텐츠 + 진열 옵션 */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">카테고리</label>
                    <div className="flex items-center justify-between rounded-lg border border-zinc-300 px-3 py-2">
                      <span className="text-sm text-zinc-800">
                        {allCategories.find((c) => c.id === featuredTitleModal.categoryId)?.name || '카테고리 미선택'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCatPickerInModal((v) => !v)}
                        className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                      >
                        {showCatPickerInModal ? '닫기' : '변경'}
                      </button>
                    </div>
                    {showCatPickerInModal && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                        <CategoryTreePicker
                          allCategories={allCategories}
                          onSelect={(catId, catName) => {
                            setFeaturedTitleModal((m) => (m ? { ...m, categoryId: catId, categoryName: catName } : m))
                            setShowCatPickerInModal(false)
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">타이틀</label>
                    <InlineEditor
                      value={featuredLabel}
                      onChange={setFeaturedLabel}
                      placeholder="예: NEW ARRIVALS"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">서브타이틀</label>
                    <InlineEditor
                      value={featuredSubtitle}
                      onChange={setFeaturedSubtitle}
                      placeholder="예: 새로 입고된 상품을 만나보세요"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">진열 방식</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: 'created', label: '등록순' },
                        { v: 'popular', label: '인기순' },
                        { v: 'priceAsc', label: '낮은 가격순' },
                        { v: 'priceDesc', label: '높은 가격순' },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setFeaturedSortBy(o.v as 'created' | 'popular' | 'priceAsc' | 'priceDesc')}
                          className={`cursor-pointer rounded-lg border px-2 py-2 text-xs font-medium transition ${
                            featuredSortBy === o.v
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">진열 수</label>
                      <select
                        value={featuredTotalItems}
                        onChange={(e) => setFeaturedTotalItems(Number(e.target.value))}
                        className="w-full cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                      >
                        {[4, 8, 12, 16, 20, 24, 28].map((n) => (
                          <option key={n} value={n}>{n}개</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">표시 형태</label>
                      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-zinc-300">
                        <button
                          type="button"
                          onClick={() => setFeaturedDisplay('grid')}
                          className={`cursor-pointer py-2 text-xs font-medium transition ${
                            featuredDisplay === 'grid'
                              ? 'bg-zinc-900 text-white'
                              : 'bg-white text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          그리드
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeaturedDisplay('slider')}
                          className={`cursor-pointer py-2 text-xs font-medium transition ${
                            featuredDisplay === 'slider'
                              ? 'bg-zinc-900 text-white'
                              : 'bg-white text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          슬라이드
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측 — PC/모바일 레이아웃 + 더보기 옵션 */}
                <div className="space-y-4">
                  {/* PC 레이아웃 */}
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path strokeLinecap="round" d="M8 20h8M12 16v4" />
                      </svg>
                      PC
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600">한 줄 갯수</label>
                        <select
                          value={featuredPerRow}
                          onChange={(e) => setFeaturedPerRow(Number(e.target.value))}
                          className="w-full cursor-pointer rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                        >
                          {[2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>{n}개</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600">줄 수</label>
                        <select
                          value={featuredRows}
                          onChange={(e) => setFeaturedRows(Number(e.target.value))}
                          className="w-full cursor-pointer rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}줄</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 모바일 레이아웃 */}
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <rect x="7" y="3" width="10" height="18" rx="2" />
                        <path strokeLinecap="round" d="M11 18h2" />
                      </svg>
                      모바일
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600">한 줄 갯수</label>
                        <select
                          value={featuredPerRowMobile}
                          onChange={(e) => setFeaturedPerRowMobile(Number(e.target.value))}
                          className="w-full cursor-pointer rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n} value={n}>{n}개</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600">줄 수</label>
                        <select
                          value={featuredRowsMobile}
                          onChange={(e) => setFeaturedRowsMobile(Number(e.target.value))}
                          className="w-full cursor-pointer rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>{n}줄</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {featuredDisplay === 'slider' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700">자동 넘김 (초)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={featuredAutoSeconds || ''}
                        onChange={(e) => setFeaturedAutoSeconds(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                        placeholder="0 (자동 넘김 끔)"
                      />
                      <p className="mt-1 text-xs text-zinc-400">
                        {featuredAutoSeconds > 0
                          ? `${featuredAutoSeconds}초마다 자동 전환`
                          : '0이면 자동 넘김 끄기'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
                    <button
                      type="button"
                      onClick={() => setFeaturedShowMore(!featuredShowMore)}
                      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                        featuredShowMore ? 'bg-zinc-900' : 'bg-zinc-300'
                      }`}
                      aria-label="더보기 버튼 표시"
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          featuredShowMore ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">&apos;더보기&apos; 버튼 표시</p>
                      <p className="truncate text-xs text-zinc-400">
                        {featuredShowMore ? '메인에 표시됩니다.' : '표시되지 않습니다.'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">&apos;더보기&apos; 버튼 동작</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFeaturedMoreAction('link')}
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          featuredMoreAction === 'link'
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        카테고리로 이동
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedMoreAction('expand')}
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          featuredMoreAction === 'expand'
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        여기서 더 보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
              <button
                onClick={() => { setFeaturedTitleModal(null); setEditingFeaturedIndex(null); setShowCatPickerInModal(false) }}
                className="flex-1 cursor-pointer rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                onClick={confirmFeaturedTitle}
                className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 카드 편집 모달 */}
      {editingCategoryIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">카테고리 카드 편집</h3>
              <p className="mt-1 text-sm text-zinc-500">이름, 서브이름, 카드를 설정하세요</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {/* 카테고리 이름 / 서브이름 — 가로 2열 */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">카테고리 이름</label>
                  <input
                    type="text"
                    value={categoryLabel}
                    onChange={(e) => setCategoryLabel(e.target.value)}
                    placeholder="예: CATEGORY"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">서브 이름</label>
                  <input
                    type="text"
                    value={categorySubtitle}
                    onChange={(e) => setCategorySubtitle(e.target.value)}
                    placeholder="예: 카테고리별 상품을 만나보세요"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">카드</div>
              <div className="grid grid-cols-2 gap-3">
                {categoryCards.map((card, ci) => (
                  <div key={card.id} className="flex gap-3 rounded-lg border border-zinc-200 p-3">
                    {/* 이미지 */}
                    <div className="flex-shrink-0">
                      <label className="block h-20 w-20 cursor-pointer overflow-hidden rounded-lg bg-zinc-100">
                        {card.image ? (
                          <img src={card.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">이미지</span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setUploadingCardImage(true)
                            const formData = new FormData()
                            formData.set('file', file)
                            const res = await fetch('/api/upload', { method: 'POST', body: formData })
                            const result = await res.json()
                            if (result.url) {
                              setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, image: result.url } : c))
                            }
                            setUploadingCardImage(false)
                          }}
                        />
                      </label>
                    </div>
                    {/* 텍스트 + 링크 */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={card.text}
                        onChange={(e) => setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, text: e.target.value } : c))}
                        placeholder="텍스트"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={card.href}
                        onChange={(e) => setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, href: e.target.value } : c))}
                        placeholder="링크"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    {/* 삭제 */}
                    <button
                      onClick={() => setCategoryCards(prev => prev.filter((_, i) => i !== ci))}
                      className="flex-shrink-0 cursor-pointer text-xs text-red-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                ))}

                {/* 카드 추가 */}
                <button
                  type="button"
                  onClick={() => setCategoryCards(prev => [...prev, {
                    id: `card-${Date.now()}`,
                    image: '',
                    text: '',
                    href: '/',
                  }])}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 py-6 text-sm text-zinc-500 hover:border-zinc-400"
                >
                  + 카드 추가
                </button>
              </div>
            </div>
            <div className="flex gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                onClick={() => setEditingCategoryIndex(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                disabled={uploadingCardImage}
                onClick={() => {
                  const newSections = sections.map((s, i) =>
                    i === editingCategoryIndex
                      ? { ...s, cards: categoryCards, label: categoryLabel, subtitle: categorySubtitle } as CategoriesSectionConfig
                      : s
                  )
                  setEditingCategoryIndex(null)
                  void saveAndRefresh(newSections)
                }}
                className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {uploadingCardImage ? '업로드 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 카드배너 그룹 편집 모달 */}
      {editingCardBannerIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">카드배너 그룹 편집</h3>
              <p className="mt-1 text-sm text-zinc-500">그룹명, 이미지, 텍스트, 링크를 설정하세요</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {/* 그룹명 / 카드 높이 — 가로 2열 */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">그룹명</label>
                  <input
                    type="text"
                    value={cardBannerLabel}
                    onChange={(e) => setCardBannerLabel(e.target.value)}
                    placeholder="예: 신상품, 추천 아이템"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">카드 높이 (px)</label>
                  <input
                    type="number"
                    value={cardBannerHeight}
                    onChange={(e) => setCardBannerHeight(parseInt(e.target.value) || 100)}
                    min={50}
                    max={300}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-400">모바일은 80% 크기로 표시됩니다.</p>
                </div>
              </div>

              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">카드</div>
              <div className="grid grid-cols-2 gap-3">
                {categoryCards.map((card, ci) => (
                  <div key={card.id} className="flex gap-3 rounded-lg border border-zinc-200 p-3">
                    <div className="flex-shrink-0">
                      <label className="block h-20 w-20 cursor-pointer overflow-hidden rounded-lg bg-zinc-100">
                        {card.image ? (
                          <img src={card.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">이미지</span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setUploadingCardImage(true)
                            const formData = new FormData()
                            formData.set('file', file)
                            const res = await fetch('/api/upload', { method: 'POST', body: formData })
                            const result = await res.json()
                            if (result.url) {
                              setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, image: result.url } : c))
                            }
                            setUploadingCardImage(false)
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={card.text}
                        onChange={(e) => setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, text: e.target.value } : c))}
                        placeholder="텍스트"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={card.href}
                        onChange={(e) => setCategoryCards(prev => prev.map((c, i) => i === ci ? { ...c, href: e.target.value } : c))}
                        placeholder="링크"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setCategoryCards(prev => prev.filter((_, i) => i !== ci))}
                      className="flex-shrink-0 cursor-pointer text-xs text-red-400 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCategoryCards(prev => [...prev, {
                    id: `card-${Date.now()}`,
                    image: '',
                    text: '',
                    href: '/',
                  }])}
                  className="cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 py-6 text-sm text-zinc-500 hover:border-zinc-400"
                >
                  + 카드 추가
                </button>
              </div>
            </div>
            <div className="flex gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                onClick={() => setEditingCardBannerIndex(null)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                disabled={uploadingCardImage}
                onClick={() => {
                  let newSections: LayoutSection[]
                  if (editingCardBannerIndex === -1) {
                    // 새로 추가
                    const newSection: CardBannerGroupConfig = {
                      id: generateId(),
                      type: 'cardBannerGroup',
                      visible: true,
                      label: cardBannerLabel,
                      cards: categoryCards,
                      cardHeight: cardBannerHeight,
                    }
                    newSections = [...sections, newSection]
                  } else {
                    newSections = sections.map((s, i) =>
                      i === editingCardBannerIndex
                        ? { ...s, label: cardBannerLabel, cards: categoryCards, cardHeight: cardBannerHeight } as CardBannerGroupConfig
                        : s
                    )
                  }
                  setEditingCardBannerIndex(null)
                  void saveAndRefresh(newSections)
                }}
                className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {uploadingCardImage ? '업로드 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 우측 인증 메뉴 편집 모달 — 「적용」 = 미리보기 draft + 메모리 state */}
      {editingHeaderAuth && (
        <HeaderAuthEditor
          siteId={siteId}
          initialConfig={headerAuthConfig}
          onClose={() => setEditingHeaderAuth(false)}
          onApplied={(next) => {
            setHeaderAuthConfig(next)
            setDirty(true)
            setEditingHeaderAuth(false)
            setPreviewKey((k) => k + 1)
          }}
        />
      )}

      {/* 네비게이션 위젯 편집 모달 */}
      {editingNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">네비게이션 메뉴 편집</h3>
              <p className="mt-1 text-sm text-zinc-500">메인 네비게이션의 폰트와 색상을 설정합니다</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    폰트 크기(px) <span className="text-zinc-400">· 10–24</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={navFontSize}
                    onChange={(e) => setNavFontSize(e.target.value)}
                    onBlur={() => setNavFontSize(String(normalizeNavFontSize(navFontSize)))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">글자색</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={navColor}
                      onChange={(e) => setNavColor(e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-zinc-300"
                    />
                    <input
                      type="text"
                      value={navColor}
                      onChange={(e) => setNavColor(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">호버 색상</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={navHoverColor}
                      onChange={(e) => setNavHoverColor(e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-zinc-300"
                    />
                    <input
                      type="text"
                      value={navHoverColor}
                      onChange={(e) => setNavHoverColor(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
              {/* 실시간 미리보기 */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">미리보기</span>
                <span
                  className="font-bold transition-colors hover:[color:var(--nav-hover)]"
                  style={{
                    fontSize: `${parseInt(navFontSize) || 13}px`,
                    color: navColor,
                    ['--nav-hover' as string]: navHoverColor,
                  }}
                >
                  샘플 메뉴 — 마우스를 올려보세요
                </span>
              </div>
            </div>
            <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditingNav(false)}
                className="flex-1 cursor-pointer rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApplyNavStyle}
                disabled={navSaving}
                title="미리보기에 임시 적용됩니다. 정식 저장은 우하단 「저장」 버튼."
                className="flex-1 cursor-pointer rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {navSaving ? '적용 중…' : '적용'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단순 위젯 편집 모달 (가로선 / 텍스트 / 여백) */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className={`mx-4 max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${
              editingWidget.type === 'text' ? 'max-w-3xl' : 'max-w-2xl'
            }`}
          >
            <div className="border-b border-zinc-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingWidget.type === 'divider' && (editingWidget.idx === -1 ? '가로선 추가' : '가로선 편집')}
                {editingWidget.type === 'text' && (editingWidget.idx === -1 ? '텍스트 추가' : '텍스트 편집')}
                {editingWidget.type === 'spacer' && (editingWidget.idx === -1 ? '여백 추가' : '여백 편집')}
              </h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
              {editingWidget.type === 'divider' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">두께(px)</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={widgetThickness}
                        onChange={(e) => setWidgetThickness(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">상하 여백(px)</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={widgetMarginY}
                        onChange={(e) => setWidgetMarginY(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">선 색상</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-zinc-300"
                      />
                      <input
                        type="text"
                        value={widgetColor}
                        onChange={(e) => setWidgetColor(e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">선 종류</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['solid', 'dashed', 'dotted', 'double', 'dashdot'] as const).map((s) => {
                        const label =
                          s === 'solid' ? '실선'
                          : s === 'dashed' ? '대시'
                          : s === 'dotted' ? '점선'
                          : s === 'double' ? '이중선'
                          : '대시-점'
                        const selected = widgetStyle === s
                        const swatchColor = selected ? '#ffffff' : '#52525b'
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setWidgetStyle(s)}
                            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2.5 text-[11px] transition ${
                              selected
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
                            }`}
                            title={label}
                          >
                            <div className="h-3 w-full">
                              {s === 'dashdot' ? (
                                <div
                                  style={{
                                    height: 2,
                                    marginTop: 4,
                                    backgroundImage: `repeating-linear-gradient(to right, ${swatchColor} 0 8px, transparent 8px 11px, ${swatchColor} 11px 13px, transparent 13px 16px)`,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    borderTop: `${s === 'double' ? 3 : 2}px ${s} ${swatchColor}`,
                                    marginTop: 4,
                                  }}
                                />
                              )}
                            </div>
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">미리보기</div>
                    <div style={{ paddingTop: widgetMarginY, paddingBottom: widgetMarginY }}>
                      {widgetStyle === 'dashdot' ? (
                        <div
                          style={{
                            height: widgetThickness,
                            backgroundImage: `repeating-linear-gradient(to right, ${widgetColor} 0 10px, transparent 10px 14px, ${widgetColor} 14px 16px, transparent 16px 20px)`,
                          }}
                        />
                      ) : (
                        <hr style={{ border: 'none', borderTop: `${widgetThickness}px ${widgetStyle} ${widgetColor}`, margin: 0 }} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {editingWidget.type === 'text' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">내용</label>
                    <div className="rounded-lg border border-zinc-300">
                      <InlineEditor value={widgetHtml} onChange={setWidgetHtml} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">정렬</label>
                      <div className="inline-flex w-full overflow-hidden rounded-lg border border-zinc-300">
                        {(['left', 'center', 'right'] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setWidgetAlign(a)}
                            className={`flex-1 cursor-pointer py-2 text-xs font-medium ${
                              widgetAlign === a ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            {a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : '오른쪽'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">상하 여백(px)</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={widgetMarginY}
                        onChange={(e) => setWidgetMarginY(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingWidget.type === 'spacer' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">높이(px)</label>
                    <input
                      type="number"
                      min={4}
                      max={400}
                      value={widgetHeight}
                      onChange={(e) => setWidgetHeight(parseInt(e.target.value) || 4)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">미리보기</div>
                    <div className="rounded bg-blue-100" style={{ height: widgetHeight }} />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditingWidget(null)}
                className="flex-1 cursor-pointer rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveWidget}
                className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 라벨에 HTML이 들어있어도 태그를 벗겨 텍스트만 표시
function stripHtml(s?: string) {
  return (s || '').replace(/<[^>]*>/g, '').trim()
}

/* ── 카테고리 트리 피커 (접기/펼치기) ── */

function CategoryTreePicker({
  allCategories,
  onSelect,
}: {
  allCategories: CategoryOption[]
  onSelect: (catId: string, catName: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getChildren = (parentId: string) => allCategories.filter((c) => c.parent_id === parentId)
  const level1 = allCategories.filter((c) => c.level === 1)

  const renderCat = (cat: CategoryOption, depth: number) => {
    const children = getChildren(cat.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(cat.id)

    return (
      <div key={cat.id}>
        <div className="flex items-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-600"
              style={{ marginLeft: `${depth * 20}px` }}
            >
              <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span style={{ marginLeft: `${depth * 20 + 24}px` }} />
          )}
          <button
            type="button"
            onClick={() => onSelect(cat.id, cat.name)}
            className="flex flex-1 items-center rounded-lg px-2 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
          >
            <span className={depth === 0 ? 'font-bold' : depth === 1 ? 'font-medium' : ''}>
              {cat.name}
            </span>
            <span className="ml-2 text-[10px] text-zinc-400">{cat.level}차</span>
          </button>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderCat(child, depth + 1))}
      </div>
    )
  }

  return <>{level1.map((cat) => renderCat(cat, 0))}</>
}
