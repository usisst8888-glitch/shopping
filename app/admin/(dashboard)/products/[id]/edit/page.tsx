import { notFound } from 'next/navigation'
import { getAllCategoriesFlat, getProduct } from '../../actions'
import { ProductForm } from '@/components/admin/product-form'

export const metadata = { title: '상품 수정' }

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    getProduct(id),
    getAllCategoriesFlat(),
  ])

  if (!product) notFound()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">상품 수정</h1>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          summary: product.summary,
          description: product.description,
          price: product.price,
          thumbnail_url: product.thumbnail_url,
          sub_images: product.sub_images,
          category_ids: product.category_ids,
          is_active: product.is_active,
        }}
      />
    </div>
  )
}
