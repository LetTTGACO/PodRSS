# Podcast RSS 每日播报

一个基于 AI 的 RSS 中文播客项目，每天自动抓取你感兴趣的 RSS 更新内容，通过 AI 生成中文总结并转换为播客内容。

---

预览地址: <https://podrss.1874.cool>

订阅地址: <https://podrss.1874.cool/rss.xml>

博客版订阅地址: <https://podrss.1874.cool/blog.xml>

## 主要特性

- 🤖 自动抓取 你感兴趣的 RSS 每日更新文章
- 🎯 使用 AI 智能总结文章内容和评论
- 🎙️ 通过 Edge TTS 生成中文播报
- 📱 支持网页和播客 App 收听
- 🔄 每日自动更新
- 📝 提供文章摘要和完整播报文本

## 技术栈

- Next.js 应用框架
- Cloudflare Workers 部署和运行环境
- Edge TTS 语音合成
- OpenAI API 内容生成
- Tailwind CSS 样式处理
- shadcn UI 组件库

## 工作流程

1. 定时抓取 RSS 每日更新文章
2. 使用 AI 生成中文摘要和播报文稿
3. 通过 Edge TTS 转换为音频
4. 存储到 Cloudflare R2 和 KV
5. 通过 RSS feed 和网页提供访问

## 感谢
感谢 [hacker-news](https://github.com/ccbikai/hacker-news) 提供灵感
