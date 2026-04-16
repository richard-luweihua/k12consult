# 香港 K12 择校前诊 MVP

一个可快速上线的第一阶段 MVP，覆盖：

- 落地页
- 前诊问卷
- 固定模板结果页
- 基础线索库
- 规则派单
- 顾问手工跟进

第二阶段已补上：

- Supabase 数据存储接入
- 企微 webhook 通知
- 渠道归因与活动统计

## 启动

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:3000`

## 页面

- `/`：落地页
- `/questionnaire`：前诊问卷
- `/result/:id`：结果页
- `/advisor`：顾问登录入口与线索库
- `/advisor/leads/:id`：线索详情与顾问跟进

## 当前实现

- 数据层支持 Supabase 优先，本地文件 [`data/db.json`](./data/db.json) 兜底
- 用户端获客前诊和顾问端跟进工作台已拆分为两套界面
- 评分维度：紧迫度、预算、意向度、复杂度
- 派单方式：规则引擎推荐 + 管理端手动改派
- 跟进方式：顾问在详情页手工追加跟进记录
- 企微通知：新线索和状态更新会尝试推送到 webhook
- 渠道统计：支持 `utm_source` / `utm_medium` / `utm_campaign` / `utm_content`

## 环境变量

复制 `.env.example` 后填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WECOM_WEBHOOK_URL=
WECOM_HIGH_PRIORITY_WEBHOOK_URL=
ADMIN_ACCESS_PASSWORD=
ADVISOR_INVITE_CODE=
```

说明：

- 没填 Supabase 时，系统自动使用本地 JSON
- 当前仓库真正启用 Supabase 的最低要求是：`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`
- 推荐使用新的 `publishable key` + `secret key`
- 兼容旧的 `anon key` + `service_role key`
- 当前这套代码暂时只在服务端直连 Supabase，所以 `publishable key` 不是必填项；它更多是给后续前端直连或鉴权扩展预留
- 填了 Supabase 但表没建好时，会回退到本地 JSON，并在服务端日志打印错误
- 没填企微 webhook 时，通知逻辑会自动跳过
- `WECOM_WEBHOOK_URL` 建议必填，`WECOM_HIGH_PRIORITY_WEBHOOK_URL` 可选，用于高优先级线索分流提醒
- 填了 `ADMIN_ACCESS_PASSWORD` 后，`/advisor`、线索详情页和管理端接口会启用登录保护
- `ADVISOR_INVITE_CODE` 用于顾问首次注册；如果不填，会默认回退使用 `ADMIN_ACCESS_PASSWORD`

## Supabase 初始化

在 Supabase SQL Editor 执行 [`supabase/schema.sql`](./supabase/schema.sql)。

表结构包括：

- `consultants`
- `leads`
- `follow_ups`

首次写入时，如果 `consultants` 为空，系统会自动写入默认顾问池。

## Supabase 配置检查

完成配置后，建议按这个顺序验证：

1. 在 `.env.local` 填好 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SECRET_KEY`
2. 在 Supabase SQL Editor 执行 [`supabase/schema.sql`](./supabase/schema.sql)
3. 重启 `npm run dev`
4. 打开 `/advisor`
5. 确认页面顶部状态卡显示“已经连上 Supabase”

如果 `/advisor` 里仍显示“还没有切到 Supabase”，页面会直接提示是缺环境变量，还是表结构还没建好。

## 企业微信配置检查

完成 webhook 配置后，建议按这个顺序验证：

1. 在 `.env.local` 填好 `WECOM_WEBHOOK_URL`
2. 如果希望高优线索走单独群，再额外填写 `WECOM_HIGH_PRIORITY_WEBHOOK_URL`
3. 重启 `npm run dev`
4. 打开 `/advisor`
5. 确认页面中部状态卡显示“企业微信通知已就绪”
6. 点击“测试普通通知”或“测试高优先级通知”

如果 webhook 没填、格式不对，或者高优先级通道只配了一半，管理台会直接给出提示。

## 顾问工作台登录保护

如果你准备把这套工具给顾问长期使用，建议开启：

1. 在 `.env.local` 设置 `ADMIN_ACCESS_PASSWORD`
2. 重启 `npm run dev`
3. 打开 `/advisor`
4. 页面会先跳到登录页
5. 输入密码后才能进入顾问工作台

当前版本会保护：

- `/advisor`
- `/advisor/leads/:id`
- `/api/leads/:id`
- `/api/notifications/test`

如果暂时不填 `ADMIN_ACCESS_PASSWORD`，顾问工作台会保持开放访问。

## 渠道追踪

从落地页进入问卷时，系统会自动透传当前 URL 上的 UTM 参数，例如：

```text
/?utm_source=xiaohongshu&utm_medium=organic&utm_campaign=apr-k12-check
```

提交后这些字段会随线索一起入库，并展示在顾问工作台的渠道统计和活动统计模块中。

## 部署

项目已配置为通过 Vercel 部署。详见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)。

**快速部署流程：**

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

**支持的部署方式：**

- Vercel（推荐）
- 其他 Node.js 托管平台（Netlify、AWS 等）

**部署前检查列表：**

- [ ] 所有环境变量已配置
- [ ] Supabase 数据库已初始化（如使用）
- [ ] 企业微信 Webhook 已配置（如需通知）
- [ ] 本地构建测试成功

```bash
npm run build
npm run start
```

## 后续建议

下一步如果进入第二阶段，可以把本地 JSON 替换成正式数据库，再补：

- 登录和权限
- 通知提醒
- 渠道统计和漏斗看板
- 更细的学校带推荐逻辑
