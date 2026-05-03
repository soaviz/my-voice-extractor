'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        background: 'var(--bg)',
        fontFamily: 'var(--font-display)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* 페이지 타이틀 */}
      {title && (
        <p
          style={{
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--text)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </p>
      )}

      {/* 스페이서 */}
      <div style={{ flex: 1 }} />

      {/* 유저 메뉴 */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'var(--accent)',
            fontWeight: 700,
          }}
        >
          S
        </button>

        {menuOpen && (
          <>
            {/* 백드롭 */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setMenuOpen(false)}
            />
            {/* 드롭다운 */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '160px',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 20,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: 'var(--text-dim)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
