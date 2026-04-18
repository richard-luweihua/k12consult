# V2.0 开发路线图

这份路线图以当前仓库代码为起点，结合 `docs/v2/` 中已导入的业务与数据设计文档，作为后续编码的执行基线。

## 当前代码基线

现有项目已经具备以下能力：

- 用户端问卷提交与结果页
- 顾问端登录、线索列表、线索详情
- 管理端登录、线索列表、线索详情
- 本地 JSON / Supabase 双存储
- 基础派单、跟进记录、企微通知

当前更接近 V1 MVP，和 V2.0 文档相比，还缺少更完整的：

- 管理员跟进状态机
- AI 诊断任务与结果快照
- 报告多版本机制
- 学校数据库导入与匹配
- 用户留资解锁与咨询意向闭环

## V2.0 开发原则

1. 尽量复用现有 Next.js App Router 结构，不重写整站。
2. 先补数据模型和接口，再逐页增强前端。
3. 新能力优先向 `admin`、`advisor`、`api` 三条已有主线内扩展。
4. 文档先以 `docs/v2/` 为准，代码实现保持可渐进上线。

## 分阶段实施

### Phase 1：统一状态与数据结构

目标：让系统先能表达 V2.0 业务对象。

建议优先处理：

- 扩展 `lib/schema.js`
- 扩展 `lib/data.js`
- 补充 `supabase/schema.sql`

重点新增：

- 更清晰的 case / lead 状态枚举
- 管理员跟进记录结构
- 咨询意向字段
- 诊断任务与结果快照结构
- 报告版本字段

完成标志：

- 本地 JSON 和 Supabase 都能保存 V2.0 必需字段
- 不破坏现有页面读取

### Phase 2：用户端链路升级

目标：跑通“问卷 -> 留资 -> 报告 -> 咨询意向”闭环。

建议优先处理：

- `app/questionnaire/page.js`
- `app/api/intake/route.js`
- `app/result/[submissionId]/page.js`
- `app/api/results/[submissionId]/route.js`

重点新增：

- 联系方式解锁逻辑
- 提交后生成中的承接状态
- 报告页咨询意向入口
- 咨询意向提交接口

完成标志：

- 用户端能形成完整 case
- 管理端能接收到咨询意向

### Phase 3：管理端工作台升级

目标：让管理员能完成顾问管理、全量 Case 指派与状态治理。

建议优先处理：

- `app/admin/workbench/page.js`
- `app/admin/consultants/page.js`
- `app/admin/consultants/[consultantId]/page.js`
- `app/admin/cases/page.js`
- `app/admin/cases/[leadId]/page.js`
- `app/api/admin/consultants/*`
- `app/api/admin/cases/*`

重点新增：

- 顾问新增/编辑/停用
- Case 手动/批量/推荐指派
- 管理员跟进状态流转
- 补资料标记
- 培育池标记
- 转顾问交接摘要
- 优先级与 SLA 展示
- 操作审计日志

完成标志：

- 管理员可以独立完成顾问管理 + 指派 + 状态推进闭环

### Phase 4：顾问端执行流升级（简化版）

目标：让顾问只做三件事：接收派单、跟进处理、按结果关闭或转资源库。

建议优先处理：

- `app/advisor/workbench/page.js`
- `app/advisor/cases/[leadId]/page.js`
- `app/advisor/follow-up/page.js`
- `components/LeadWorkbench.js`

重点新增：

- 接单状态确认（`consult_assigned`）
- 跟进记录沉淀（`follow_up`）
- 成交关闭校验（`closed`）
- 未成交转资源库校验（`nurturing`）
- 顾问侧最小字段操作面板

完成标志：

- 顾问可以独立完成“接单 -> 跟进 -> 成交关闭 / 未成交转资源库”闭环

### Phase 5：AI 诊断与学校库能力

目标：把 V2.0 文档里的“规则 + 学校库 + AI 报告”真正接进系统。

建议优先处理：

- `lib/intake.js`
- 新增诊断服务模块
- 学校数据导入脚本 / 接口

重点新增：

- 规则初判
- 学校库匹配
- 诊断结果快照
- AI 报告生成

完成标志：

- 系统能基于结构化输入生成可回溯报告

## 推荐编码顺序

如果按最小风险推进，建议下一步直接开始：

1. Phase 1 的数据结构升级
2. Phase 3 的管理端状态机
3. Phase 2 的用户端咨询闭环

这个顺序最贴合当前仓库，因为现有项目已经有管理端和线索详情页，先补数据和状态流转，能最快把 V2.0 骨架立起来。

### 路由拆分更新（2026-04-18）

为强化职责边界，管理端与顾问端已完成 Phase A 页面拆分：

- 管理员：`/admin/workbench`、`/admin/cases/[id]`、`/admin/nurturing`、`/admin/sla`
- 顾问：`/advisor/workbench`、`/advisor/cases/[id]`、`/advisor/follow-up`

旧路由 `/admin`、`/advisor` 及原 `leads` 详情入口保留兼容跳转，不影响已有链接和书签。

### 接口拆分更新（2026-04-18）

案例读写接口已按角色拆分：

- 管理员：`/api/admin/cases/[id]`
- 顾问：`/api/advisor/cases/[id]`

`components/LeadWorkbench.js` 已按工作台上下文切换调用对应接口。

### 二级页面能力填充（2026-04-18）

四个二级页面已从占位升级为可用清单页：

- 管理员：`/admin/nurturing`、`/admin/sla`
- 顾问：`/advisor/follow-up`

实现要点：

- 均接入 `listLeads()` 实时数据
- 顾问二级页面沿用顾问权限过滤，只展示本人可见案例（管理员视角可看全部）
- 管理员二级页面补齐培育池、首次联系 SLA、补资料超时等核心运营视图

### 顾问执行流简化（2026-04-18）

顾问系统按新决策收敛为三步：

1. 接收管理员派单（`consult_assigned`）
2. 跟进处理（`follow_up`）
3. 处理完成后：
   - 成交：`closed`
   - 未成交：`nurturing`（资源库）

第一版不再把“报告修订”作为顾问主流程必选动作。

### 管理员三模块升级（2026-04-18）

管理员系统后续迭代拆为三条并行主线：

1. 顾问管理（增删改停用、负载与产能）
2. Case 总览与指派（手动、推荐、批量）
3. Case 状态治理（状态机约束、时间线、审计）

详细设计文档：

- `admin-management-system-design.md`

## 对应文档

- 总纲：`ai-diagnosis-system-design.md`
- 流程：`business-process-design.md`
- 数据：`database-final-architecture.md`
- 页面字段：`page-field-mapping.md`
- 规则：`logic-rules-v1.md` / `logic-rules-detail.md`
