# 部署指南 - K12 Advisor Intake System

## 通过 Vercel 部署

### 前置条件
- GitHub 账户（项目需要推送到 GitHub）
- Vercel 账户
- 权限访问 SKY MIRROR 官网的 Vercel 项目

### 部署步骤

#### 1. 推送代码到 GitHub

```bash
# 初始化 Git 仓库（如果还未初始化）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: K12 Advisor Intake System with Vercel deployment config"

# 添加远程仓库（替换为实际的 GitHub 仓库 URL）
git remote add origin https://github.com/yourusername/k12-advisor-intake.git

# 推送到 main 分支
git push -u origin main
```

#### 2. 在 Vercel 中导入项目

1. 访问 [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择 GitHub 仓库 (k12-advisor-intake)
4. 点击 "Import"

#### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的_Publishable_Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_Anon_Key
SUPABASE_SECRET_KEY=你的_Secret_Key
SUPABASE_SERVICE_ROLE_KEY=你的_Service_Role_Key
WECOM_WEBHOOK_URL=企业微信_Webhook_URL
WECOM_HIGH_PRIORITY_WEBHOOK_URL=企业微信高优先级_Webhook_URL
ADMIN_ACCESS_PASSWORD=顾问工作台登录密码
NEXT_PUBLIC_SITE_URL=https://www.skymirror.tech
```

#### 4. 配置部署位置

**选项 A：部署到二级路径（如 www.skymirror.tech/advisor）**

编辑 `next.config.js`，取消注释 `basePath` 配置：

```javascript
basePath: '/advisor',  // 或其他路径
```

**选项 B：部署到子域名（如 advisor.skymirror.tech）**

- 不需要配置 basePath
- 在 Vercel 中配置自定义域名

#### 5. 开始部署

1. 完成环境变量配置后，点击 "Deploy"
2. 等待部署完成（通常 2-5 分钟）
3. 部署完成后获得 Vercel URL

#### 6. 配置自定义域名（如需要）

1. 在 Vercel 项目设置中选择 "Domains"
2. 添加自定义域名（如 `www.skymirror.tech` 或 `advisor.skymirror.tech`）
3. 根据提示配置 DNS 记录

### 部署后验证

- 访问 `https://your-deployment-url/` - 应看到首页
- 访问 `https://your-deployment-url/advisor` - 应看到顾问工作台
- 访问 `https://your-deployment-url/questionnaire` - 应看到前诊问卷

### 环境变量获取说明

**Supabase 环境变量**
- 在 Supabase 项目设置的 "API" 部分获取

**企业微信 Webhook URL**
- 登录企业微信后台，在"应用管理"中创建 Webhook

**ADMIN_ACCESS_PASSWORD**
- 自行设置，用于顾问工作台登录

### 持续部署

- 每当 main 分支有新提交时，Vercel 会自动部署
- 可在 Vercel 仪表板中查看部署历史和日志

### 故障排查

**部署失败**
- 检查 Vercel 部署日志（Deployments → Build Logs）
- 确认所有必需的环境变量都已设置

**页面 404**
- 验证 basePath 配置是否正确
- 检查自定义域名配置

**连接 Supabase 失败**
- 验证环境变量是否正确
- 检查 Supabase 项目是否在线

### 生产环境建议

1. **启用 Preview Deployments**
   - 每个 PR 都会获得预览 URL，便于测试

2. **配置分支保护**
   - 在 GitHub 中设置 main 分支需要代码审查才能合并

3. **监控和告警**
   - 在 Vercel 中启用错误追踪和告警

4. **定期备份**
   - 定期备份 Supabase 数据

### 相关文档

- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Supabase 官方文档](https://supabase.com/docs)
