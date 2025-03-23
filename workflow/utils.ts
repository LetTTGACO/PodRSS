import type { Item } from 'rss-parser'
import dayjs from 'dayjs'
import Parser from 'rss-parser'
import TurndownService from 'turndown'
// 创建 HTML 到 Markdown 的转换器
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
})

// 创建 RSS 解析器
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['content:encodedSnippet', 'contentSnippet'],
    ],
  },
  // 修改后的请求配置
  defaultParserOptions: {
    headers: {
      'User-Agent': 'PodRSS/1.0 (+https://1874.cool)',
    },
    timeout: 15000,
    maxContentLength: 50 * 1024 * 1024, // 50MB
  },
} as Parser.ParserOptions<any, any>)

// 重写自定义请求函数
// eslint-disable-next-line node/prefer-global/buffer
async function customRequest(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    // @ts-ignore
    headers: parser.options.headers,
  })

  if (!response.ok)
    throw new Error(`HTTP ${response.status} - ${response.statusText}`)

  // eslint-disable-next-line node/prefer-global/buffer
  return Buffer.from(await response.arrayBuffer())
}

// 创建解析器时注入自定义请求方法
parser.parseURL = async (url: string) => {
  const xml = await customRequest(url)
  return parser.parseString(xml.toString())
}

// 判断文章是否为指定日期发布
function isPublishedOnDate(targetDate: string, pubDate?: string) {
  if (!pubDate)
    return false

  const articleDate = dayjs(pubDate).startOf('day')
  return articleDate.isSame(targetDate)
}

// 从文章中提取内容
function extractContent(item: any) {
  // 尝试从不同字段获取内容
  let content
    = item.contentSnippet
      || item['content:encodedSnippet']
      || item.contentEncoded
      || item['content:encoded']
      || item.content
      || item.description
      || item.summary
      || ''

  // 如果内容看起来像 HTML，则转换为 Markdown
  if (content.includes('<') && content.includes('>')) {
    content = turndownService.turndown(content)
  }

  return content
}

// 解析单个 RSS 源
export async function parseRssFeed(url: string, targetDate: string) {
  try {
    const feed: Parser.Output<Item> = await parser.parseURL(url)
    const filteredItems = feed.items.filter(item =>
      isPublishedOnDate(targetDate, item.pubDate || item.isoDate),
    )

    return filteredItems
      .map(item => ({
        title: item.title || '无标题',
        content: extractContent(item),
        id: item.guid,
        url: item.link,
      }))
      .filter(item => item.content.trim())
  }
  catch (error: any) {
    console.error(`解析 RSS 源 ${url} 时出错:`, error.message)
    return []
  }
}

// 解析多个 RSS 源并汇总结果
export async function parseMultipleFeeds(
  urls: string[],
  targetDate: string,
) {
  const allPromises = urls.map(url => parseRssFeed(url, targetDate))
  const results = await Promise.all(allPromises)

  // 扁平化结果数组
  return results.flat()
}

// 格式化文章为
export function formatArticle(article: any) {
  return [
    article.title
      ? `
<title>
${article.title}
</title>
`
      : '',
    article.content
      ? `
<article>
${article.content}
</article>
`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')
}
