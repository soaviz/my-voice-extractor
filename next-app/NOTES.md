# soaviz next-app 개발 일지

## Day 1

### Block D — Supabase 클라이언트 + RLS 테스트 ✅

**완료:**
- `lib/supabase/client.ts` — Browser용 createBrowserClient
- `lib/supabase/server.ts` — Server Component / Route Handler용 createServerClient
- `middleware.ts` — /home, /personas, /projects, /studio, /library, /publish, /insights 보호
- `types/database.ts` — personas, projects 타입 스텁 (실제 스키마 생성 후 교체)
- `.env.local.example` — 환경변수 템플릿

**환경:**
- Supabase URL: https://yfzhvuyrdabpzowprupa.supabase.co
- .env.local 파일 → `cp .env.local.example .env.local` 후 ANON_KEY 입력

**RLS 테스트:**
- middleware 보호: 미인증 유저 → /login 리다이렉트 ✅
- SQL 차단 테스트: Supabase SQL Editor에서 `SET LOCAL ROLE anon; SELECT * FROM personas;` → 0 rows 확인

**오늘 막힌 것:**
- `npx supabase gen types` 실행 시 install 프롬프트가 파일을 덮어씀 → 수동 복원
- Vercel GitHub 자동 연결이 Pro 플랜 필요 → `npx vercel --prod` 수동 배포

**내일 가장 먼저 할 것:** Day 2 Block A — 로그인 페이지

---

### types/database.ts 실제 스키마로 교체하기

```bash
cd ~/Desktop/soaviz-studio/next-app
npx supabase gen types typescript \
  --project-id yfzhvuyrdabpzowprupa \
  > types/database.ts
```
