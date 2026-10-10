#!/bin/sh
# ==============================================================================
# Go 棋牌游戏大厅 (Game Hall Monolith) - serv00 (FreeBSD) 一键部署脚本
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "${YELLOW}==================================================================${NC}"
echo "${GREEN}  正在为 serv00 (FreeBSD 环境) 部署 Go 棋牌游戏大厅全栈单体服务...  ${NC}"
echo "${YELLOW}==================================================================${NC}"

# 1. 确认已开启 serv00 允许后台进程 (devil binexec)
echo "${BLUE}[1/6] 检查 serv00 进程后台运行权限 (binexec)...${NC}"
if command -v devil >/dev/null 2>&1; then
    devil binexec on || true
fi

# 2. 检查或自动安装 FreeBSD 兼容的 Go 环境
echo "${BLUE}[2/6] 配置 FreeBSD Go 语言开发环境...${NC}"
if ! command -v go >/dev/null 2>&1; then
    echo "未检测到系统全局 go 命令，正在为您在用户主目录 (~/opt/go) 下载安装独立 Go 1.22..."
    mkdir -p "$HOME/opt"
    cd "$HOME/opt"
    if [ ! -d "go" ]; then
        fetch -o go.tar.gz https://go.dev/dl/go1.22.2.freebsd-amd64.tar.gz || curl -Lo go.tar.gz https://go.dev/dl/go1.22.2.freebsd-amd64.tar.gz
        tar -xzf go.tar.gz
        rm -f go.tar.gz
    fi
    export GOROOT="$HOME/opt/go"
    export PATH="$HOME/opt/go/bin:$PATH"
fi

echo "${GREEN}当前 Go 版本: $(go version)${NC}"

# 3. 端口规划提示
echo "${BLUE}[3/6] 配置 serv00 专属自定义端口...${NC}"
echo "提示：serv00 必须使用 devil 申请的高位端口 (例如 10000-65535)。"
echo "您可以通过命令 'devil port list' 查看已分配端口，或 'devil port add tcp' 申请新端口。"

# 读取环境变量 (优先支持项目上一级目录，防 git pull 覆盖)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PARENT_DIR/.env" ]; then
    echo "${GREEN}✓ [环境配置] 加载上一级目录配置: $PARENT_DIR/.env (安全防覆盖)${NC}"
    set -a
    . "$PARENT_DIR/.env"
    set +a
elif [ -f "$SCRIPT_DIR/.env" ]; then
    echo "${YELLOW}ℹ [环境配置] 加载仓库内部配置: $SCRIPT_DIR/.env${NC}"
    set -a
    . "$SCRIPT_DIR/.env"
    set +a
fi

# 读取环境变量或预设端口
SERV00_HTTP_PORT=${HTTP_PORT:-${PORT:-28080}}
SERV00_GRPC_PORT=${GRPC_PORT:-28081}
SERV00_REDIS_ADDR=${REDIS_ADDR:-"127.0.0.1:6379"}

echo "当前分配 HTTP 端口: $SERV00_HTTP_PORT"
echo "当前分配 gRPC 端口: $SERV00_GRPC_PORT"
echo "当前 Redis 地址: $SERV00_REDIS_ADDR (可配置外部 Upstash Redis 或本地实例)"

# 4. 编译针对 FreeBSD 的静态二进制
echo "${BLUE}[4/6] 编译 FreeBSD 静态二进制文件...${NC}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR/server_go"

mkdir -p "$SCRIPT_DIR/server_go/bin"
export CGO_ENABLED=0
export GOOS=freebsd
export GOARCH=amd64
export GOPROXY="https://goproxy.cn,https://proxy.golang.org,direct"
export GOSUMDB=off
export GOPRIVATE=github.com/gamehall/monolith

go build -ldflags="-s -w" -o "$SCRIPT_DIR/server_go/bin/gamehall-monolith" ./main.go
chmod +x "$SCRIPT_DIR/server_go/bin/gamehall-monolith"
echo "${GREEN}FreeBSD 二进制编译成功: server_go/bin/gamehall-monolith${NC}"

# 5. 启动服务 (带后台守护与环境变量传递)
echo "${BLUE}[5/6] 启动 Go 棋牌单体进程...${NC}"
pkill -f "gamehall-monolith" || true

nohup env HTTP_PORT="$SERV00_HTTP_PORT" \
          GRPC_PORT="$SERV00_GRPC_PORT" \
          REDIS_ADDR="$SERV00_REDIS_ADDR" \
          "$SCRIPT_DIR/server_go/bin/gamehall-monolith" > "$HOME/gamehall.log" 2>&1 &

PID=$!
sleep 2

# 6. 配置 Cron 保活机制
echo "${BLUE}[6/6] 配置 serv00 进程保活守护 (Crontab Watchdog)...${NC}"
KEEPALIVE_SCRIPT="$SCRIPT_DIR/deploy/keepalive_serv00.sh"
chmod +x "$KEEPALIVE_SCRIPT"

# 检查 crontab 是否已有保活任务
if ! crontab -l 2>/dev/null | grep -q "keepalive_serv00.sh"; then
    (crontab -l 2>/dev/null; echo "*/5 * * * * /bin/sh $KEEPALIVE_SCRIPT >/dev/null 2>&1") | crontab -
    echo "${GREEN}已将每 5 分钟自动保活任务加入 Crontab！${NC}"
fi

echo "${GREEN}==================================================================${NC}"
echo "${GREEN}  ✓ serv00 部署成功！Go 棋牌单体进程已启动 (PID: $PID)            ${NC}"
echo "${YELLOW}  访问端口: $SERV00_HTTP_PORT${NC}"
echo "${YELLOW}  gRPC 网格端口: $SERV00_GRPC_PORT${NC}"
echo "${YELLOW}  日志文件: $HOME/gamehall.log${NC}"
echo "${YELLOW}  进程保活脚本: $KEEPALIVE_SCRIPT${NC}"
echo "${GREEN}==================================================================${NC}"
