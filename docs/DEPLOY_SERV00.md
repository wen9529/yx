# serv00 (FreeBSD) 部署指南：Go 棋牌游戏大厅全栈单体系统

本教程指导你如何将本项目部署在著名的免费 FreeBSD 云主机 **serv00.com** 上，包含非 root 权限适配、Devil 端口申请、用户态 Go 环境搭建与 Crontab 保活守护。

---

## ☁️ 一、serv00 平台特性与核心须知

1. **操作系统**：FreeBSD 14.x (amd64 架构)。
2. **权限限制**：标准非 root 用户环境，无法使用 `sudo` 或 `apt`/`yum`。
3. **端口策略**：禁止监听 1-1024 特权端口，必须通过 Devil 系统申请专用的高位 TCP 端口 (10000 - 65535)。
4. **进程管理**：serv00 会定期清理长时间运行的后台进程，因此**必须配置 Crontab 看门狗自动拉起**。

---

## ⚡ 二、方式 A：一键全自动部署 (推荐)

SSH 登录进入你的 serv00 终端：

```bash
# 1. 登录 serv00 (将 sX 与 username 替换为你的真实信息)
ssh username@sX.serv00.com

# 2. 克隆你的 GitHub 仓库
git clone https://github.com/YOUR_USER/gamehall-monolith.git
cd gamehall-monolith

# 3. 复制并配置 .env 环境变量 (强烈推荐放置在项目上一级目录，防 git pull 覆盖)
cp .env.example ../.env
# 编辑配置 (若需要配置 Telegram Bot 或自定义端口):
nano ../.env

# 4. 运行一键适配脚本
chmod +x deploy/serv00_install.sh deploy/keepalive_serv00.sh
./deploy/serv00_install.sh
```

脚本将自动完成：
- 启用 `devil binexec on` 后台执行权限
- 自动下载 FreeBSD 版 Go 1.22 静态编译工具链到 `~/opt/go`
- 自动适配高位端口并编译 FreeBSD 原生静态二进制
- 注册 Crontab 5 分钟定时看门狗，确保被杀死后自动恢复运行

---

## 🛠️ 三、方式 B：手动详细步骤解析

### 1. 启用后台运行权限 (必需)
serv00 默认限制非交互进程，首先运行：
```bash
devil binexec on
```

### 2. 申请并查看专属 TCP 端口
在 serv00 中申请 2 个高位 TCP 端口（一个用于 HTTP 网关，一个用于 gRPC）：
```bash
# 查看当前已有端口
devil port list

# 若无空闲端口，申请新的 TCP 端口
devil port add tcp
devil port add tcp
```
> 记下申请到的两个端口，例如 `28080` (HTTP) 和 `28081` (gRPC)。

### 3. 配置用户态 FreeBSD Go 环境
若系统未内置 `go` 命令，可在个人目录快速解压安装：
```bash
mkdir -p $HOME/opt && cd $HOME/opt
fetch https://go.dev/dl/go1.22.2.freebsd-amd64.tar.gz
tar -xzf go1.22.2.freebsd-amd64.tar.gz
rm -f go1.22.2.freebsd-amd64.tar.gz

# 写入用户环境变量
echo 'export GOROOT=$HOME/opt/go' >> ~/.profile
echo 'export PATH=$HOME/opt/go/bin:$PATH' >> ~/.profile
source ~/.profile

# 验证
go version
```

### 4. 配置 Redis 内存数据库选项
在 serv00 上推荐两种 Redis 方案：
- **方案 1：使用免费云端 Redis (推荐，如 Upstash)**：
  在 [upstash.com](https://upstash.com) 免费创建 Redis 数据库，获取连接地址（例如 `red-xxxxx.upstash.io:6379`）与密码。
- **方案 2：使用本地独立端口**：
  若在 serv00 本地运行，需配置对应端口和数据目录。

### 5. 编译 Go 棋牌单体微内核
```bash
cd ~/gamehall-monolith/server_go
export CGO_ENABLED=0
export GOOS=freebsd
export GOARCH=amd64

go build -ldflags="-s -w" -o bin/gamehall-monolith ./main.go
chmod +x bin/gamehall-monolith
```

### 6. 启动服务与环境变量传参
将 `28080`、`28081` 和 Redis 地址替换为你实际的参数：
```bash
nohup env HTTP_PORT=28080 \
          GRPC_PORT=28081 \
          REDIS_ADDR="127.0.0.1:6379" \
          ./bin/gamehall-monolith > $HOME/gamehall.log 2>&1 &
```

---

## ⏰ 四、配置 Crontab 看门狗 (防止被清退)

输入命令编辑计划任务：
```bash
crontab -e
```
添加以下行（每 5 分钟检查一次，若进程挂掉则自动重新拉起）：
```cron
*/5 * * * * /bin/sh $HOME/gamehall-monolith/deploy/keepalive_serv00.sh >/dev/null 2>&1
```

---

## 🌐 五、绑定 serv00 域名或 Web 代理 (可选)

通过 Devil 面板将已申请的 HTTP 端口直接绑定到你的二级域名：
1. 运行 `devil www add yourname.serv00.net proxy localhost 28080`
2. 此时外部直接访问 `http://yourname.serv00.net` 即可直接进入游戏大厅！

---

## 🔍 六、serv00 常用管理命令

- 查看实时运行日志：`tail -f $HOME/gamehall.log`
- 查看进程占用：`ps aux | grep gamehall`
- 强制重启服务：`pkill -f gamehall-monolith && /bin/sh $HOME/gamehall-monolith/deploy/keepalive_serv00.sh`
