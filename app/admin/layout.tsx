import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getRole } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getRole()

  if (role !== 'admin') {
    redirect('/login')
  }

  return (
    <div>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-foreground">管理后台</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/write" className="text-primary hover:underline">
              撰写文章
            </Link>
            <Link href="/admin" className="text-muted-foreground hover:text-primary">
              文章管理
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-primary">
              返回博客
            </Link>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
