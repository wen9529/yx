#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Go 棋牌游戏大厅 (Game Hall Monolith) - Termux (Android) 一键安装与启动脚本
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Android Termux 部署 Go 棋牌游戏大厅全栈单体服务...        ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 1. 防止锁屏休眠导致进程挂起
if command -v termux-wake-lock >/dev/null 2>&1; then
    echo -e "${BLUE}[1/6] 申请 Termux 后台唤醒锁 (Wake-Lock)...${NC}"
    termux-wake-lock
else
    echo -e "${YELLOW}[提示] 未检测到 termux-wake-lock 命令，请保持 Termux 前台运行。${NC}"
fi

# 2. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
echo -e "${BLUE}[2/7] 配置 Termux DNS 解析器 (解决 [::1]:53 报错)...${NC}"
mkdir -p "$PREFIX/etc"
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29\nnameserver 1.1.1.1" > "$PREFIX/etc/resolv.conf"

# 3. 更新软件源并安装基础依赖 (包含 ca-certificates 根证书与 proot)
echo -e "${BLUE}[3/7] 安装系统依赖 (Golang, Redis, Git, Make, Node.js, CA证书, proot)...${NC}"
pkg update -y
pkg install -y golang redis git make nodejs-lts ca-certificates curl proot

# 导出 Go DNS 与 SSL 证书环境变量
export GODEBUG=netdns=go
export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"

# 4. 启动本地 Redis 服务 (后台运行)
echo -e "${BLUE}[4/7] 启动 Termux Redis 内存服务...${NC}"
mkdir -p "$HOME/.redis"
if pgrep redis-server >/dev/null; then
    echo -e "${GREEN}Redis 服务已在运行。${NC}"
else
    redis-server --daemonize yes --dir "$HOME/.redis" --bind 127.0.0.1 --port 6379
    echo -e "${GREEN}Redis 内存数据库已在 127.0.0.1:6379 启动。${NC}"
fi

# 5. 编译 Go 棋牌核心单体服务
echo -e "${BLUE}[5/7] 编译 Go 棋牌单体微内核 (ARM/ARM64 优化)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR/server_go"

export CGO_ENABLED=0
go build -ldflags="-s -w" -o "$SCRIPT_DIR/server_go/bin/gamehall-monolith" ./main.go

echo -e "${GREEN}Go 单体核心二进制编译完成: server_go/bin/gamehall-monolith${NC}"

# 5. 编译前端静态页面 (可选本地或直接开发环境)
cd "$SCRIPT_DIR"
if [ ! -d "dist" ]; then
    echo -e "${BLUE}[5/6] 首次打包前端静态资源...${NC}"
    npm install --silent
    npm run build
fi

# 6. 后台启动棋牌大厅服务
echo -e "${BLUE}[6/6] 启动 Go 棋牌服务监听...${NC}"
pkill -f "gamehall-monolith" || true

export HTTP_PORT=${HTTP_PORT:-8080}
export GRPC_PORT=${GRPC_PORT:-50051}
export REDIS_ADDR=${REDIS_ADDR:-"127.0.0.1:6379"}

nohup "$SCRIPT_DIR/server_go/bin/gamehall-monolith" > "$HOME/gamehall.log" 2>&1 &
PID=$!

sleep 2
if ps -p $PID > /dev/null; then
    # 获取手机内网 IP
    LOCAL_IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "127.0.0.1")
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ 部署成功！Go 棋牌游戏大厅正在后台稳定运行 (PID: $PID)      ${NC}"
    echo -e "${YELLOW}  本地访问地址: http://127.0.0.1:${HTTP_PORT}${NC}"
    echo -e "${YELLOW}  局域网其他设备访问: http://${LOCAL_IP}:${HTTP_PORT}${NC}"
    echo -e "${YELLOW}  gRPC 网格端口: ${GRPC_PORT}${NC}"
    echo -e "${YELLOW}  运行日志位置: $HOME/gamehall.log${NC}"
    echo -e "${GREEN}  ----------------------------------------------------------------${NC}"
    echo -e "${GREEN}  💡 写入 ~/.bashrc 永久配置 DNS 与开机自动拉起隧道 (防大陆阻断):   ${NC}"
    echo -e "${YELLOW}     chmod +x deploy/termux_setup_bashrc.sh && ./deploy/termux_setup_bashrc.sh ${NC}"
    echo -e "${GREEN}  💡 立即启动 Cloudflare 公网隧道 (获取公网 HTTPS 访问域名):       ${NC}"
    echo -e "${YELLOW}     chmod +x deploy/termux_tunnel.sh && ./deploy/termux_tunnel.sh ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
else
    echo -e "${RED}启动失败，请检查日志: cat $HOME/gamehall.log${NC}"
    exit 1
fi
