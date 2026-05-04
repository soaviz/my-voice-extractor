#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock
git push origin main
echo ""
echo "✅ 완료! Vercel 자동 배포 시작됨"
