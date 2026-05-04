'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, type ProjectFormat } from './actions'

const FORMAT_OPTIONS: { value: ProjectFormat; label: string; icon: string }[] = [
  { value: 'film',   label: '장편 영화',       icon: '🎬' },
  { value: 'short',  label: '단편 영화',       icon: '🎞' },
  { value: 'series', label: '시리즈 / 드라마', icon: '📺' },
  { value: 'mv',     label: '뮤직비디오',      icon: '🎵' },
  { value: 'ad',     label: '광고 / 브랜드',   icon: '✦' },
]

const ACCENT_COLORS = [
  '#9e7bff', '#4cc9f0', '#f43f5e', '#f97316', '#22c55e', '#eab308',
]

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle]   = useState('')
  const [format, setFormat] = useState<ProjectFormat>('film')
  const [genre, setGenre]   = useState('')
  const [logline, setLogline] = useState('')
  const [color, setColor]   = useState(ACCENT_COLORS[0])
  const [error, setError]   = useState<string | null>(null)

  function reset() {
    setTitle(''); setFormat('film'); setGenre('')
    setLogline(''); setColor(ACCENT_COLORS[0]); setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await createProject({ title: title.trim(), format, genre: genre.trim(), logline: logline.trim(), color })
      if ('error' in result) {
        setError(result.error ?? '알 수 없는 오류')
      } else {
        handleClose()
        router.push(`/pipeline/${result.id}`)
      }
    })
  }

  if (!open) return null

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%', maxWidth: '520px',
          padding: '32px',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
              NEW PROJECT
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              새 프로젝트
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 제목 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>프로젝트 제목 *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: ORA-MU: 빈 페이지의 빛"
              style={inputStyle}
            />
          </div>

          {/* 포맷 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>포맷</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FORMAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: format === opt.value ? `1.5px solid ${color}` : '1.5px solid var(--border)',
                    background: format === opt.value ? `${color}22` : 'var(--surface-2)',
                    color: format === opt.value ? color : 'var(--text-dim)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 장르 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>장르</label>
            <input
              value={genre}
              onChange={e => setGenre(e.target.value)}
              placeholder="예: SF / 드라마, 음악 / 동양화"
              style={inputStyle}
            />
          </div>

          {/* 로그라인 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>로그라인</label>
            <textarea
              value={logline}
              onChange={e => setLogline(e.target.value)}
              placeholder="한 문장으로 프로젝트의 핵심을 설명하세요"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '76px' }}
            />
          </div>

          {/* 컬러 */}
          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>프로젝트 색상</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? `3px solid var(--text)` : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'border 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p style={{ color: '#f43f5e', fontSize: '13px', marginBottom: '16px' }}>
              ⚠ {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{ ...btnBase, background: 'var(--surface-2)', color: 'var(--text-dim)' }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              style={{ ...btnBase, background: color, color: '#fff', opacity: isPending || !title.trim() ? 0.5 : 1 }}
            >
              {isPending ? '생성 중…' : '프로젝트 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-dim)',
  letterSpacing: '0.06em',
  marginBottom: '8px',
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnBase: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}
