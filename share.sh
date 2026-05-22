#!/bin/bash
# 视己 — 一键启动 + Cloudflare 公网隧道 (无中间页)
set -e

cd "$(dirname "$0")"

CF_BIN="$HOME/.local/bin/cloudflared"

# Clean old processes on target ports
for port in 3001 5173; do
  lsof -ti :$port 2>/dev/null | xargs kill -9 2>/dev/null || true
done
sleep 1

echo "╔══════════════════════════════════════════════════╗"
echo "║              视己 · 启动中...                     ║"
echo "╚══════════════════════════════════════════════════╝"

# Start backend
echo "▶  后端 API (端口 3001)"
npx tsx server/index.ts &
BACKEND_PID=$!
sleep 2

# Start frontend
echo "▶  前端 (端口 5173)"
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
sleep 3

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║                                                  ║"
echo "║  本地访问:                                        ║"
echo "║  http://localhost:5173                            ║"
echo "║                                                  ║"
echo "║  局域网分享 (同一 WiFi):                           ║"
echo "║  http://$LOCAL_IP:5173                  ║"
echo "║                                                  ║"

# Start cloudflared tunnel (no browser warning page)
TUNNEL_PID=""
if [[ -x "$CF_BIN" ]]; then
  echo "║  正在启动 Cloudflare 公网隧道...                   ║"
  TUNNEL_LOG=$(mktemp)
  "$CF_BIN" tunnel --url http://localhost:5173 >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
  for i in $(seq 1 16); do
    sleep 0.5
    PUBLIC_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1) || true
    [[ -n "$PUBLIC_URL" ]] && break
  done
  if [[ -n "$PUBLIC_URL" ]]; then
    echo "║  公网分享 (发给任何人):                             ║"
    echo "║  $PUBLIC_URL ║"
  else
    echo "║  公网分享: cloudflared 启动失败                      ║"
  fi
else
  echo "║  公网分享: cloudflared 未安装                        ║"
fi

echo "║                                                  ║"
echo "║  验证码: 1234                                     ║"
echo "║  按 Ctrl+C 停止所有服务                            ║"
echo "╚══════════════════════════════════════════════════╝"

# Cleanup on exit
cleanup() {
  echo ""
  echo "正在停止服务..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  [[ -n "$TUNNEL_PID" ]] && kill $TUNNEL_PID 2>/dev/null || true
  echo "已停止"
}
trap cleanup EXIT INT TERM

wait
