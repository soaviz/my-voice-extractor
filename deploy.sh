#!/bin/bash
# SOAVIZ Studio 자동 배포 스크립트
# 사용법: ./deploy.sh "커밋 메시지"
#         ./deploy.sh             (메시지 없으면 자동 생성)

set -e
cd "$(dirname "$0")"

MSG="${1:-"chore: deploy $(date '+%Y-%m-%d %H:%M')"}"

echo "🔧  git lock 정리 중..."
rm -f .git/index.lock

echo "📦  변경 파일 스테이징..."
git add -A

if git diff --cached --quiet; then
  echo "ℹ️   커밋할 변경사항 없음 — Vercel 배포만 진행"
else
  echo "💬  커밋: $MSG"
  git commit -m "$MSG"
  echo "🚀  GitHub push..."
  git push
fi

echo "▲   Vercel 배포 중..."
vercel --prod

echo ""
echo "✅  배포 완료 — https://www.soaviz.com"
