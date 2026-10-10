#!/bin/sh
# ==============================================================================
# serv00 棋牌进程保活守护脚本 (Watchdog for Crontab)
# 建议在 crontab 中配置: */5 * * * * /bin/sh $HOME/.../keepalive_serv00.sh
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$SCRIPT_DIR/server_go/bin/gamehall-monolith"
LOG="$HOME/gamehall.log"

# 读取配置端口
HTTP_PORT=${HTTP_PORT:-28080}
GRPC_PORT=${GRPC_PORT:-28081}
REDIS_ADDR=${REDIS_ADDR:-"127.0.0.1:6379"}

# 检查进程是否存在
if ! pgrep -f "gamehall-monolith" > /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [Watchdog] 检测到 gamehall-monolith 离线，正在自动拉起守护..." >> "$LOG"
    if [ -x "$BIN" ]; then
        nohup env HTTP_PORT="$HTTP_PORT" \
                  GRPC_PORT="$GRPC_PORT" \
                  REDIS_ADDR="$REDIS_ADDR" \
                  "$BIN" >> "$LOG" 2>&1 &
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [Watchdog] 服务重启完成。" >> "$LOG"
    fi
fi
