# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# soaviz studio — Node/Express Backend (Fly.io)
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS base

# FFmpeg — 비디오 렌더링 필수
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
      tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=8787

WORKDIR /app

# 의존성 레이어 (소스 변경 시 캐시 재사용)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 앱 소스 복사
COPY server.js ./
COPY services/ ./services/

# 업로드·출력 디렉토리 생성
RUN mkdir -p uploads outputs

# 비-root 사용자
RUN useradd -m -u 10001 soaviz && chown -R soaviz:soaviz /app
USER soaviz

EXPOSE 8787

# tini로 PID 1 신호 처리
ENTRYPOINT ["/usr/bin/tini", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/healthz || exit 1

CMD ["node", "server.js"]
