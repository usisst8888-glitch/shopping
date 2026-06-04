export async function deleteFromCloudflare(imageUrl: string): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH

  if (!accountId || !apiToken || !accountHash) {
    console.error('Cloudflare 환경변수 없음')
    return
  }

  if (!imageUrl.includes('imagedelivery.net')) return

  // URL에서 imageId 추출
  // 형식: https://imagedelivery.net/{hash}/{imageId}/public
  // imageId에 슬래시가 포함될 수 있음 (예: 206/desc-16)
  const hashPos = imageUrl.indexOf(accountHash)
  if (hashPos === -1) return

  let afterHash = imageUrl.slice(hashPos + accountHash.length + 1) // +1 for /
  // 끝의 /public 또는 /variant 제거
  afterHash = afterHash.replace(/\/public$/, '').replace(/\/[a-zA-Z]+$/, '')
  const imageId = afterHash
  if (!imageId) return

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  ).catch(() => null)

  if (res) {
    const data = await res.json().catch(() => null)
    if (!data?.success) {
      console.error('Cloudflare 이미지 삭제 실패:', imageId, data)
    }
  }
}

/**
 * 기존 Cloudflare Images URL을 새 이미지로 복제한다.
 * - imagedelivery.net 출처: Cloudflare 의 url 모드가 자기 도메인 fetch 를 막으므로
 *   서버 사이드에서 직접 fetch → blob → file 로 업로드.
 * - 외부 URL: Cloudflare 의 url 모드 사용 (Cloudflare 가 직접 fetch).
 * - 외부 URL이 아니고 cloudflare 도 아닌 그냥 string: 그대로 반환.
 */
export async function copyCloudflareImage(sourceUrl: string): Promise<{ url?: string; error?: string }> {
  if (!sourceUrl) return { url: sourceUrl }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH
  if (!accountId || !apiToken || !accountHash) {
    return { error: 'Cloudflare 설정이 없습니다.' }
  }

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`
  const headers = { Authorization: `Bearer ${apiToken}` }
  const buildPublicUrl = (id: string) => `https://imagedelivery.net/${accountHash}/${id}/public`

  const isOwnDomain = sourceUrl.includes('imagedelivery.net')

  // 외부 URL은 url 모드(Cloudflare 가 fetch)로 먼저 시도
  if (!isOwnDomain) {
    try {
      const fd = new FormData()
      fd.append('url', sourceUrl)
      const res = await fetch(apiUrl, { method: 'POST', headers, body: fd })
      const data = await res.json().catch(() => null)
      if (data?.success && data.result?.id) {
        return { url: buildPublicUrl(data.result.id) }
      }
    } catch {
      // url 모드 실패 시 아래 fallback 으로
    }
  }

  // 우리가 직접 fetch 후 file 로 업로드
  try {
    const imgRes = await fetch(sourceUrl)
    if (!imgRes.ok) {
      return { error: `원본 fetch 실패 (${imgRes.status})` }
    }
    const blob = await imgRes.blob()
    const contentType = blob.type || 'image/jpeg'
    const ext = contentType.split('/')[1] ?? 'jpg'
    const file = new File([blob], `copy.${ext}`, { type: contentType })

    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(apiUrl, { method: 'POST', headers, body: fd })
    const data = await res.json().catch(() => null)
    if (data?.success && data.result?.id) {
      return { url: buildPublicUrl(data.result.id) }
    }
    return { error: `업로드 실패: ${JSON.stringify(data?.errors ?? data)}` }
  } catch (e) {
    return { error: `예외: ${(e as Error).message}` }
  }
}

export async function uploadToCloudflare(file: File): Promise<{ url?: string; error?: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH

  if (!accountId || !apiToken || !accountHash) {
    return { error: 'Cloudflare 설정이 없습니다.' }
  }

  const cfFormData = new FormData()
  cfFormData.append('file', file)

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: cfFormData,
    }
  )

  const data = await res.json()

  if (!data.success) {
    return { error: '이미지 업로드 중 오류가 발생했습니다.' }
  }

  const imageId = data.result.id
  const url = `https://imagedelivery.net/${accountHash}/${imageId}/public`

  return { url }
}
