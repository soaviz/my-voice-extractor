'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/home',      icon: '⌂',  label: '홈' },
  { href: '/personas',  icon: '◎',  label: '페르소나' },
  { href: '/projects',  icon: '▦',  label: '프로젝트' },
  { href: '/studio',    icon: '✦',  label: '스튜디오' },
  { href: '/library',   icon: '◫',  label: '라이브러리' },
  { href: '/publish',   icon: '↑',  label: '퍼블리시' },
  { href: '/insights',  icon: '◈',  label: '인사이트' },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: '220px',
        minHeight: '100dvh',
        background: 'var(--bg-elev)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
      }}
    >
      {/* 로고 */}
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: '10px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="brand-mark" />
        <span
          style={{
            fontWeight: 800,
            fontSize: '15px',
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}
        >
          SOAVIZ
        </span>
      </div>

      {/* 네비게이션 */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: 'calc(var(--radius) - 2px)',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--text-dim)',
                background: active ? 'var(--bg-card)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.12s',
              }}
            >
              <span
                style={{
                  width: '20px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: active ? 'var(--accent)' : 'var(--text-dim)',
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              {label}
              {active && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                  }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* 하단 — 버전 */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: '11px',
          color: 'var(--text-dim)',
        }}
      >
        v0.1 · beta
      </div>
    </aside>
  )
}
