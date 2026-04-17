import { getAllCategoriesFlat } from '../actions'
import { ProductForm } from '@/components/admin/product-form'

export const metadata = { title: '상품 등록' }

export default async function NewProductPage() {
  const categories = await getAllCategoriesFlat()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">상품 등록</h1>
      <ProductForm categories={categories} />
    </div>
  )
}
