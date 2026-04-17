import { getCategories } from './actions'
import { CategoryManager } from './category-manager'

export const metadata = { title: '카테고리 관리' }

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">카테고리 관리</h1>
      <CategoryManager initialCategories={categories} />
    </div>
  )
}
