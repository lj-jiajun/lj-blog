import PostList from '@/components/PostList'
import { getPublishedPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const posts = await getPublishedPosts()

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">最新文章</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {posts.length} 篇文章
          </p>
        </div>
        <PostList posts={posts} />
      </section>
    </main>
  )
}
