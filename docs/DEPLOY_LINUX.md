# Linux 生产服务器部署指南：Go 棋牌游戏大厅全栈单体系统

本指南适用于各主流 Linux 发行版（Ubuntu、Debian、CentOS、Rocky Linux、AlmaLinux、Arch Linux 等），涵盖 **.env 变量配置**、**Systemd 原生守护进程**、**Docker 容器化部署**、**Cloudflare 公网隧道穿透**、**Telegram Bot 管理员监控** 以及 **高并发内核参数优化**。

---

## ⚙️ 一、配置生产环境变量 (.env)

在项目根目录复制并配置 `.env` 文件：

```bash
cp .env.example .env
nano .env
```

配置说明：
```env
# 基础服务端口
HTTP_PORT=8080
GRPC_PORT=50051
REDIS_ADDR=127.0.0.1:6379

# Telegram Bot 管理员监控
# 在 Telegram @BotFather 创建 Bot 获得的 Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
# 管理员数字 ID (从 @userinfobot 获取)
TELEGRAM_ADMIN_ID=987654321

# Cloudflare Tunnel 穿透隧道 (无需开放公网端口即可访问)
CLOUDFLARE_TUNNEL_TOKEN=
CLOUDFLARE_DNS=223.5.5.5,119.29.29.29
CLOUDFLARE_EDGE_IP_VERSION=4
```

---

## ⚡ 二、方式 1：Docker Compose 容器化部署 (推荐 · 最快捷)

宿主机已安装 Docker 与 Docker Compose 时：

```bash
# 1. 克隆代码仓库
git clone https://github.com/YOUR_USER/gamehall-monolith.git
cd gamehall-monolith

# 2. 一键构建并启动 Redis 与 Go 棋牌单体微内核
docker compose up -d

# 3. 查看容器健康状态与运行日志
docker compose ps
docker compose logs -f gamehall-server
```

---

## 🚀 三、方式 2：Systemd 原生生产级部署 (高性能)

```bash
git clone https://github.com/YOUR_USER/gamehall-monolith.git
cd gamehall-monolith

chmod +x deploy/linux_install.sh
./deploy/linux_install.sh
```

脚本将自动编译静态二进制、注册 `/etc/systemd/system/gamehall.service` 守护进程并开启开机自启。

---

## 🌐 四、Cloudflare Tunnel 公网安全穿透 (免公网 IP / 免开放安全组端口)

若服务器处于内网 NAT、家庭宽带或云厂商安全组不想对外暴露真实 IP：

```bash
chmod +x deploy/linux_tunnel.sh
./deploy/linux_tunnel.sh
```

- 若已填 `CLOUDFLARE_TUNNEL_TOKEN`，自动启动正式生产级自定域名隧道。
- 若留空，自动生成免费临时的 `https://*.trycloudflare.com` HTTPS 专属域名。

---

## 🤖 五、Telegram Bot 全服管理员系统

在 Telegram 中直接向你的 Bot 发送管理员指令：
- `/status`：查看在线房间数、玩家数、系统内存利用率与 Goroutine 并发数。
- `/addcoins user_me 50000`：即时为指定账号发放金币。
- `/broadcast <内容>`：向全服所有对局牌桌弹幕广播系统通知。
- `/help`：查看所有指令清单。

---

## ⚙️ 六、Linux 万人高并发系统内核调优 (针对 50,000+ QPS)

编辑 `/etc/sysctl.conf` 添加以下高并发网络参数：

```ini
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
```

执行使配置生效：
```bash
sudo sysctl -p
```

编辑 `/etc/security/limits.conf` 解除打开文件句柄数上限：
```text
* soft nofile 65535
* hard nofile 65535
```
