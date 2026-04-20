import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH

  if (!accountId || !apiToken || !accountHash) {
    return NextResponse.json({ error: 'Cloudflare 설정이 없습니다.' }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file || file.size === 0) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
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
    return NextResponse.json({ error: '이미지 업로드 중 오류가 발생했습니다.' }, { status: 500 })
  }

  const imageId = data.result.id
  const url = `https://imagedelivery.net/${accountHash}/${imageId}/public`

  return NextResponse.json({ url })
}

export async function DELETE(request: Request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_ACCOUNT_HASH

  if (!accountId || !apiToken || !accountHash) {
    return NextResponse.json({ error: 'Cloudflare 설정이 없습니다.' }, { status: 500 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL이 없습니다.' }, { status: 400 })
  }

  // URL에서 imageId 추출 (슬래시 포함 가능: 206/desc-16)
  const hashPos = url.indexOf(accountHash)
  if (hashPos === -1) {
    return NextResponse.json({ error: '유효하지 않은 이미지 URL' }, { status: 400 })
  }
  let imageId = url.slice(hashPos + accountHash.length + 1)
  imageId = imageId.replace(/\/public$/, '').replace(/\/[a-zA-Z]+$/, '')
  if (!imageId) {
    return NextResponse.json({ error: '이미지 ID를 추출할 수 없습니다.' }, { status: 400 })
  }

  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiToken}` },
    }
  )

  return NextResponse.json({ ok: true })
}
