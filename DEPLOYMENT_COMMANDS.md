# 🚀 部署命令执行清单

## ✅ 阶段 1: 本地代码准备

### 步骤 1: 确认本地环境
```bash
cd /Users/luweihua/VSCode/Codex/k12consult

# 检查 Git 状态
git status

# 应该看到部署配置文件和脚本
# 例如: next.config.js, vercel.json, DEPLOYMENT.md 等
```

### 步骤 2: 提交所有更改到本地 Git
```bash
git add .

git commit -m "🚀 Complete Vercel deployment configuration

Add:
- Next.js configuration with basePath support
- Vercel platform configuration
- Comprehensive deployment documentation
- Automated deployment scripts
- GitHub Actions CI/CD workflow

Ready for production deployment to company website."
```

### 步骤 3: 推送到 GitHub
```bash
git push origin main
```

✅ **本地代码推送完成！**

---

## ✅ 阶段 2: Vercel 仪表板配置（网页操作）

### 步骤 1: 访问 Vercel
打开链接: https://vercel.com/dashboard

### 步骤 2: 导入项目
1. 点击 "Add New..." 按钮
2. 选择 "Project"
3. 从左侧菜单选 "GitHub"
4. 搜索你的仓库名称 (例如: k12-advisor-intake)
5. 点击 "Import"

### 步骤 3: 配置构建设置
- Framework: Next.js (自动检测)
- Root Directory: ./ (默认保持)
- Build Command: npm run build (默认保持)
- Output Directory: .next (默认保持)

### 步骤 4: 配置环境变量 ⭐ 重要
在 Vercel 面板添加以下环境变量：

**从你的 .env.local 文件中复制对应的值**

```
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=<你的值>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<你的值>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<你的值>
SUPABASE_SECRET_KEY=<你的值>
SUPABASE_SERVICE_ROLE_KEY=<你的值>

# Enterprise WeChat
WECOM_WEBHOOK_URL=<你的值>
WECOM_HIGH_PRIORITY_WEBHOOK_URL=<你的值>

# Admin Access
ADMIN_ACCESS_PASSWORD=<设置强密码>

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://www.skymirror.tech
```

### 步骤 5: 开始部署
- 点击 "Deploy" 按钮
- 等待部署完成（通常 2-5 分钟）

✅ **Vercel 部署完成！** 获得临时 URL: https://xxx.vercel.app

---

## ✅ 阶段 3: 配置自定义域名（二选一）

### 方案 A: 子域名方式（推荐）🌟

**目标**: `https://advisor.skymirror.tech`

1. 在 Vercel 项目中进入 "Settings" → "Domains"
2. 点击 "Add domain"
3. 输入: `advisor.skymirror.tech`
4. Vercel 显示需要的 DNS 记录
5. 登录你的域名提供商（例如: GoDaddy、腾讯云等）
6. 添加 Vercel 显示的 DNS 记录
7. 等待 DNS 生效（5-30 分钟）

### 方案 B: 二级路径方式

**目标**: `https://www.skymirror.tech/advisor`

1. 本地编辑 `next.config.js`
2. 找到这一行（大约第30行）：
   ```javascript
   // basePath: '/advisor',
   ```
3. 取消注释并改为：
   ```javascript
   basePath: '/advisor',
   ```
4. 提交并推送:
   ```bash
   git add next.config.js
   git commit -m "Configure basePath for /advisor deployment"
   git push origin main
   ```
5. Vercel 会自动重新部署
6. 在 Vercel Domains 中配置 `www.skymirror.tech` 自定义域名

✅ **自定义域名配置完成！**

---

## ✅ 部署后验证

### 验证 1: 测试 Vercel 临时 URL
```bash
# 替换为你的实际 URL
DEPLOY_URL="https://k12-advisor-intake.vercel.app"

# 测试首页
curl -I "$DEPLOY_URL"

# 测试问卷页面
curl -I "$DEPLOY_URL/questionnaire"

# 测试顾问台
curl -I "$DEPLOY_URL/advisor"
```

### 验证 2: 运行自动化验证脚本
```bash
# 替换为你的实际部署 URL
bash scripts/post-deployment-verify.sh https://k12-advisor-intake.vercel.app
```

### 验证 3: 浏览器测试
在浏览器中打开并测试：
- [ ] https://advisor.skymirror.tech/ (首页)
- [ ] https://advisor.skymirror.tech/questionnaire (问卷)
- [ ] https://advisor.skymirror.tech/advisor (工作台)

**预期结果**：
- ✓ 页面加载速度快 (< 3秒)
- ✓ 样式显示正常
- ✓ 表单可交互
- ✓ 没有控制台错误

### 验证 4: 数据库连接
访问 https://advisor.skymirror.tech/advisor

查看页面顶部状态卡：
- ✓ "已经连上 Supabase" ← 如果看到这个说明成功
- 或 "还没有切到 Supabase" ← 需要检查环境变量

### 验证 5: 企业微信通知（如配置）
在 /advisor 页面找 "通知联调" 部分，点击测试按钮验证通知

✅ **部署后验证完成！**

---

## 📊 部署监控

### 实时监控
1. Vercel Dashboard → Deployments
2. 查看最新部署状态
3. 查看构建日志

### 错误追踪
1. Vercel Dashboard → Analytics
2. 监控性能指标
3. 查看错误日志

---

## 🎯 部署完成清单

```
❌ → ✅

部署前:
  ❌ 代码推送到 GitHub
  ❌ Vercel 项目导入
  ❌ 环境变量配置
  ❌ 自定义域名配置

部署中:
  ❌ 自动构建 (2-5分钟)
  ❌ 自动部署

部署后:
  ❌ 验证所有页面可访问
  ❌ 验证数据库连接
  ❌ 验证通知系统
  ❌ 监控错误日志

完成!
```

---

## 🆘 部署遇到问题？

请参考以下文档（项目根目录）：

1. **DEPLOYMENT.md** - 详细部署指南 + 故障排查
2. **QUICK_DEPLOYMENT_REFERENCE.md** - 快速参考卡片
3. **Vercel 官方文档** - https://vercel.com/docs

常见问题：
- 构建失败 → 查看 Vercel Build Logs
- 页面 404 → 检查域名配置和 basePath
- 数据库连接失败 → 验证环境变量完整性

---

## ✨ 部署命令速查

```bash
# 本地测试构建
npm run build
npm run start

# 推送代码
git push origin main

# 部署后验证
bash scripts/post-deployment-verify.sh <url>

# 查看部署状态
npm run dev
```

---

⏱️ **预计总耗时**: 5-10 分钟（不含 DNS 生效时间）

🎉 **祝部署顺利！**
