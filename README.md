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

## 本地开发

1. 安装依赖:

```bash
pnpm install
```

2. 配置环境变量:

```bash
# .dev.vars
NEXTJS_ENV=development
NEXT_STATIC_HOST=http://localhost:3000/static
JINA_KEY=
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
```

3. 启动开发服务器:

```bash
# 开发工作流
# 本地调试可能会出现 wrangler调试工具出问题，建议在 for 循环中执行流水线时，可以部署后看效果，具体可参见以下 issue
# https://github.com/cloudflare/workerd/issues/3248
pnpm opennext
pnpm dev:workflow
# curl "http://localhost:8787/workflow" # 手动触发工作流

# 开发 Web 页面
# 注释掉wrangler.json中的 workflows配置，然后运行
pnpm dev
```

## 部署

项目使用 Cloudflare Workers 部署:

1. 创建 R2 文件存储桶, 绑定域名后，修改 `NEXT_STATIC_HOST` 变量。
2. 创建 KV 存储空间`NEXT_CACHE_WORKERS_KV`
3. 修改 `wrangler.json` 中 KV 和 R2 的值
4. wrangler 配置环境变量

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put OPENAI_BASE_URL
wrangler secret put OPENAI_MODEL # 模型名称，如 gpt-3.5-turbo
wrangler secret put NEXT_STATIC_HOST # 绑定域名后，修改为绑定域名
wrangler secret put NEXTJS_ENV # development or production
# WECHAT_WEBHOOK 为微信公众号 WxPusher 消息推送平台

```

```bash
# 记得恢复注释：wrangler.json中的 workflows配置
pnpm deploy
```

## 贡献

欢迎提交 Issue 和 Pull Request!

## 感谢

- 感谢 [hacker-news](https://github.com/ccbikai/hacker-news) 提供灵感
