import { createClient } from '@/lib/supabase/server'

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image: string | null
  content?: string
  status: 'draft' | 'published'
  tags?: string[] | null
  published_at: string | null
  created_at: string
  updated_at?: string
}

/** 已发布文章列表（首页用） */
export async function getPublishedPosts(): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, tags, status, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('获取文章列表失败:', error)
    return []
  }
  return data ?? []
}

/** 按 slug 获取已发布文章（详情页用；草稿返回 null → 404） */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, content, status, tags, published_at, created_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) return null
  return data
}

/** 管理后台文章列表（RLS 保证仅 admin 可见草稿） */
export async function getAdminPosts(): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, status, tags, published_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取管理文章列表失败:', error)
    return []
  }
  return data ?? []
}

/** 按 id 获取文章（管理后台编辑用，含草稿） */
export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, content, status, tags, published_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
