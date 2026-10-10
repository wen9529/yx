# Android Termux 部署指南：Go 棋牌游戏大厅全栈单体系统

本教程指导你如何将本项目完整部署在 Android 手机的 **Termux** 终端环境中，实现随时随地运行高性能棋牌服务、本地局域网对战、**Cloudflare 公网穿透 (针对大陆网络环境与证书深度优化)** 以及 **Telegram Bot 管理员监控**。

---

## 📱 一、前置准备与大陆网络关键注意事项

1. **安装最新版 Termux**：
   - 强烈建议从 [F-Droid](https://f-droid.org/packages/com.termux/) 下载最新版 Termux（切勿使用 Google Play 商店已停更版本）。
2. **授予存储与后台运行权限**：
   ```bash
   termux-setup-storage
   termux-wake-lock
   ```
   并在手机设置中，将 Termux 的**电池优化设置为“无限制/允许后台高耗电”**，锁定后台任务卡片。

3. **⚠️ Termux 大陆网络与系统证书三大坑点与解决方案**：
   - **根证书缺失问题**：Termux 默认缺少公信根证书，直接请求 HTTPS 或连接 Telegram / Cloudflare 会报错 `x509: certificate signed by unknown authority`。
     👉 **解决办法**：必须执行 `pkg install -y ca-certificates curl` 安装系统证书库。
   - **DNS 阻断与污染问题**：在大陆地区，Cloudflare 默认的 `1.1.1.1` 和 Google `8.8.8.8` DNS 存在严重丢包阻断，导致隧道无法解析边缘节点。
     👉 **解决办法**：隧道脚本强制使用阿里公共 DNS (`223.5.5.5`) 与腾讯 DNSPod (`119.29.29.29`)。
   - **IPv6 握手超时问题**：手机移动蜂窝网络（4G/5G）在 Termux 内部对 IPv6 路由支持不全，经常出现连接卡死。
     👉 **解决办法**：穿透时强制添加 `--edge-ip-version 4` 选项，仅使用 IPv4 握手。

---

## 🌟 二、核心技巧：Termux ~/.bashrc 永久自动配置 (实战精髓)

为了彻底解决 Termux 每次开启时 Go 语言报 `read udp [::1]:53: connection refused` 错误以及 Cloudflared 证书与隧道断流问题，可直接在 Termux 终端执行以下命令将环境持久化到 `~/.bashrc`：

### 方法 1：一键脚本自动写入 (推荐)
```bash
chmod +x deploy/termux_setup_bashrc.sh
./deploy/termux_setup_bashrc.sh
```

### 方法 2：手动执行写入 ~/.bashrc
```bash
cat << 'EOF' > ~/.bashrc

# 1. 自动配置 DNS (解决 Go 语言域名解析报错及 [::1]:53 拒绝连接)
mkdir -p $PREFIX/etc
echo -e "nameserver 223.5.5.5\nnameserver 119.29.29.29\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf

# 2. 启用 Go 原生 DNS 解析器并绑定根证书 (解决 TLS/SSL 握手与证书报错)
export GODEBUG=netdns=go
export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem

# 3. 自动后台启动 Cloudflared 隧道 (termux-chroot + 强制 IPv4 + HTTP/2 协议防阻断)
if ! pgrep -f cloudflared >/dev/null 2>&1; then
    # 若配置了自定 Token:
    # termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token 你的TOKEN > $HOME/cloudflared.log 2>&1 &
    # 若使用临时快速隧道 (Quick Tunnel):
    termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://127.0.0.1:8080 > $HOME/cloudflared.log 2>&1 &
fi
EOF
source ~/.bashrc
```

> **原理说明**：
> 1. `resolv.conf`：强制重定向到阿里 223.5.5.5 和腾讯 119.29.29.29，彻底根治 Android 系统下 Go 解析器盲目查询 `[::1]:53` 导致的拒绝连接故障。
> 2. `GODEBUG=netdns=go`：让 Go 使用纯 Go 网络栈代替 Android 底层不兼容的 libc resolver。
> 3. `SSL_CERT_FILE`：告诉 Go 和 cloudflared 证书就在 Termux 的 `$PREFIX/etc/tls/cert.pem`，杜绝证书不受信任报错。
> 4. `termux-chroot`：利用 proot 映射 Linux 标准根路径，配合 `--protocol http2` 绕过国内运营商对 UDP/QUIC 数据包的干扰丢包。

---

## ⚙️ 三、配置环境变量文件 (.env 建议放在项目上一级目录)

> 💡 **防覆盖绝招（极度推荐）**：  
> **将 `.env` 创建在项目的上一级目录（`../.env`）**！  
> **原因**：如果放在仓库内部，后续通过 `git pull` 更新项目代码时，容易发生冲突或不小心被覆盖重置。  
> 本系统已做深度智能化适配：Go 单体服务与所有自动化部署脚本均**优先自动向上寻找并加载 `../.env`**。更新代码直接 `git pull`，零风险、免维护！

```bash
# 1. 推荐：在项目上一级目录创建 .env (防 Git Pull 更新覆盖)
cp .env.example ../.env
nano ../.env   # 或使用 vi 编辑配置
```

关键配置示例：
```env
# 基础服务端口
HTTP_PORT=8080
GRPC_PORT=50051
REDIS_ADDR=127.0.0.1:6379

# Telegram Bot 管理员监控 (可选)
# 1. 在 Telegram 找 @BotFather 创建 Bot 获得 Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
# 2. 在 Telegram 找 @userinfobot 查看你的个人数字 ID
TELEGRAM_ADMIN_ID=987654321

# Cloudflare 穿透隧道配置 (留空则使用免登录 Quick Tunnel 临时域名)
CLOUDFLARE_TUNNEL_TOKEN=
# 大陆优化 DNS (避开 1.1.1.1 / 8.8.8.8)
CLOUDFLARE_DNS=223.5.5.5,119.29.29.29
# 强制使用 IPv4 (解决 Termux 移动蜂窝网络卡死)
CLOUDFLARE_EDGE_IP_VERSION=4
```

---

## ⚡ 三、方式 A：一键全自动部署 (推荐)

直接从你的 GitHub 仓库拉取后运行一键脚本：

```bash
# 1. 更新环境并安装基础工具与根证书
pkg update -y && pkg install -y git ca-certificates

# 2. 克隆你的 GitHub 仓库
git clone https://github.com/YOUR_USER/gamehall-monolith.git
cd gamehall-monolith

# 3. 授予执行权限并启动棋牌单体大厅
chmod +x deploy/*.sh
./deploy/termux_install.sh
```

---

## 🌐 四、开启 Cloudflare 公网隧道穿透 (手机直接变全球服务器)

如果希望朋友即使不在同一 WiFi 下也能远程通过公网 HTTPS 访问你的手机棋牌大厅：

```bash
./deploy/termux_tunnel.sh
```

脚本将自动：
1. 检测并下载针对手机 ARM64 架构优化的 `cloudflared` 二进制。
2. 携带 `--edge-ip-version 4` 与 `--dns 223.5.5.5,119.29.29.29` 启动。
3. 若未填 Token，自动建立 Quick Tunnel 并在终端输出公网网址：
   ```
   ==================================================================
     ✓ Cloudflare 隧道穿透成功！
     🌐 公网访问地址 (HTTPS): https://gamehall-demo-xxxx.trycloudflare.com
     本地服务端口: http://127.0.0.1:8080
     优化 DNS: 223.5.5.5,119.29.29.29 | 网络模式: IPv4
   ==================================================================
   ```
将输出的 HTTPS 链接发送给好友，对方在手机或电脑浏览器打开即可与你跨公网实时对战！

---

## 🤖 五、Telegram Bot 管理员功能使用

若在 `.env` 中配置了 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_ADMIN_ID`，Go 服务启动后会自动开启 Telegram 轮询守护线程：

- **查看全服状态**：在 Telegram 向你的 Bot 发送 `/status`
  > 返回活跃 Goroutine 数量、内存占用、当前运行中的牌桌数、Redis 延迟及系统时间。
- **给玩家充值/增发金币**：发送 `/addcoins user_me 50000`
  > 立即通过结算账本原子发放金币并生成交易 TxID。
- **全服发送系统广播弹幕**：发送 `/broadcast 晚上8点开启锦标赛！`
  > 实时同步至各个房间的聊天通道中。
- **获取帮助**：发送 `/help`

---

## 💬 六、牌桌实时聊天功能

牌桌内已集成实时聊天系统：
- 点击右上方 **“实时对局聊天”** 或底部玩家信息栏 **“聊天互动”**。
- 支持快捷经典牌桌短语（“快点吧，我等的花儿都谢了！”、“手气不错，今天赢大奖！”等）。
- 支持趣味游戏表情（🍻, 🚀, 💣, 💰, 👏）。
- 发送后在玩家头像上方以**气泡弹窗**实时浮现，AI 机器人对手也会智能互动回复。

---

## 🔍 七、Termux 常见问题速查 (FAQ)

### Q1: 锁屏一段时间后网页无法访问？
- 执行 `termux-wake-lock`，并将手机系统的 Termux 电池优化策略设为“无限制允许后台耗电”。

### Q2: 提示 `x509: certificate signed by unknown authority`？
- 执行 `pkg install -y ca-certificates` 安装系统根证书包。

### Q3: Cloudflare 隧道提示连接超时或无法握手？
- 确认脚本包含 `--edge-ip-version 4` 且使用了阿里 DNS `223.5.5.5`，避免被运营商拦截 1.1.1.1。
