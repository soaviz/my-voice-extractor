import { Sidebar } from '@/components/app/sidebar'
import { Topbar } from '@/components/app/topbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: 'var(--bg)',
      }}
    >
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
