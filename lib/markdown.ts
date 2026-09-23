import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import rehypeStringify from 'rehype-stringify'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { Element, Root } from 'hast'

/** 媒体链接转换：音视频链接 → 原生播放器；外链新窗口打开；图片懒加载 */
function rehypeMedia() {
  const VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i
  const AUDIO = /\.(mp3|wav|ogg|m4a)(\?.*)?$/i

  const walk = (node: Root | Element) => {
    if (!('children' in node)) return
    for (const child of node.children) {
      if (child.type !== 'element') continue
      const el = child as Element
      const href = String(el.properties?.href ?? '')

      if (el.tagName === 'a' && href) {
        if (VIDEO.test(href)) {
          el.tagName = 'video'
          el.properties = {
            src: href,
            controls: true,
            preload: 'metadata',
            className: ['w-full', 'rounded-lg'],
          }
        } else if (AUDIO.test(href)) {
          el.tagName = 'audio'
          el.properties = {
            src: href,
            controls: true,
            preload: 'metadata',
            className: ['w-full'],
          }
        } else if (/^https?:\/\//.test(href)) {
          el.properties.target = '_blank'
          el.properties.rel = ['noopener', 'noreferrer']
        }
      }

      if (el.tagName === 'img') {
        el.properties.loading = 'lazy'
        el.properties.className = [
          ...((el.properties.className as string[]) ?? []),
          'max-w-full',
          'h-auto',
          'rounded-lg',
        ]
      }

      walk(el)
    }
  }

  return (tree: Root) => walk(tree)
}

// 精简语言集：仅打包常用语言以适配 Cloudflare Workers 免费版 3MB 限制。
// 未列出的语言（如 php、swift、lua）会回退为纯文本渲染；如需支持，在此追加对应 import 即可。
const LANGS = [
  import('@shikijs/langs/javascript'),
  import('@shikijs/langs/typescript'),
  import('@shikijs/langs/jsx'),
  import('@shikijs/langs/tsx'),
  import('@shikijs/langs/html'),
  import('@shikijs/langs/css'),
  import('@shikijs/langs/scss'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/yaml'),
  import('@shikijs/langs/toml'),
  import('@shikijs/langs/markdown'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/python'),
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/go'),
  import('@shikijs/langs/rust'),
  import('@shikijs/langs/java'),
  import('@shikijs/langs/c'),
  import('@shikijs/langs/cpp'),
  import('@shikijs/langs/csharp'),
  import('@shikijs/langs/diff'),
  import('@shikijs/langs/dockerfile'),
]

let processorPromise: ReturnType<typeof buildProcessor> | null = null

function buildProcessor() {
  return createHighlighterCore({
    themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
    langs: LANGS,
    // JS 正则引擎替代 Oniguruma WASM，避免额外二进制体积
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).then((highlighter) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeMedia)
      .use(rehypeShikiFromHighlighter, highlighter, {
        themes: { light: 'github-light', dark: 'github-dark' },
        fallbackLanguage: 'plaintext',
      })
      .use(rehypeStringify)
  )
}

/** 服务端渲染 Markdown 为 HTML（含 GFM、代码高亮、音视频渲染） */
export async function renderMarkdown(markdown: string): Promise<string> {
  const processor = await (processorPromise ??= buildProcessor())
  const file = await processor.process(markdown)
  return String(file)
}
