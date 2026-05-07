import Link from 'next/link'
import { getProducts, getAllCategoriesFlat } from './actions'
import { ProductTable } from '@/components/admin/product-table'
import { CategorySidebar } from '@/components/admin/category-sidebar'

export const metadata = { title: '상품 관리' }

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    size?: string
    search?: string
    status?: string
    category?: string
  }>
}) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1') || 1
  const size = parseInt(params.size ?? '20') || 20
  const search = params.search ?? ''
  const status = (params.status ?? 'all') as 'all' | 'active' | 'hidden'
  const categoryId = params.category ?? ''

  const [{ products, total }, categories] = await Promise.all([
    getProducts({ page, size, search, status, categoryId }),
    getAllCategoriesFlat(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / size))
  const sizeOptions = [20, 50, 100]

  function buildUrl(overrides: Record<string, string | number>) {
    const p = new URLSearchParams()
    const merged = {
      page: String(page),
      size: String(size),
      search,
      status,
      category: categoryId,
      ...Object.fromEntries(
        Object.entries(overrides).map(([k, v]) => [k, String(v)]),
      ),
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '1' && k !== 'page') {
        p.set(k, v)
      } else if (k === 'page' && v !== '1') {
        p.set(k, v)
      }
    }
    const qs = p.toString()
    return `/admin/products${qs ? `?${qs}` : ''}`
  }

  const maxButtons = 5
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2))
  const endPage = Math.min(totalPages, startPage + maxButtons - 1)
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1)
  }
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">상품 관리</h1>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          상품 등록
        </Link>
      </div>

      <div className="flex gap-6">
        {/* 왼쪽: 카테고리 사이드바 */}
        <CategorySidebar categories={categories} currentCategoryId={categoryId} />

        {/* 오른쪽: 상품 목록 */}
        <div className="flex-1 min-w-0">
          {/* 필터 바 */}
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <form method="GET" action="/admin/products" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="size" value={size} />
              {categoryId && <input type="hidden" name="category" value={categoryId} />}

              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-500">상품 검색</label>
                <input
                  name="search"
                  type="text"
                  defaultValue={search}
                  placeholder="상품명으로 검색..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">상태</label>
                <select
                  name="status"
                  defaultValue={status}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="all">전체</option>
                  <option value="active">판매중</option>
                  <option value="soldout">품절</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                검색
              </button>

              {(search || status !== 'all') && (
                <Link
                  href={categoryId ? `/admin/products?category=${categoryId}` : '/admin/products'}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  초기화
                </Link>
              )}
            </form>
          </div>

          {/* 결과 정보 + 개수 선택 */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              총 <span className="font-medium text-zinc-900">{total.toLocaleString()}</span>개
              {total > 0 && (
                <span className="ml-1">
                  ({(page - 1) * size + 1}~{Math.min(page * size, total)})
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {sizeOptions.map((s) => (
                <Link
                  key={s}
                  href={buildUrl({ size: s, page: 1 })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    size === s
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {s}개
                </Link>
              ))}
            </div>
          </div>

          {/* 상품 테이블 */}
          {products.length === 0 ? (
            <div className="rounded-xl bg-white py-16 text-center shadow-sm">
              <p className="text-zinc-400">
                {search || status !== 'all' || categoryId
                  ? '검색 결과가 없습니다.'
                  : '등록된 상품이 없습니다.'}
              </p>
              {!search && status === 'all' && !categoryId && (
                <Link
                  href="/admin/products/new"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  첫 상품을 등록해보세요
                </Link>
              )}
            </div>
          ) : (
            <ProductTable
              products={products as any}
              total={total}
              page={page}
              size={size}
            />
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1">
              <Link href={buildUrl({ page: 1 })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&laquo;</Link>
              <Link href={buildUrl({ page: Math.max(1, page - 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === 1 ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&lsaquo;</Link>
              {pageNumbers.map((p) => (
                <Link key={p} href={buildUrl({ page: p })} className={`rounded-lg px-3 py-2 text-sm font-medium ${p === page ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{p}</Link>
              ))}
              <Link href={buildUrl({ page: Math.min(totalPages, page + 1) })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&rsaquo;</Link>
              <Link href={buildUrl({ page: totalPages })} className={`rounded-lg px-3 py-2 text-sm ${page === totalPages ? 'pointer-events-none text-zinc-300' : 'text-zinc-600 hover:bg-zinc-100'}`}>&raquo;</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
