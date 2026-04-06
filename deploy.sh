#!/bin/bash
# 원클릭 배포: 변경사항 커밋 + push (자동 Render 배포)
cd "$(dirname "$0")"
git add -A
git commit -m "update: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null
git push origin main
echo "✓ 배포 완료 - Render에서 자동 빌드 시작됩니다."
