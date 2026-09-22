import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeMedia)
  .use(rehypeShiki, {
    themes: { light: 'github-light', dark: 'github-dark' },
    fallbackLanguage: 'plaintext',
  })
  .use(rehypeStringify)

/** 服务端渲染 Markdown 为 HTML（含 GFM、代码高亮、音视频渲染） */
export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown)
  return String(file)
}
