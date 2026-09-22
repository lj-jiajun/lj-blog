'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { savePost, uploadMedia, parseMarkdown } from '@/app/admin/actions'
import MarkdownPreview from './MarkdownPreview'

export interface PostEditorData {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image: string
  tags: string
  status: 'draft' | 'published'
  published_at?: string | null
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/40'

export default function PostEditor({ initial }: { initial?: PostEditorData }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? '')
  const [tags, setTags] = useState(initial?.tags ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'media' | 'cover' | 'import' | null>(null)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const generateSlug = () => {
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(generated)
  }

  /** 在光标处插入文本 */
  const insertAtCursor = (text: string) => {
    const el = contentRef.current
    if (!el) {
      setContent((c) => c + text)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + text.length
    })
  }

  const uploadAndInsert = (file: File) => {
    setBusy('media')
    setError(null)
    startTransition(async () => {
      const result = await uploadMedia(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (!result.url) {
        setError('上传结果异常，未返回文件地址')
        return
      }
      const url = result.url
      const snippet = /\.(mp4|webm|mov)(\?.*)?$/i.test(url)
        ? `[视频：${file.name}](${url})`
        : /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url)
          ? `[音频：${file.name}](${url})`
          : `![${file.name}](${url})`
      insertAtCursor(`\n${snippet}\n`)
    })
  }

  const uploadCover = (file: File) => {
    setBusy('cover')
    setError(null)
    startTransition(async () => {
      const result = await uploadMedia(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (!result.url) {
        setError('上传结果异常，未返回文件地址')
        return
      }
      setCoverImage(result.url)
    })
  }

  const importFile = (file: File) => {
    setBusy('import')
    setError(null)
    startTransition(async () => {
      const result = await parseMarkdown(file)
      setBusy(null)
      if (result.ok === false) {
        setError(result.error)
        return
      }
      setTitle(result.title)
      setSlug(result.slug)
      setExcerpt(result.excerpt)
      setCoverImage(result.cover_image)
      setTags(result.tags.join(', '))
      setContent(result.content)
      setSuccess('已导入 md 文件内容，请检查后保存')
    })
  }

  const handleSave = (status: 'draft' | 'published') => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await savePost({
        id: initial?.id,
        title,
        slug,
        excerpt,
        content,
        cover_image: coverImage,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        status,
      })
      if (result.ok === false) {
        setError(result.error)
        return
      }
      if (status === 'published') {
        setSuccess('文章已发布！')
        setTimeout(() => router.push('/admin'), 800)
      } else {
        setSuccess('草稿已保存')
      }
      if (result.id && result.id !== initial?.id) {
        // 新建成功后切换到编辑模式（刷新服务端列表）
        router.replace(`/admin/posts/${result.id}`)
      }
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {initial?.id ? '编辑文章' : '撰写文章'}
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={busy !== null}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {busy === 'import' ? '导入中...' : '导入 .md'}
          </button>
          <button
            onClick={() => setPreview((v) => !v)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            {preview ? '编辑' : '预览'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {/* 标题 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入文章标题"
            className={inputClass}
            required
          />
        </div>

        {/* Slug */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              Slug <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={generateSlug}
              className="text-xs text-primary hover:underline"
            >
              从标题生成
            </button>
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="article-slug"
            className={inputClass}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            注意：Slug 发布后不建议修改，否则旧评论与收藏会失联
          </p>
        </div>

        {/* 摘要 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            摘要 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="输入文章摘要"
            className={`${inputClass} resize-none`}
            required
          />
        </div>

        {/* 标签 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">
            标签 <span className="text-muted-foreground">(逗号分隔，可选)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="技术, 生活, 随笔"
            className={inputClass}
          />
        </div>

        {/* 封面图 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              封面图 <span className="text-muted-foreground">(可选)</span>
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadCover(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={busy !== null}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {busy === 'cover' ? '上传中...' : '上传图片'}
            </button>
          </div>
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://... 或点击右侧上传"
            className={inputClass}
          />
          {coverImage && (
            <img
              src={coverImage}
              alt="封面预览"
              className="mt-2 aspect-video w-full rounded-lg object-cover"
            />
          )}
        </div>

        {/* 内容 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-card-foreground">
              内容 (Markdown) <span className="text-red-500">*</span>
            </label>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadAndInsert(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              disabled={busy !== null}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {busy === 'media' ? '上传中...' : '插入图片/音频/视频'}
            </button>
          </div>

          {preview ? (
            <div className="min-h-[24rem] rounded-lg border border-border bg-background p-4">
              {content.trim() ? (
                <MarkdownPreview content={content} />
              ) : (
                <p className="text-sm text-muted-foreground">暂无内容</p>
              )}
            </div>
          ) : (
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder={'使用 Markdown 编写内容...\n\n支持图片、代码块、表格、音频与视频（插入菜单或直接写链接）'}
              className={`${inputClass} resize-y font-mono text-sm leading-relaxed`}
              required
            />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            支持 GFM 语法：# 标题、**粗体**、表格、代码块 ``` 等；媒体链接（.mp4/.mp3 等）会自动渲染为播放器
          </p>
        </div>

        {/* 操作 */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={pending}
            className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            {pending ? '处理中...' : '保存草稿'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? '处理中...' : '发布文章'}
          </button>
        </div>
      </div>
    </div>
  )
}
