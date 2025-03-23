import type {
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from 'cloudflare:workers'
import { podcastTitle } from '@/config'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { synthesize } from '@echristian/edge-tts'
import { generateText } from 'ai'
import { WorkflowEntrypoint } from 'cloudflare:workers'
import dayjs from 'dayjs'
import {
  introPrompt,
  summarizeBlogPrompt,
  summarizePodcastPrompt,
  summarizeStoryPrompt,
} from './prompt'
import { formatArticle, parseRssFeed } from './utils'

interface Params {
  today?: string
}

const retryConfig: WorkflowStepConfig = {
  retries: {
    limit: 5,
    delay: '10 seconds',
    backoff: 'exponential',
  },
  timeout: '3 minutes',
}

export class PodRSSWorkflow extends WorkflowEntrypoint<CloudflareEnv, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    try {
      const runEnv = this.env.NEXTJS_ENV || 'production'
      const isDev = runEnv === 'development'
      const today = event.payload.today || dayjs().startOf('day').format('YYYY-MM-DD')
      // const today = '2025-03-21'
      const rssList = [
        'https://lutaonan.com/rss.xml',
        'https://blog.ursb.me/feed.xml',
        'https://www.ruanyifeng.com/blog/atom.xml',
        'https://luolei.org/rss',
        'https://cprss.s3.amazonaws.com/javascriptweekly.com.xml',
        'https://cprss.s3.amazonaws.com/frontendfoc.us.xml',
        'https://web-design-weekly.com/feed/',
        'https://cprss.s3.amazonaws.com/react.statuscode.com.xml',
        'https://cprss.s3.amazonaws.com/nodeweekly.com.xml',
      ]

      if (!rssList.length) {
        throw new Error('no rssList found')
      }

      const openai = createOpenAICompatible({
        name: 'openai',
        baseURL: this.env.OPENAI_BASE_URL!,
        headers: {
          Authorization: `Bearer ${this.env.OPENAI_API_KEY!}`,
        },
      })
      const maxTokens = Number.parseInt(this.env.OPENAI_MAX_TOKENS || '4096')

      const completeStories: any[] = []

      for (const rss of rssList) {
        const story = await step.do(
          `get rss contents ${today}`,
          retryConfig,
          async () => {
            return await parseRssFeed(rss, today)
          },
        )
        console.info('story', story)
        completeStories.push(story)
      }

      const stories = completeStories.flat()

      if (!stories.length) {
        throw new Error('no stories found')
      }

      stories.length = Math.min(stories.length, isDev ? 10 : 10)
      console.info('top stories', isDev ? stories : JSON.stringify(stories))

      const allStories: string[] = []

      for (const story of stories) {
        const storyResponse = formatArticle(story)
        const text = await step.do(
          `summarize story: ${story.title}`,
          retryConfig,
          async () => {
            const { text, usage, finishReason } = await generateText({
              model: openai(this.env.OPENAI_MODEL!),
              system: summarizeStoryPrompt,
              prompt: storyResponse,
            })

            console.info(`get story ${story.id} summary success`, {
              text,
              usage,
              finishReason,
            })
            return text
          },
        )

        allStories.push(text)

        await step.sleep('Give AI a break', isDev ? '2 seconds' : '10 seconds')
      }

      const podcastContent = await step.do(
        'create podcast content',
        retryConfig,
        async () => {
          const { text, usage, finishReason } = await generateText({
            model: openai(this.env.OPENAI_MODEL!),
            system: summarizePodcastPrompt,
            prompt: allStories.join('\n\n---\n\n'),
            maxTokens,
            maxRetries: 3,
          })

          console.info(`create hacker news podcast content success`, {
            text,
            usage,
            finishReason,
          })

          return text
        },
      )

      console.info(
        'podcast content:\n',
        isDev ? podcastContent : podcastContent.slice(0, 100),
      )

      await step.sleep('Give AI a break', isDev ? '2 seconds' : '10 seconds')

      const blogContent = await step.do(
        'create blog content',
        retryConfig,
        async () => {
          const { text, usage, finishReason } = await generateText({
            model: openai(this.env.OPENAI_MODEL!),
            system: summarizeBlogPrompt,
            prompt: allStories.join('\n\n---\n\n'),
            maxTokens,
            maxRetries: 3,
          })

          console.info(`create hacker news daily blog content success`, {
            text,
            usage,
            finishReason,
          })

          return text
        },
      )

      console.info(
        'blog content:\n',
        isDev ? blogContent : blogContent.slice(0, 100),
      )

      await step.sleep('Give AI a break', isDev ? '2 seconds' : '10 seconds')

      const introContent = await step.do(
        'create intro content',
        retryConfig,
        async () => {
          const { text, usage, finishReason } = await generateText({
            model: openai(this.env.OPENAI_MODEL!),
            system: introPrompt,
            prompt: podcastContent,
            maxRetries: 3,
          })

          console.info(`create intro content success`, {
            text,
            usage,
            finishReason,
          })

          return text
        },
      )

      const contentKey = `content:${runEnv}:podcast-rss:${today}`
      const podcastKey = `${today.replaceAll('-', '/')}/${runEnv}/podcast-rss-${today}.mp3`

      await step.do(
        'create podcast audio',
        { ...retryConfig, timeout: '5 minutes' },
        async () => {
          const { audio } = await synthesize({
            text: podcastContent,
            language: 'zh-CN',
            voice: this.env.AUDIO_VOICE_ID || 'zh-CN-XiaoxiaoNeural',
            rate: this.env.AUDIO_SPEED || '10%',
          })

          await this.env.POD_RSS_R2.put(podcastKey, audio)

          const podcast = await this.env.POD_RSS_R2.head(podcastKey)

          if (!podcast || podcast.size < audio.size) {
            throw new Error('podcast not found')
          }

          return 'OK'
        },
      )

      console.info('save podcast to r2 success')

      await step.do('save content to kv', retryConfig, async () => {
        await this.env.POD_RSS_KV.put(
          contentKey,
          JSON.stringify({
            date: today,
            title: `${podcastTitle} ${today}`,
            stories,
            podcastContent,
            blogContent,
            introContent,
            audio: podcastKey,
            updatedAt: Date.now(),
          }),
        )

        return 'OK'
      })

      console.info('save content to kv success')
      await step.do('send message to wechat', retryConfig, async () => {
        await fetch(`${this.env.WECHAT_WEBHOOK}HackNews每日播报生成成功`).catch()
        return 'OK'
      })
    }
    catch (error: any) {
      await step.do('send message to wechat', retryConfig, async () => {
        await fetch(`${this.env.WECHAT_WEBHOOK}HackNews每日播报生成失败`).catch()
        return 'OK'
      })
      throw error
    }
  }
}
