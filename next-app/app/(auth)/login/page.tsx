'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, signInWithGoogle } from './actions'

// Google G 아이콘
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const formData = new FormData()
    formData.set('email', email)
    startTransition(async () => {
      const res = await signInWithEmail(formData)
      if (res && 'error' in res) setError(res.error ?? null)
      else setSent(true)
    })
  }

  function handleGoogle() {
    startTransition(async () => {
      const res = await signInWithGoogle()
      if (res && 'error' in res) setError(res.error)
    })
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* 배경 글로우 */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)',
        }}
      />

      {/* 카드 */}
      <div
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 'calc(var(--radius) + 4px)',
          padding: '40px 36px',
          display: 'flex', flexDirection: 'column', gap: '28px',
          position: 'relative',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* 달 로고 + 타이틀 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div className="brand-mark brand-mark-lg" />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              SOAVIZ
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
              내가 만든 또 하나의 나
            </p>
          </div>
        </div>

        {/* 매직링크 폼 */}
        {!sent ? (
          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                htmlFor="email"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}
              >
                이메일
              </label>
              <Input
                id="email"
                type="email"
                placeholder="hello@soaviz.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#f87171', padding: '10px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.15)' }}>
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={isPending} style={{ width: '100%', marginTop: '4px' }}>
              매직 링크 보내기
            </Button>
          </form>
        ) : (
          <div
            style={{
              textAlign: 'center', padding: '24px 16px',
              background: 'var(--accent-soft)',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <p style={{ fontSize: '28px', marginBottom: '10px' }}>✉️</p>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>메일을 확인해 주세요</p>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              <strong style={{ color: 'var(--accent)' }}>{email}</strong>으로<br/>
              로그인 링크를 보냈습니다.
            </p>
            <button
              onClick={() => { setSent(false); setError(null) }}
              style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-dim)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              다른 이메일로 재시도
            </button>
          </div>
        )}

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Google OAuth */}
        <Button
          variant="outline"
          size="lg"
          style={{ width: '100%', gap: '10px' }}
          onClick={handleGoogle}
          disabled={isPending}
        >
          <GoogleIcon />
          Google로 계속하기
        </Button>

        {/* 약관 */}
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6 }}>
          계속 진행하면 SOAVIZ의{' '}
          <a href="/terms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>이용약관</a>
          {' '}및{' '}
          <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>개인정보처리방침</a>
          에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </main>
  )
}
