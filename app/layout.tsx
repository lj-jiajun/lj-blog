import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: {
    default: '我的博客',
    template: '%s | 我的博客',
  },
  description: '一个基于 Next.js 与 Supabase 的个人博客',
}

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem('theme');
    if (!['light', 'dark', 'green', 'paper'].includes(theme)) theme = 'light';
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} 我的博客 · 由 Next.js 与 Supabase 驱动
        </footer>
      </body>
    </html>
  )
}
