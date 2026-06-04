import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'video'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export async function getVideoUploadUrl(fileName: string, contentType: string) {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
    return { error: 'R2 설정이 없습니다.' }
  }

  const ext = fileName.split('.').pop() || 'mp4'
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const signedUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'video/mp4',
    }),
    { expiresIn: 3600 }
  )

  const publicUrl = `${R2_PUBLIC_URL}/${key}`
  return { signedUrl, publicUrl }
}
