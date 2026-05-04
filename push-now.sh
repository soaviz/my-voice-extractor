#!/bin/bash
# soaviz-studio — push 스크립트
# 커밋은 이미 완료됨 (387fffb feat: v4 top-1% UX/UI)
# 이 스크립트는 lock 제거 후 push만 수행
cd "$(dirname "$0")"

echo "🔓 git lock 파일 제거..."
rm -f .git/HEAD.lock .git/index.lock 2>/dev/null && echo "  ✓ lock 파일 제거됨" || echo "  (lock 파일 없음)"

echo ""
echo "📋 최근 커밋 확인..."
git log --oneline -3

echo ""
echo "🚀 GitHub push..."
git push origin main 2>&1

echo ""
echo "✅ 완료! Vercel이 자동 배포를 시작합니다."
