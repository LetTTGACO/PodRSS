import { keepDays, podcastDescription, podcastTitle } from '@/config'
import { getPastDays } from '@/lib/utils'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import markdownit from 'markdown-it'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { Podcast } from 'podcast'

const md = markdownit()

export const revalidate = 300

export async function GET() {
  const headersList = await headers()
  const host = headersList.get('host')

  const feed = new Podcast({
    title: podcastTitle,
    description: podcastDescription,
    feedUrl: `https://${host}/blog.xml`,
    siteUrl: `https://${host}`,
    imageUrl: `https://${host}/logo.jpg`,
    language: 'zh-CN',
    pubDate: new Date(),
    ttl: 60,
    generator: podcastTitle,
    author: podcastTitle,
    categories: ['technology', 'news'],
  })

  const { env } = getCloudflareContext()
  const runEnv = env.NEXTJS_ENV
  const pastDays = getPastDays(keepDays)
  const posts = (await Promise.all(
    pastDays.map(async (day) => {
      const post = await env.POD_RSS_KV.get(`content:${runEnv}:podcast-rss:${day}`, 'json')
      return post as unknown as Article
    }),
  )).filter(Boolean)

  for (const post of posts) {
    const audioInfo = await env.POD_RSS_R2.head(post.audio)

    feed.addItem({
      title: post.title || '',
      description: post.introContent || post.podcastContent || '',
      content: md.render(post.blogContent || ''),
      url: `https://${host}/post/${post.date}`,
      guid: `https://${host}/post/${post.date}`,
      date: new Date(post.updatedAt || post.date),
      enclosure: {
        url: `${env.NEXT_STATIC_HOST}/${post.audio}?t=${post.updatedAt}`,
        type: 'audio/mpeg',
        size: audioInfo?.size,
      },
    })
  }

  return new NextResponse(feed.buildXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `public, max-age=${revalidate}, s-maxage=${revalidate}`,
    },
  })
}
