# Google Compute Engine 部署指南

这份说明适用于当前仓库：`Next.js 15 + Node.js + Supabase + 企业微信 webhook`。

推荐部署方式：

- 如果你已经买好了一台 Google 云服务器（VM / Compute Engine），按这份文档部署
- 如果你只是想把项目放到 Google 云上，后续也可以改成 Cloud Run + Docker，会更省运维

仓库里已经附带了两份自动化脚本：

- `scripts/bootstrap-gce.sh`：首次初始化服务器
- `scripts/deploy-gce.sh`：后续一键发布

对应配置模板：

- `.deploy/gce.env.example`

## 1. 服务器准备

建议配置：

- Ubuntu 22.04 LTS
- 2 vCPU / 2 GB 内存起步
- 开放端口：`22`、`80`、`443`

本地连接服务器：

```bash
ssh your_user@your_server_ip
```

## 2. 准备部署配置

先在本地创建部署配置文件：

```bash
cp .deploy/gce.env.example .deploy/gce.env
```

然后填写：

- 服务器 IP
- SSH 用户
- GitHub 仓库地址
- 域名
- Supabase / 企业微信 / 后台密码等生产环境变量

## 3. 首次初始化服务器

先把代码上传到 GitHub，并在服务器把仓库拉下来一次：

```bash
ssh your_user@your_server_ip
sudo apt update
sudo apt install -y git
sudo mkdir -p /var/www/k12consult
sudo chown $USER:$USER /var/www/k12consult
git clone <你的 GitHub 仓库地址> /var/www/k12consult
cd /var/www/k12consult
DEPLOY_PATH=/var/www/k12consult DOMAIN=your-domain.com SERVER_NAMES="your-domain.com www.your-domain.com" bash scripts/bootstrap-gce.sh
```

这个脚本会自动：

- 安装 `curl`、`git`、`nginx`、`nodejs`、`pm2`
- 创建应用目录
- 如果已经填写域名，会自动写入 Nginx 配置

## 4. 一键部署应用

回到你本地电脑，在仓库根目录执行：

```bash
bash scripts/deploy-gce.sh .deploy/gce.env
```

这个脚本会自动：

- SSH 连接服务器
- 拉取最新代码
- 上传 `.env.local`
- 执行 `npm install`
- 执行 `npm run build`
- 用 PM2 启动或重启服务

## 5. 安装基础环境（手动方式）

如果你不想用脚本，也可以手动执行：

```bash
sudo apt update
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

检查版本：

```bash
node -v
npm -v
pm2 -v
```

## 6. 拉取项目代码

选择一个目录，例如：

```bash
cd /var/www
sudo mkdir -p k12consult
sudo chown $USER:$USER k12consult
cd k12consult
git clone <你的 GitHub 仓库地址> .
```

安装依赖：

```bash
npm install
```

## 7. 配置生产环境变量

先创建 `.env.local`：

```bash
cp .env.example .env.local
```

至少建议填写这些变量：

```bash
NEXT_PUBLIC_SITE_URL=https://你的域名
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=你的_supabase_secret_key
WECOM_WEBHOOK_URL=你的企微webhook
ADMIN_ACCESS_PASSWORD=你自己设置的后台密码
ADVISOR_INVITE_CODE=顾问注册邀请码
```

可选兼容变量：

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WECOM_HIGH_PRIORITY_WEBHOOK_URL=
```

说明：

- 如果不填 Supabase，项目会回退到本地 `data/db.json`
- 生产环境更推荐接入 Supabase，不建议长期使用本地 JSON
- `NEXT_PUBLIC_SITE_URL` 要改成你的真实域名，避免页面里仍然引用本地地址

## 8. 初始化 Supabase

如果你启用 Supabase，在 Supabase SQL Editor 执行：

```sql
-- 文件位置
supabase/schema.sql
```

## 9. 构建并启动 Next.js

先测试生产构建：

```bash
npm run build
```

如果构建成功，用 PM2 启动：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

检查服务状态：

```bash
pm2 status
pm2 logs k12consult
curl http://127.0.0.1:3000
```

如果你不想用 PM2，也可以直接启动：

```bash
npm run start
```

但这样进程断开后服务会停止，不适合正式环境。

## 10. 配置 Nginx 反向代理

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/k12consult
```

写入：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/k12consult /etc/nginx/sites-enabled/k12consult
sudo nginx -t
sudo systemctl restart nginx
```

## 11. 配置域名和 HTTPS

先把域名解析到这台 Google 云服务器公网 IP。

然后安装证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

完成后，站点就会自动切到 `https`。

## 12. 更新发布流程

以后每次发布新版本：

```bash
bash scripts/deploy-gce.sh .deploy/gce.env
```

如果你不用自动脚本，也可以继续手动执行 `git pull + npm install + npm run build + pm2 restart`。

## 13. 常见问题

### 页面打不开

检查：

- Google Cloud 防火墙是否放行 `80/443`
- Nginx 是否正常启动：`sudo systemctl status nginx`
- Node 服务是否正常启动：`pm2 status`

### 构建成功但数据不对

检查：

- `.env.local` 是否为生产值
- Supabase 表是否已经执行 `supabase/schema.sql`
- webhook 是否填了正式地址

### 重启服务器后服务没起来

重新执行：

```bash
pm2 save
pm2 startup
```

并按终端提示复制那条 `sudo` 命令执行一次。

## 14. 更省事的替代方案

如果你不一定要“自己维护一台服务器”，这个项目其实更适合：

- Vercel：最省心
- Google Cloud Run：也很适合 Next.js，运维比 VM 少很多

如果你愿意，我下一步可以直接继续帮你补：

- 一份 `Google Cloud Run` 的 `Dockerfile`
- 一份可以直接执行的服务器初始化脚本
- 一份按你当前域名和服务器 IP 定制的上线命令清单
