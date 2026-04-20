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
