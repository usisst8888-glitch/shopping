import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single()

  return { title: data?.name ?? '상품' }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  const { data: relations } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', id)

  let categories: { id: string; name: string }[] = []
  if (relations && relations.length > 0) {
    const catIds = relations.map((r) => r.category_id)
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', catIds)
    categories = data ?? []
  }

  const allImages = [
    ...(product.thumbnail_url ? [product.thumbnail_url] : []),
    ...((product.sub_images as string[]) ?? []),
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* 이미지 갤러리 */}
        <div>
          {allImages.length > 0 ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl bg-zinc-100">
                <img
                  src={allImages[0]}
                  alt={product.name}
                  className="w-full object-cover"
                />
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {allImages.slice(1).map((url, idx) => (
                    <div
                      key={idx}
                      className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200"
                    >
                      <img
                        src={url}
                        alt={`${product.name} ${idx + 2}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
              이미지 준비중
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div>
          {categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-200"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>

          <p className="mt-4 text-3xl font-bold text-zinc-900">
            {product.price.toLocaleString()}원
          </p>

          {product.summary && (
            <div
              className="mt-6 text-sm leading-relaxed text-zinc-600"
              dangerouslySetInnerHTML={{ __html: product.summary }}
            />
          )}

          <div className="mt-8 flex gap-3">
            <button className="flex-1 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800">
              구매하기
            </button>
            <button className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              장바구니
            </button>
          </div>
        </div>
      </div>

      {/* 상세 설명 */}
      {product.description && (
        <div className="mt-16 border-t border-zinc-200 pt-12">
          <h2 className="mb-6 text-lg font-bold text-zinc-900">상세 정보</h2>
          <div
            className="prose max-w-none text-zinc-700"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  )
}
