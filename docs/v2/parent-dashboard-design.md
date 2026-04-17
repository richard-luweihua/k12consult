# 家长登录后页面设计 (Parent Dashboard V1)

## 1. 设计目标

家长登录后页面只解决两件事：

1. **继续诊断**：还没完成诊断链路的用户，快速进入下一步。
2. **查看进展**：已进入服务流程的用户，一眼看到当前阶段与待办。

页面不做“信息堆叠”，用一个主动作 + 一条进展线驱动转化。

---

## 2. 页面定位与入口

- 页面路由：`/dashboard`（家长主看板）
- 入口：
  - 登录成功默认跳转
  - 从结果页、问卷页、我的案例回跳
- 角色分流：
  - `user / parent_user` -> `/dashboard`
  - `consultant` -> `/advisor`
  - `admin / super_admin` -> `/admin`

---

## 3. 信息架构

从上到下 6 个区域：

1. 顶部导航（账号、退出、客服入口）
2. `Next Action` 主卡（唯一主按钮）
3. 我的案例列表（按孩子/案例）
4. 最近案例进展时间线（最近 5-8 条）
5. 待办与提醒（补资料、排期确认、截止时间）
6. 历史报告入口（AI 初稿 / 顾问修订版）

---

## 4. 核心模块详细设计

## 4.1 Next Action 主卡（最高优先）

### 目标
让家长不用思考“该点哪里”，直接进入下一步。

### 字段
- `currentV2Status`
- `studentName`
- `lastUpdatedAt`
- `nextActionLabel`
- `nextActionHref`
- `secondaryActionLabel`（可选）

### 规则
仅显示一个主按钮，按状态计算：

| v2 状态 | 主文案 | 主按钮 |
|---|---|---|
| `report_viewed` | 你的诊断报告已生成，建议先提交咨询意向 | 提交咨询意向 |
| `consult_intent_submitted` | 已收到你的意向，管理员正在跟进 | 查看进展 |
| `admin_following` | 管理员正在与你确认信息 | 查看进展 |
| `awaiting_user_info` | 需要你补充资料后继续推进 | 去补资料 |
| `consult_ready_for_assignment` | 案例已满足转顾问条件 | 查看进展 |
| `consult_assigned` | 顾问已接手，等待排期确认 | 查看咨询安排 |
| `consult_scheduled` | 咨询已排期，请按时参加 | 查看咨询安排 |
| `consult_completed` | 咨询已完成，可查看顾问结论 | 查看顾问结论 |
| `follow_up` | 进入会后跟进阶段 | 查看跟进计划 |
| `nurturing` | 当前进入培育阶段，后续将持续跟进 | 查看建议 |
| `closed` | 当前案例已关闭 | 查看归档 |

---

## 4.2 我的案例列表

### 目标
支持一位家长管理多个孩子/多个案例，快速切换。

### 列表字段（卡片）
- 学生名称：`lead.answers.studentName`
- 年级：`lead.grade` / `lead.answers.grade`
- 当前状态：`lead.caseRecord.status`（优先）或 `lead.status`
- 推荐顾问：`lead.assignment.consultantName`（可选）
- 最近更新时间：`lead.updatedAt || lead.updated_at`
- 操作：`查看详情`（跳 `result/[submissionId]`）

### 排序
`updatedAt` 倒序，最近有动作的案例优先。

---

## 4.3 进展时间线

### 目标
让家长清楚“系统已经做了什么、我还要做什么”。

### 时间线节点建议
- 问卷提交
- 报告生成
- 咨询意向提交
- 管理员跟进
- 待补资料（如有）
- 顾问分配
- 咨询排期
- 咨询完成
- 会后跟进/关闭

### 数据来源
- `lead.followUps`
- `lead.adminFollowUpRecord.followUpNotes`
- `lead.caseRecord.consultationScheduledAt`
- `lead.caseRecord.consultationCompletedAt`
- `lead.caseRecord.closure.closedAt`

---

## 4.4 待办与提醒区

### 目标
把“阻塞推进的事项”集中展示。

### 规则
只展示最多 3 条，按紧急程度排序：
1. 补资料待完成（`awaiting_user_info` 且 `missingInfo` 非空）
2. 咨询时间待确认（`consult_assigned`）
3. 会后动作待确认（`follow_up`）

### 展示字段
- 待办标题
- 截止时间（如有）
- 一句话说明
- 快速按钮（跳对应操作页）

---

## 4.5 历史报告区

### 目标
降低“报告找不到”的流失。

### 展示
- 当前生效报告（优先展示）
- 历史版本列表（时间倒序）
- 标签：`ai_draft` / `consultant_final`

---

## 5. 状态映射与动作边界

## 5.1 用户可操作状态
- 可提交咨询意向：`report_viewed` / `admin_following`（按策略可放开）
- 可补资料：`awaiting_user_info`
- 只读状态：`consult_scheduled` / `consult_completed` / `closed`

## 5.2 强登录门禁
以下动作未登录不可操作：
- 提交咨询意向
- 补资料
- 查看我的案例

---

## 6. API 依赖

1. `GET /api/my-leads`
   - 获取家长全部案例卡片数据
2. `GET /api/results/[submissionId]`
   - 获取单案例详情
3. `POST /api/results/[submissionId]/consultation-intent`
   - 提交咨询意向
4. `POST /api/results/[submissionId]/supplemental-info`
   - 提交补资料

---

## 7. 空态与异常态

## 7.1 无案例空态
- 文案：暂无案例，先完成一份诊断
- 按钮：`开始诊断` -> `/questionnaire`

## 7.2 加载态
- 骨架屏 + 主动作占位

## 7.3 错误态
- 接口失败展示重试按钮
- 会话失效跳转登录并保留 `next=/dashboard`

---

## 8. 移动端优先布局

移动端顺序固定：
1. Next Action
2. 待办提醒
3. 我的案例
4. 时间线
5. 历史报告

说明：
- 主按钮固定满宽
- 状态标签最多一行，超长截断
- 关键信息不超过两层折叠

---

## 9. 埋点建议（用于优化转化）

- `dashboard_viewed`
- `next_action_clicked`
- `case_card_clicked`
- `consultation_intent_submitted`
- `supplemental_info_submitted`
- `report_opened_from_dashboard`

核心指标：
- 登录后 24h 内提交咨询意向率
- `awaiting_user_info -> admin_following` 转换率
- 首页主按钮点击率（CTR）

---

## 10. 验收清单 (UAT)

1. 家长登录后默认进入 `/dashboard`。
2. 页面顶部主卡始终有且仅有一个主动作。
3. 多案例用户可清晰区分孩子与状态。
4. `awaiting_user_info` 状态可直接进入补资料。
5. `closed` 状态可查看归档但不可提交动作。
6. 未登录访问 `/dashboard` 自动跳转登录。
7. 移动端首屏可见主动作与当前状态。

---

## 11. 后续迭代（V1.1+）

- 增加“按孩子筛选”与“状态筛选”
- 增加“咨询提醒订阅”（短信/微信）
- 增加“推荐阅读/案例”内容位（培育用户）
- 增加“会后任务打卡”模块
