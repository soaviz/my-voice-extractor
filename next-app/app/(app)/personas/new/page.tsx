'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import {
  personaIdentitySchema,
  type PersonaIdentityValues,
  defaultPersonaIdentity,
  nameToSlug,
  MBTI_LIST,
  ELEMENT_LIST,
  GENRE_LIST,
} from '@/lib/validations/persona'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/* ── 필드 래퍼 ──────────────────────────────────────────────── */
function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)' }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: '11px', color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}

/* ── 실시간 미리보기 카드 ────────────────────────────────────── */
function PersonaPreview({ values }: { values: PersonaIdentityValues }) {
  const element = ELEMENT_LIST.find(e => e.code === values.element_code)
  const hasContent = values.name || values.tagline || values.mbti || values.element_code

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        position: 'sticky', top: '24px',
      }}
    >
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        미리보기
      </p>

      {/* 아바타 + 이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: element ? `${element.color}22` : 'var(--bg-elev)',
            border: `2px solid ${element?.color ?? 'var(--border)'}`,
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}
        >
          {values.avatar_url
            ? <img src={values.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (element?.label.split(' ')[0] ?? '🌑')
          }
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '16px', color: values.name ? 'var(--text)' : 'var(--text-dim)', minHeight: '22px' }}>
            {values.name || '페르소나 이름'}
          </p>
          {values.slug && (
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>@{values.slug}</p>
          )}
        </div>
      </div>

      {/* 태그라인 */}
      {values.tagline && (
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
          "{values.tagline}"
        </p>
      )}

      {/* 뱃지 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {values.mbti && (
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>
            {values.mbti}
          </span>
        )}
        {element && (
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: `${element.color}18`, color: element.color, fontWeight: 600 }}>
            {element.label}
          </span>
        )}
        {values.genre && (
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'var(--bg-elev)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
            #{values.genre}
          </span>
        )}
      </div>

      {/* 백스토리 */}
      {values.backstory && (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          {values.backstory}
        </p>
      )}

      {!hasContent && (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>
          왼쪽에 입력하면 여기 반영됩니다
        </p>
      )}
    </div>
  )
}

/* ── 메인 페이지 ────────────────────────────────────────────── */
export default function NewPersonaPage() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonaIdentityValues>({
    resolver: zodResolver(personaIdentitySchema),
    defaultValues: defaultPersonaIdentity,
    mode: 'onChange',
  })

  const values = watch()

  // name → slug 자동 생성 (slug가 비어있을 때만)
  const nameValue = watch('name')
  const slugValue = watch('slug')
  useEffect(() => {
    if (nameValue && !slugValue) {
      setValue('slug', nameToSlug(nameValue), { shouldValidate: true })
    }
  }, [nameValue]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: PersonaIdentityValues) {
    // Day 3-D에서 Supabase INSERT 연결
    console.log('✓ Identity data:', data)
    alert('저장 준비 완료 (Day 3-D에서 DB 연결 예정)')
  }

  const s = {
    page: {
      minHeight: '100dvh', background: 'var(--bg)',
      fontFamily: 'var(--font-display)',
    } as React.CSSProperties,
    header: {
      padding: '20px 32px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg-elev)',
    } as React.CSSProperties,
    body: {
      maxWidth: '1100px', margin: '0 auto', padding: '40px 32px',
      display: 'grid', gridTemplateColumns: '1fr 360px', gap: '40px',
      alignItems: 'start',
    } as React.CSSProperties,
    form: {
      display: 'flex', flexDirection: 'column', gap: '24px',
    } as React.CSSProperties,
    section: {
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '28px',
      display: 'flex', flexDirection: 'column', gap: '20px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)',
      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      borderBottom: '1px solid var(--border)', paddingBottom: '12px',
    },
    row2: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
    } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      {/* 헤더 */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-mark" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>새 페르소나</p>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Identity 탭</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" type="button" onClick={() => history.back()}>
            취소
          </Button>
          <Button size="sm" form="identity-form" type="submit" loading={isSubmitting}>
            저장
          </Button>
        </div>
      </header>

      <div style={s.body}>
        {/* 폼 */}
        <form id="identity-form" onSubmit={handleSubmit(onSubmit)} style={s.form} noValidate>

          {/* 기본 정보 */}
          <section style={s.section}>
            <p style={s.sectionTitle}>기본 정보</p>

            <Field label="페르소나 이름 *" error={errors.name?.message}>
              <Input
                placeholder="예: 이루나"
                {...register('name')}
                style={errors.name ? { borderColor: '#f87171' } : {}}
              />
            </Field>

            <Field
              label="슬러그 *"
              hint="소문자·숫자·하이픈만 가능 (URL에 사용됩니다)"
              error={errors.slug?.message}
            >
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '13px', color: 'var(--text-dim)', userSelect: 'none',
                }}>@</span>
                <Input
                  placeholder="luna-01"
                  style={{ paddingLeft: '26px', ...(errors.slug ? { borderColor: '#f87171' } : {}) }}
                  {...register('slug')}
                />
              </div>
            </Field>

            <Field
              label="태그라인"
              hint="한 줄 소개 (최대 60자)"
              error={errors.tagline?.message}
            >
              <Input
                placeholder="예: 새벽 4시, 당신의 피부를 위해 깨어있는 루나"
                {...register('tagline')}
              />
            </Field>
          </section>

          {/* 세계관 설정 */}
          <section style={s.section}>
            <p style={s.sectionTitle}>세계관 설정</p>

            <div style={s.row2}>
              {/* MBTI */}
              <Field label="MBTI" error={errors.mbti?.message}>
                <select
                  {...register('mbti')}
                  style={{
                    width: '100%', height: '44px', padding: '0 12px',
                    background: 'var(--bg-elev)', border: '1px solid var(--border)',
                    borderRadius: 'calc(var(--radius) - 2px)', color: 'var(--text)',
                    fontSize: '14px', cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">선택 안 함</option>
                  {MBTI_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>

              {/* 원소 */}
              <Field label="원소 코드" error={errors.element_code?.message}>
                <select
                  {...register('element_code')}
                  style={{
                    width: '100%', height: '44px', padding: '0 12px',
                    background: 'var(--bg-elev)', border: '1px solid var(--border)',
                    borderRadius: 'calc(var(--radius) - 2px)', color: 'var(--text)',
                    fontSize: '14px', cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">선택 안 함</option>
                  {ELEMENT_LIST.map(e => <option key={e.code} value={e.code}>{e.label}</option>)}
                </select>
              </Field>
            </div>

            {/* 장르 */}
            <Field label="콘텐츠 장르" error={errors.genre?.message}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {GENRE_LIST.map(g => {
                  const selected = values.genre === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setValue('genre', selected ? '' : g, { shouldValidate: true })}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        background: selected ? 'var(--accent-soft)' : 'transparent',
                        color: selected ? 'var(--accent)' : 'var(--text-dim)',
                        cursor: 'pointer', fontWeight: selected ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      #{g}
                    </button>
                  )
                })}
              </div>
            </Field>
          </section>

          {/* 백스토리 */}
          <section style={s.section}>
            <p style={s.sectionTitle}>백스토리</p>
            <Field
              label="배경 스토리"
              hint={`${(values.backstory ?? '').length}/500자`}
              error={errors.backstory?.message}
            >
              <textarea
                placeholder="이 페르소나는 어떤 인물인가요? 어디서 왔고, 무엇을 원하나요?"
                rows={5}
                {...register('backstory')}
                style={{
                  width: '100%', padding: '12px 14px', resize: 'vertical',
                  background: 'var(--bg-elev)', border: '1px solid var(--border)',
                  borderRadius: 'calc(var(--radius) - 2px)', color: 'var(--text)',
                  fontSize: '14px', fontFamily: 'var(--font-display)',
                  lineHeight: 1.6, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>

            {/* 아바타 URL */}
            <Field label="아바타 URL (임시)" hint="Day 4에서 이미지 생성으로 교체됩니다" error={errors.avatar_url?.message}>
              <Input
                placeholder="https://..."
                {...register('avatar_url')}
              />
            </Field>
          </section>

        </form>

        {/* 미리보기 */}
        <PersonaPreview values={values} />
      </div>
    </div>
  )
}
