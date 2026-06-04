'use client'

import { useState } from 'react'
import type { Banner, SiteDesign, LayoutSection } from '@/lib/types/design'
import { LayoutManager } from './layout-manager'
import { BannerManager } from './banner-manager'
import { DesignManager } from './design-manager'
import { ProductDetailFixedManager } from './product-detail-fixed-manager'

type Tab = 'layout' | 'banners' | 'design' | 'product-detail'

const tabs: { key: Tab; label: string }[] = [
  { key: 'layout', label: '레이아웃' },
  { key: 'banners', label: '배너 관리' },
  { key: 'design', label: '디자인 설정' },
  { key: 'product-detail', label: '상품상세 고정' },
]

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

export function DesignTabs({
  siteId,
  design,
  banners,
  layout,
  categories,
  boards,
}: {
  siteId: string
  design: SiteDesign | null
  banners: Banner[]
  layout: LayoutSection[]
  categories: CategoryOption[]
  boards: BoardOption[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('layout')

  return (
    <div className="space-y-6 pb-40">
      {/* 탭 */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      {activeTab === 'layout' && (
        <LayoutManager siteId={siteId} layout={layout} banners={banners} categories={categories} boards={boards} design={design} />
      )}
      {activeTab === 'banners' && (
        <BannerManager banners={banners} siteId={siteId} />
      )}
      {activeTab === 'design' && (
        <DesignManager siteId={siteId} design={design} categories={categories} boards={boards} />
      )}
      {activeTab === 'product-detail' && (
        <ProductDetailFixedManager siteId={siteId} design={design} />
      )}
    </div>
  )
}
