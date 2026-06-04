import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://761499a6977eb31b0977457eacd1ecdf.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'd083fffe6ac520abdea8f1deaf383b0a',
    secretAccessKey: '9e9495baaaadec0702b2133ece64fe196fd6334c25a73259bfc09400852f358d',
  },
})

async function main() {
  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: 'video',
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedHeaders: ['*'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  )
  console.log('R2 CORS 설정 완료!')
}

main().catch(console.error)
