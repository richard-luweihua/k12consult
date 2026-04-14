# 🚀 部署执行指南 - K12 Advisor Intake System

**准备时间**: 2026年4月14日  
**部署目标**: Vercel → 公司官网二级页面  
**状态**: ✅ 所有检查通过

---

## 🤖 自动配置选项

如果您希望自动配置 Git 和 Vercel 部署，请使用提供的自动化脚本：

### 自动部署脚本

```bash
# 方法1: 仅GitHub推送 (推荐用于手动Vercel配置)
./scripts/auto-deploy.sh https://github.com/YOUR_USERNAME/k12consult

# 方法2: 完整自动部署 (需要Vercel token)
./scripts/auto-deploy.sh https://github.com/YOUR_USERNAME/k12consult YOUR_VERCEL_TOKEN
```

**脚本功能**:
- ✅ 自动初始化Git仓库（如需要）
- ✅ 设置GitHub远程仓库
- ✅ 推送代码到GitHub
- ✅ 可选：自动登录Vercel并部署

**获取Vercel Token**:
1. 访问: https://vercel.com/account/tokens
2. 创建新token: "K12Consult Deployment"
3. 复制token并在脚本中使用

---

## 📋 部署前检查结果

```
✅ 开发环境
  ✓ Node.js: v22.22.0
  ✓ npm: 10.9.4

✅ 项目配置
  ✓ 依赖已安装: node_modules/
  ✓ 环境变量: .env.local
  ✓ 配置文件: next.config.js
  ✓ Vercel配置: vercel.json

✅ 构建测试
  ✓ 编译成功
  ✓ 生成 15/15 路由
  ✓ 静态页面: 13/13
  ✓ 构建大小: ~106 KB (First Load JS)
  ✓ 无错误

✅ 文档完备
  ✓ DEPLOYMENT.md
  ✓ 部署检查清单
  ✓ 快速参考卡片
```

---

## 🎯 部署分三个阶段

### 阶段 1️⃣: 代码推送到 GitHub (本地执行)

**步骤 1: 确认所有更改**
```bash
cd /Users/luweihua/VSCode/Codex/k12consult
git status
```

**步骤 2: 添加所有文件并提交**
```bash
git add .
git commit -m "feat: 🚀 Vercel deployment configuration complete

- Add next.config.js with basePath support
- Add vercel.json with platform configuration
- Create comprehensive deployment documentation
- Add automated deployment check scripts
- Add GitHub Actions CI/CD workflow"
```

**步骤 3: 推送到 GitHub**
```bash
git push origin main
```

---

### 阶段 2️⃣: 在 Vercel 中导入项目 (网页执行)

**步骤 1: 访问 Vercel 仪表板**
- 打开: https://vercel.com/dashboard
- 登录你的 Vercel 账户

**步骤 2: 导入项目**
- 点击: "Add New..." → "Project"
- 选择: GitHub
- 搜索并选择: `k12-advisor-intake` (或你的仓库名)
- 点击: "Import"

**步骤 3: 配置项目设置**
- Framework Preset: 自动检测为 Next.js ✓
- Root Directory: ./ (默认)
- Build Command: npm run build (默认) ✓
- Output Directory: .next (默认) ✓

**步骤 4: 配置环境变量**

点击 "Environment Variables" 并添加以下变量（值从你的 .env.local 复制）：

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WECOM_WEBHOOK_URL=
WECOM_HIGH_PRIORITY_WEBHOOK_URL=
ADMIN_ACCESS_PASSWORD=
NEXT_PUBLIC_SITE_URL=https://www.skymirror.tech
```

**说明**:
- `NEXT_PUBLIC_*` 开头的环境变量会暴露到前端
- 其他环境变量仅在服务端使用
- 所有敏感信息（密钥、密码）只在 Vercel 中配置，不提交到 Git

---

### 阶段 3️⃣: 部署 (Vercel 自动执行)

**步骤 1: 开始部署**
- 完成环境变量配置后
- 点击: "Deploy"
- Vercel 会开始自动部署

**步骤 2: 监控部署进度**
- 查看 "Deployments" 标签
- 实时查看构建日志
- 等待部署完成（通常 2-5 分钟）

**步骤 3: 获得部署 URL**
- 部署完成后会显示 URL
- 例如: https://k12-advisor-intake.vercel.app
- 这是临时 URL，下一步配置自定义域名

---

## 🌐 配置自定义域名（选择其中一个）

### 方案 A: 子域名（推荐 ⭐）

**目标**: `advisor.skymirror.tech`

**步骤**:
1. 在 Vercel 项目中选择 "Settings" → "Domains"
2. 点击 "Add domain"
3. 输入: `advisor.skymirror.tech`
4. Vercel 会显示 DNS 记录
5. 在你的域名控制面板中添加这些 DNS 记录
6. 等待 DNS 生效（通常几分钟到几小时）

### 方案 B: 二级路径 (需要修改代码)

**目标**: `www.skymirror.tech/advisor`

**步骤**:
1. 编辑项目中的 `next.config.js`
2. 取消注释 `basePath: '/advisor'`
3. 提交并推送代码: `git push origin main`
4. Vercel 会自动重新部署
5. 在 Vercel 中配置 `www.skymirror.tech` 为自定义域名

---

## ✅ 部署完成验证

部署成功后，验证以下 URL 都能正常访问：

```
部署 URL 测试:
  □ https://your-deployment-url/ 
    预期: 首页加载，显示"先把判断做专业"

  □ https://your-deployment-url/questionnaire
    预期: 问卷表单可见

  □ https://your-deployment-url/advisor
    预期: 顾问工作台显示队列数据

自定义域名测试:
  □ https://advisor.skymirror.tech/ (if using subdomain)
    或 https://www.skymirror.tech/advisor (if using subpath)
    预期: 与部署 URL 相同
```

**运行自动验证脚本**:
```bash
bash scripts/post-deployment-verify.sh https://your-deployment-url
```

---

## 🔐 部署后安全检查

- [ ] HTTPS 已启用（Vercel 自动处理）
- [ ] 管理员密码已设置 (ADMIN_ACCESS_PASSWORD)
- [ ] Supabase 连接正常 (检查 /advisor 页面状态)
- [ ] 企业微信通知已测试 (如配置)
- [ ] 错误日志已启用

---

## 📊 部署状态监控

**实时监控**:
1. Vercel Dashboard → Deployments
2. 查看构建日志、性能指标
3. 监控错误追踪

**定期检查**:
- 每天检查错误日志
- 监控性能指标
- 备份数据库

---

## 🆘 部署遇到问题？

### 问题 1: 构建失败

**检查步骤**:
1. 查看 Vercel 的 "Build Logs"
2. 本地运行: `npm run build`
3. 检查所有环境变量是否完整
4. 查看 GitHub Actions 的 CI 日志

### 问题 2: 页面 404

**检查步骤**:
1. 确认自定义域名配置正确
2. 检查 DNS 是否生效
3. 检查 next.config.js 中的 basePath 配置
4. 等待 DNS 缓存清除

### 问题 3: 连接数据库失败

**检查步骤**:
1. 验证 Supabase URL 是否正确
2. 确认 API 密钥有效
3. Supabase 中执行 `supabase/schema.sql` 初始化表
4. 查看 Vercel 日志中的数据库连接错误

---

## 📞 部署完成后

1. **通知相关团队**
   - 产品团队
   - 设计团队
   - 市场团队

2. **发布公告** (可选)
   - 邮件通知用户
   - 公司内部公告
   - 社交媒体更新

3. **收集反馈**
   - 监控用户反馈
   - 追踪错误报告
   - 性能监控

4. **定期维护**
   - 每周检查日志
   - 每月数据备份
   - 按需更新部署

---

## 📚 快速命令参考

```bash
# 部署前最后检查
npm run build

# 本地测试部署
npm run start

# 推送代码
git push origin main

# 部署后验证
bash scripts/post-deployment-verify.sh <url>
```

---

## ✨ 部署流程总结

```
代码开发完成
       ↓
运行部署前检查 ✓
       ↓
推送代码到 GitHub (git push)
       ↓
在 Vercel 中导入项目
       ↓
配置环境变量
       ↓
Vercel 自动部署 (2-5分钟)
       ↓
配置自定义域名
       ↓
部署后验证
       ↓
监控和维护
```

---

**🎉 准备好部署了吗?**

如有任何问题，参考:
- 📖 DEPLOYMENT.md - 详细部署指南
- ✅ DEPLOYMENT_CHECKLIST.md - 完整检查清单
- 🔍 QUICK_DEPLOYMENT_REFERENCE.md - 快速参考
