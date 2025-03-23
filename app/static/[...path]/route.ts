import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const { env } = getCloudflareContext()

  const file = await env.POD_RSS_KV.get(path.join('/'))
  return new Response(file?.body)
}
