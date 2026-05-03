'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { completeOnboarding } from '@/lib/actions/onboarding'

const AVATAR_PRESETS = [
  { emoji: '🌙', bg: '#5B21B6' },
  { emoji: '🔥', bg: '#C2410C' },
  { emoji: '💧', bg: '#0369A1' },
  { emoji: '🌿', bg: '#166534' },
  { emoji: '⭐', bg: '#A16207' },
  { emoji: '🌸', bg: '#9D174D' },
]

export default function OnboardingPage() {
  const [nickname, setNickname] = useState('')
  const [avatarPreset, setAvatarPreset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const formData = new FormData()
    formData.set('nickname', nickname)
    formData.set('avatar_url', '')
    startTransition(async () => {
      const res = await completeOnboarding(formData)
      if (res && 'error' in res) setError(res.error)
    })
  }

  const preset = AVATAR_PRESETS[avatarPreset]

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
        fontFamily: 'var(--font-display)',
      }}
    >
      {/* 배경 글로우 */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.10) 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 'calc(var(--radius) + 4px)',
          padding: '40px 36px',
          display: 'flex', flexDirection: 'column', gap: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="brand-mark brand-mark-lg" />
          <div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              환영합니다 👋
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
              나만의 SOAVIZ를 시작하기 전에 프로필을 설정해 주세요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 아바타 선택 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}>
              아바타
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {AVATAR_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarPreset(i)}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: p.bg,
                    fontSize: '22px',
                    border: `3px solid ${i === avatarPreset ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: i === avatarPreset ? `0 0 0 4px var(--accent-soft)` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 닉네임 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="nickname" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}>
              닉네임 *
            </label>
            <Input
              id="nickname"
              placeholder="예: luna_creator"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              autoFocus
            />
            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              한글·영문·숫자·언더스코어 2~20자
            </p>
          </div>

          {/* 미리보기 */}
          {nickname && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: preset.bg, fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {preset.emoji}
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>{nickname}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>SOAVIZ 멤버</p>
              </div>
            </div>
          )}

          {error && (
            <p style={{
              fontSize: '13px', color: '#f87171',
              padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.15)',
            }}>
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={isPending} style={{ width: '100%' }}>
            시작하기 →
          </Button>
        </form>
      </div>
    </main>
  )
}
