# Vercel 部署配置总结

本项目已配置完整的 Vercel 部署支持。以下是所有相关的配置和文件说明。

## 📁 新增的部署相关文件

### 配置文件

1. **next.config.js**
   - Next.js 构建配置
   - 支持 basePath 配置（用于二级路径部署）
   - 启用了图片优化、严格模式等

2. **vercel.json**
   - Vercel 平台特定配置
   - 定义了构建命令和环境变量
   - 配置了 API 函数的资源限制

3. **.github/workflows/ci.yml**
   - GitHub Actions 工作流
   - 在推送代码时自动运行 linter 和构建检查
   - 支持 Node.js 18.x 和 20.x

### 文档

1. **DEPLOYMENT.md** 
   - 详细的部署指南
   - 涵盖 Vercel、环境变量、自定义域名配置
   - 包含故障排查部分

2. **DEPLOYMENT_CHECKLIST.md**
   - 部署前检查清单
   - 覆盖代码、配置、功能、安全等多个方面
   - 可打印用于部署记录

### 脚本

1. **scripts/pre-deployment-check.sh**
   - 自动化部署前检查脚本
   - 检查 Node.js、依赖、环境变量、构建等
   - 用法: `bash scripts/pre-deployment-check.sh`

2. **scripts/quick-start.sh**
   - 快速启动脚本
   - 自动安装依赖并启动开发服务器
   - 用法: `bash scripts/quick-start.sh`

## 🔧 配置说明

### basePath 配置（用于二级路径部署）

若需部署到 www.skymirror.tech/k12consult 路径：

1. 编辑 `next.config.js`
2. 取消注释并设置 basePath

```javascript
basePath: '/k12consult',
// 或其他路径如 '/advisor'
```

### 环境变量优先级

部署时环境变量的加载顺序：
1. Vercel 项目设置中的环境变量
2. `.env.production` 文件（如存在）
3. `.env.local` 文件（本地开发）

## 📝 部署流程

### 简快流程（5分钟）

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. 访问 Vercel 仪表板
# 项目会自动部署

# 3. 配置环境变量（在 Vercel 中）
# 4. 访问部署的 URL
```

### 完整流程

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## ✅ 部署检查

部署前建议运行检查脚本：

```bash
bash scripts/pre-deployment-check.sh
```

或手动检查清单：

```bash
# 依赖安装
npm install

# 本地构建
npm run build

# 本地启动（验证构建产物）
npm run start
```

## 🚀 已支持的部署平台

虽然项目主要针对 Vercel 优化，但也支持：

- **Vercel** ✓ (推荐)
- **Netlify** (需要简单配置)
- **AWS Amplify** (需要配置)
- **自托管服务器** (使用 `npm run build && npm run start`)

## 📊 部署架构

```
Local Repository (Git)
         ↓
   GitHub (main branch)
         ↓
Vercel (自动检测并部署)
         ↓
    www.skymirror.tech (或自定义域名)
         ↓
Next.js App Server
         ↓
Supabase Database
```

## 🔐 安全考虑

1. **环境变量**: 敏感信息仅存储在 Vercel 项目设置中
2. **.env.local**: 已添加到 .gitignore，不会被提交
3. **admin 密码**: 通过 ADMIN_ACCESS_PASSWORD 环境变量设置
4. **API 密钥**: 服务端使用 SUPABASE_SERVICE_ROLE_KEY

## 📈 监控和日志

部署后可在 Vercel 仪表板查看：

- 部署日志
- 构建时间
- 性能指标
- 错误追踪
- 分析数据

## 🔄 持续集成 (CI)

GitHub Actions 工作流在以下情况触发：

- 推送到 main 分支
- 推送到 develop 分支
- 创建 Pull Request

工作流内容：
- 运行 linter (如存在)
- 执行生产构建
- 验证构建成功

## 🆘 故障排查

### 构建失败

1. 检查 Vercel Build Logs
2. 运行本地构建: `npm run build`
3. 验证环境变量是否完整

### 连接数据库失败

1. 检查 Supabase URL 是否正确
2. 验证 API 密钥有效性
3. 确认数据库表已初始化

### 页面 404

1. 检查 basePath 配置
2. 验证路由文件夹结构
3. Vercel 重新部署

## 📚 相关文档

- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)

## 📞 技术支持

若有部署相关问题：

1. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 
2. 检查 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. 查看 Vercel 和 GitHub Actions 日志
4. 运行 `bash scripts/pre-deployment-check.sh` 诊断

---

**项目部署配置完成于**: 2026 年 4 月 14 日

**Next.js 版本**: 15.5.15  
**Node.js 最低版本**: 18.x  
**部署平台**: Vercel
