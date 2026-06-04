import { NextRequest, NextResponse } from 'next/server'
import { getVideoUploadUrl } from '@/lib/cloudflare-r2'

export async function POST(req: NextRequest) {
  const { fileName, contentType } = await req.json()

  const result = await getVideoUploadUrl(fileName, contentType)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: result.signedUrl,
    publicUrl: result.publicUrl,
  })
}
