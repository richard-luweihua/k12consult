# 🚀 K12 Advisor 系统部署快速参考

## 30秒快速部署总结

```
代码 → GitHub → Vercel → 公司官网
```

## 🚀 快速开始选项

### ⚡ 一键自动部署 (推荐)
```bash
./scripts/auto-deploy.sh https://github.com/YOUR_USERNAME/k12consult
```
**自动完成**: Git初始化 → 代码推送 → Vercel部署指导

### 🔧 手动三步部署
1. `git push origin main`
2. Vercel导入项目
3. 配置环境变量

---

## 三步开始部署

### 1️⃣ 准备代码
```bash
cd /Users/luweihua/VSCode/Codex/k12consult
npm install
npm run build  # 验证构建成功
git push origin main
```

### 2️⃣ 在 Vercel 中连接
- 访问 https://vercel.com/dashboard
- 导入 GitHub 仓库
- 配置环境变量（见下方）

### 3️⃣ 等待部署完成
- Vercel 会自动部署
- 通常 2-5 分钟完成
- 获得部署 URL

## 环境变量清单

复制这些到 Vercel 项目设置 → Environment Variables：

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

## 部署位置配置

### 方案 A：子域名（推荐 ✨）
- 配置: advisor.skymirror.tech
- 优点: URL 简洁，无需修改代码
- 在 Vercel 中配置自定义域名

### 方案 B：二级路径
- 配置: www.skymirror.tech/advisor
- 需要修改: 编辑 next.config.js
- 取消注释: `basePath: '/advisor'`

## 部署后检查

| 页面 | URL | 预期 |
|------|-----|------|
| 首页 | / | 加载成功 |
| 问卷 | /questionnaire | 表单可点击 |
| 结果 | /result/:id | 显示诊断结果 |
| 顾问台 | /advisor | 显示队列信息 |

## 常见问题

| 问题 | 解决方案 |
|------|--------|
| 构建失败 | 查看 Vercel Build Logs，检查环境变量 |
| 页面 404 | 检查 basePath 配置和路由 |
| 数据库连接失败 | 验证 Supabase 环境变量 |
| 样式丢失 | 确认 CSS 文件已编译 |

## 部署检查清单

```bash
# 运行自动检查（推荐）
bash scripts/pre-deployment-check.sh

# 或手动检查
npm run build        # ✓ 构建成功
git status          # ✓ 所有文件已提交
git log --oneline   # ✓ 查看最近提交
```

## 回滚命令

如果部署出现问题：

1. 在 Vercel 仪表板找到上一个部署
2. 点击 "Redeploy"
3. 验证恢复正常

## 关键文件位置

| 文件 | 用途 |
|------|------|
| next.config.js | Next.js 构建配置 |
| vercel.json | Vercel 部署配置 |
| DEPLOYMENT.md | 详细部署指南 |
| .github/workflows/ci.yml | 自动化检查 |

## 快速启动命令

```bash
# 快速启动开发环境
bash scripts/quick-start.sh

# 本地快速构建测试
npm run build && npm run start
```

## 监控部署

```
Vercel Dashboard
    ↓
Deployments 标签
    ↓
查看实时日志和状态
```

## 数据库初始化

```bash
# 在 Supabase SQL Editor 执行
cat supabase/schema.sql

# 自动初始化默认数据
# 第一次访问 /advisor 时自动创建顾问数据
```

## 错误日志位置

| 位置 | 内容 |
|------|------|
| Vercel 仪表板 | 构建日志、部署日志 |
| 浏览器控制台 | 前端错误 |
| 服务端日志 | Next.js 错误 |

## 常用命令参考

```bash
# 开发
npm run dev

# 构建
npm run build

# 生产环境运行
npm run start

# 代码检查
npm run lint

# 提交代码
git add .
git commit -m "message"
git push origin main
```

## 获取帮助

1. 📖 详细文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
2. ✅ 检查清单: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. 📋 配置总结: [VERCEL_DEPLOYMENT_SUMMARY.md](./VERCEL_DEPLOYMENT_SUMMARY.md)
4. 🔧 脚本帮助: `bash scripts/pre-deployment-check.sh`

## 关键数字

- ⏱️ 构建时间: ~8-20 秒
- 🎯 首屏加载: < 3 秒
- 💾 构建大小: ~106 KB (First Load JS)
- 🔄 部署耗时: 2-5 分钟

## 部署状态

```
✅ 代码: 已准备
✅ 配置: 已配置
✅ 构建: 成功 ✓ 13/13 页面
✅ 文档: 完整
```

---

**准备部署？** → 执行 `bash scripts/pre-deployment-check.sh`  
**需要帮助？** → 查看 DEPLOYMENT.md

**项目准备完毕，祝部署顺利！** 🎉
