export const PRICE_INQUIRY_LABEL = '가격문의'

/**
 * 상품 가격 표시 헬퍼.
 * - 0 또는 음수: "가격문의" 텍스트로 표시
 * - 그 외: 천 단위 콤마 + "원"
 */
export function formatProductPrice(price: number): string {
  if (!price || price <= 0) return PRICE_INQUIRY_LABEL
  return `${price.toLocaleString()}원`
}
