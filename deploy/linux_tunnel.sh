#!/bin/bash
# ==============================================================================
# Cloudflare Tunnel 穿透脚本 - 专为 Linux 生产服务器定制
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}  正在为 Linux 服务器配置 Cloudflare Tunnel 公网穿透...           ${NC}"
echo -e "${YELLOW}==================================================================${NC}"

# 1. 安装 ca-certificates 确保根证书完备
sudo apt-get update -y && sudo apt-get install -y ca-certificates curl 2>/dev/null || true

# 2. 读取项目根目录 .env 文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

HTTP_PORT=${HTTP_PORT:-8080}
CF_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN:-""}
CF_DNS=${CLOUDFLARE_DNS:-"223.5.5.5,119.29.29.29"}
CF_EDGE_IP_VERSION=${CLOUDFLARE_EDGE_IP_VERSION:-"4"}

# 3. 安装 cloudflared
if ! command -v cloudflared >/dev/null 2>&1; then
    echo -e "${BLUE}正在下载并安装 official cloudflared 二进制...${NC}"
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb 2>/dev/null && {
        sudo dpkg -i /tmp/cloudflared.deb 2>/dev/null || sudo apt-get install -f -y
    } || {
        sudo curl -L -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        sudo chmod +x /usr/local/bin/cloudflared
    }
fi

# 4. 启动穿透
pkill -f "cloudflared" || true
TUNNEL_LOG="/var/log/cloudflared.log"

if [ -n "$CF_TOKEN" ]; then
    echo -e "${GREEN}使用自定义 Token 启动隧道...${NC}"
    sudo nohup cloudflared tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --dns "$CF_DNS" \
        run --token "$CF_TOKEN" > "$TUNNEL_LOG" 2>&1 &
    echo -e "${GREEN}隧道已成功启动！请通过 Cloudflare 分配的公网域名访问。${NC}"
else
    echo -e "${YELLOW}正在启动免配置临时快速隧道 (Quick Tunnel)...${NC}"
    sudo nohup cloudflared tunnel \
        --edge-ip-version "$CF_EDGE_IP_VERSION" \
        --dns "$CF_DNS" \
        --url "http://127.0.0.1:${HTTP_PORT}" > "$TUNNEL_LOG" 2>&1 &
    
    sleep 4
    PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*.trycloudflare.com' "$TUNNEL_LOG" | tail -n 1 || true)
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}  ✓ Linux 隧道就绪！                                              ${NC}"
    if [ -n "$PUBLIC_URL" ]; then
        echo -e "${YELLOW}  公网访问地址: ${PUBLIC_URL}${NC}"
    else
        echo -e "${YELLOW}  请查看日志获取公网 URL: cat $TUNNEL_LOG${NC}"
    fi
    echo -e "${GREEN}==================================================================${NC}"
fi
