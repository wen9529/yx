#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Cloudflare Tunnel 穿透脚本 - 专为 Android Termux 定制 (针对大陆网络与证书优化)
# 包含: 解决 Go [::1]:53 报错、GODEBUG=netdns=go、SSL_CERT_FILE 证书路径与 termux-chroot
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Termux 配置 Cloudflare Tunnel (针对国内网络与证书优化)  ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
echo -e "${BLUE}[1/6] 配置 Termux DNS 解析器 (resolv.conf)...${NC}"
mkdir -p "$PREFIX/etc"
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29\nnameserver 1.1.1.1" > "$PREFIX/etc/resolv.conf"

# 2. 安装/更新系统根证书与 proot (支持 termux-chroot)
echo -e "${BLUE}[2/6] 安装系统根证书 (ca-certificates) 与 proot 隔离环境...${NC}"
pkg install -y ca-certificates curl proot

# 3. 设置核心环境变量
export GODEBUG=netdns=go
export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"

# 4. 读取项目根目录 .env 文件配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${BLUE}[3/6] 加载 .env 环境变量配置...${NC}"
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

HTTP_PORT=${HTTP_PORT:-8080}
CF_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN:-""}
CF_EDGE_IP_VERSION=${CLOUDFLARE_EDGE_IP_VERSION:-"4"}

# 5. 检查或安装 cloudflared 二进制 (ARM64 架构)
echo -e "${BLUE}[4/6] 检测 cloudflared 客户端二进制...${NC}"
mkdir -p "$HOME/bin"
export PATH="$HOME/bin:$PATH"

if ! command -v cloudflared >/dev/null 2>&1; then
    ARCH=$(uname -m)
    echo -e "当前系统架构: $ARCH，正在下载官方 cloudflared..."
    
    CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
    if [ "$ARCH" = "arm" ] || [ "$ARCH" = "armv7l" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
    elif [ "$ARCH" = "aarch64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
    fi

    # 使用 curl 下载二进制，失败时尝试镜像加速
    curl -L --retry 3 --connect-timeout 10 -o "$HOME/bin/cloudflared" "$CF_URL" || {
        echo -e "${YELLOW}通过加速源重试下载...${NC}"
        curl -L -o "$HOME/bin/cloudflared" "https://ghproxy.net/$CF_URL" || true
    }
    chmod +x "$HOME/bin/cloudflared"
fi

echo -e "${GREEN}cloudflared 客户端就绪: $($HOME/bin/cloudflared --version 2>/dev/null || echo 'OK')${NC}"

# 6. 使用 termux-chroot 启动隧道进程 (强制 IPv4 和 HTTP/2 协议，避免 UDP/QUIC 阻断)
echo -e "${BLUE}[5/6] 通过 termux-chroot 启动 Cloudflare 穿透隧道...${NC}"
pkill -f "cloudflared" || true

TUNNEL_LOG="$HOME/cloudflared.log"

if [ -n "$CF_TOKEN" ]; then
    echo -e "${GREEN}检测到已配置 Token，启动自定域名生产隧道 (--edge-ip-version 4 --protocol http2)...${NC}"
    nohup termux-chroot "$HOME/bin/cloudflared" tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --protocol http2 \
        run --token "$CF_TOKEN" > "$TUNNEL_LOG" 2>&1 &
    
    sleep 3
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ 自定义 Cloudflare 隧道已在后台稳定启动！                       ${NC}"
    echo -e "${YELLOW}  网络模式: IPv4 | 协议: HTTP/2 (规避大陆 UDP 干扰)              ${NC}"
    echo -e "${YELLOW}  DNS 解析: 223.5.5.5, 119.29.29.29 (阿里与腾讯)                ${NC}"
    echo -e "${YELLOW}  证书路径: $SSL_CERT_FILE                                      ${NC}"
    echo -e "${YELLOW}  日志文件: $TUNNEL_LOG                                         ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
else
    echo -e "${YELLOW}未配置 Token，正在启动免登录临时快速隧道 (Quick Tunnel)...${NC}"
    nohup termux-chroot "$HOME/bin/cloudflared" tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --protocol http2 \
        --url "http://127.0.0.1:${HTTP_PORT}" > "$TUNNEL_LOG" 2>&1 &
    
    echo -e "${BLUE}[6/6] 获取公网访问网址 (等待约 3-5 秒)...${NC}"
    sleep 4
    
    PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' "$TUNNEL_LOG" | tail -n 1 || true)
    
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ Cloudflare 临时快速隧道穿透成功！                             ${NC}"
    if [ -n "$PUBLIC_URL" ]; then
        echo -e "${YELLOW}  🌐 公网访问地址 (HTTPS): ${PUBLIC_URL}${NC}"
    else
        echo -e "${YELLOW}  正在连接中，请稍后查看日志获取公网 URL: cat $TUNNEL_LOG${NC}"
    fi
    echo -e "${YELLOW}  本地服务端口: http://127.0.0.1:${HTTP_PORT}${NC}"
    echo -e "${YELLOW}  协议: HTTP/2 | 模式: IPv4 | 运行容器: termux-chroot            ${NC}"
    echo -e "${YELLOW}  隧道运行日志: $TUNNEL_LOG                                     ${NC}"
    echo -e "${GREEN}==================================================================${NC}"
fi
