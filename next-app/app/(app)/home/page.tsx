export default function HomePage() {
  return (
    <div
      style={{
        padding: '40px 32px',
        fontFamily: 'var(--font-display)',
        color: 'var(--text)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          홈
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
          안녕하세요, SOAVIZ에 오신 것을 환영합니다.
        </p>
      </div>

      {/* 빠른 메뉴 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          maxWidth: '800px',
        }}
      >
        {[
          { label: '새 페르소나', desc: 'AI 캐릭터 만들기', href: '/personas/new', icon: '◎' },
          { label: '새 프로젝트', desc: '콘텐츠 프로젝트 시작', href: '/projects', icon: '▦' },
          { label: '스튜디오', desc: '콘텐츠 제작하기', href: '/studio', icon: '✦' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '20px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <span style={{ fontSize: '20px', color: 'var(--accent)' }}>{item.icon}</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{item.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
