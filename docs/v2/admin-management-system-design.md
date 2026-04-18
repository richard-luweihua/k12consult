# 香港转学 AI 诊断系统：管理员管理系统详细方案

## 1. 背景与目标

根据最新业务决策，管理员登录后需要围绕三个核心能力工作：

1. 管理顾问（新增、修改、停用/删除）
2. 查看所有 Case 并执行顾问指派
3. 按状态机进一步管理 Case，确保推进闭环

本方案目标是把这三项能力拆成可落地的信息架构、字段、接口和权限规则，作为后续开发执行基线。

## 2. 管理员系统信息架构

### 2.1 管理员主入口

管理员登录后默认进入 `/admin/workbench`，首页展示三张功能卡：

1. `管理顾问`
2. `Case 总览与指派`
3. `Case 状态管理`

### 2.2 路由建议

1. `/admin/workbench`：管理员总控台（指标 + 三大入口）
2. `/admin/consultants`：顾问管理列表
3. `/admin/consultants/new`：新增顾问
4. `/admin/consultants/[consultantId]`：顾问详情与编辑
5. `/admin/cases`：Case 总览与指派中心
6. `/admin/cases/[leadId]`：Case 详情与状态流转
7. `/admin/nurturing`：培育池
8. `/admin/sla`：SLA 异常清单

## 3. 功能一：管理顾问

### 3.1 顾问数据字段（最小可用）

建议维护以下核心字段：

1. 基础信息：`name`、`email`、`mobile`
2. 职能信息：`title`、`specialties[]`、`gradeFocus[]`
3. 产能信息：`capacityDaily`、`capacityActive`
4. 状态信息：`status`（`active` / `on_leave` / `inactive`）
5. 派单配置：`priorityWeight`
6. 审计字段：`createdAt`、`updatedAt`、`createdBy`、`updatedBy`

### 3.2 顾问管理规则

1. 邮箱唯一，不允许重复创建
2. 删除建议使用软删除（标记 `inactive`），不做硬删除
3. 若顾问名下仍有进行中 Case，停用前必须完成转派
4. 顾问恢复启用时，保留历史记录与统计
5. 每次顾问资料变更必须写入审计日志

### 3.3 顾问列表页面能力

建议列表列：

1. 顾问姓名 / 邮箱
2. 当前状态
3. 活跃 Case 数
4. 今日新增分配数
5. 产能占用率
6. 最近更新时间

建议操作：

1. 新增顾问
2. 编辑资料
3. 停用 / 恢复
4. 查看该顾问名下 Case
5. 发起转派

## 4. 功能二：Case 总览与指派

### 4.1 Case 总览筛选维度

1. V2 状态
2. 优先级（高/中/低）
3. 咨询意愿（高/中/低）
4. 预算等级
5. 是否已指派
6. 顾问
7. 时间区间（创建时间、更新时间）
8. SLA 风险（正常/临期/超时）

### 4.2 Case 列表核心字段

1. 家长 / 学生
2. 当前状态（V2）
3. 咨询意愿
4. 预算等级
5. 首次联系 SLA
6. 当前顾问
7. 最近跟进备注
8. 最近更新时间

### 4.3 指派能力

1. 单条手动指派：管理员直接指定顾问
2. 批量指派：按筛选结果批量分配
3. 推荐指派：系统返回 Top N 候选顾问
4. 转派：支持从顾问 A 转移到顾问 B

### 4.4 推荐指派评分（建议）

推荐评分可解释化，建议权重：

1. 专长匹配度：40%
2. 当前负载与可用产能：30%
3. 近期响应表现（SLA）：20%
4. 历史转化表现：10%

## 5. 功能三：Case 状态管理

### 5.1 状态机定义（V2）

1. `report_viewed`
2. `consult_intent_submitted`
3. `admin_following`
4. `awaiting_user_info`
5. `consult_ready_for_assignment`
6. `consult_assigned`
7. `follow_up`
8. `nurturing`
9. `closed`

### 5.2 关键流转约束

1. 进入 `consult_assigned` 前必须有 `assignedConsultantId`
2. 进入 `follow_up` 前必须至少有 1 条顾问跟进记录（系统自动日志或管理员备注不计入）
3. 进入 `closed`（成交）前必须填写成交结论
4. 进入 `nurturing`（资源库）前必须填写未成交原因与后续建议
5. `awaiting_user_info` 超过 7 天进入 SLA 异常池（人工决策是否转培育）

### 5.3 Case 详情页操作区

管理员在 `/admin/cases/[leadId]` 的核心动作：

1. 更新意愿等级、预算等级、目标时间
2. 维护缺失资料与催促记录
3. 填写交接摘要并指派顾问
4. 推进 V2 状态
5. 查看状态变更历史与操作日志

### 5.4 顾问执行流边界（简化）

顾问端第一版按轻量执行流运行：

1. 接收派单：`consult_assigned`
2. 跟进处理：`follow_up`
3. 处理完成：
   - 成交：`closed`
   - 未成交：`nurturing`（资源库）

边界说明：

1. 顾问不负责改派顾问
2. 顾问不负责管理后台配置
3. 成交关闭前必须填写成交结论
4. 未成交转资源库前必须填写未成交原因

## 6. 权限模型与审计

### 6.1 角色权限

1. `super_admin`：全权限（顾问管理、指派、状态管理、审计回滚）
2. `admin`：运营权限（顾问管理、指派、状态管理）
3. `consultant`：仅可操作本人 Case 的顾问侧字段

### 6.2 审计要求

关键动作必须记录 `audit_logs`：

1. 顾问新增、编辑、停用、恢复
2. Case 指派、转派
3. Case 状态变化
4. 关闭 / 重新激活

建议审计字段：

1. `actorId`
2. `actorRole`
3. `entityType`
4. `entityId`
5. `action`
6. `before`
7. `after`
8. `createdAt`

## 7. 数据模型建议

建议新增或规范以下实体：

1. `consultants`
2. `consultant_capacity_snapshots`（可选，后续扩展）
3. `case_assignments`
4. `case_status_history`
5. `case_follow_ups`
6. `audit_logs`

约束建议：

1. 顾问邮箱唯一
2. 每个 Case 仅有一个当前负责人
3. 每次状态变更必须写入历史记录

## 8. 管理端 API 方案（最小可用）

### 8.1 顾问管理 API

1. `GET /api/admin/consultants`
2. `POST /api/admin/consultants`
3. `PATCH /api/admin/consultants/[id]`
4. `DELETE /api/admin/consultants/[id]`（软删除）

### 8.2 Case 指派与状态 API

1. `GET /api/admin/cases`
2. `PATCH /api/admin/cases/[id]/assign`
3. `PATCH /api/admin/cases/[id]/status`
4. `GET /api/admin/cases/[id]/timeline`

### 8.3 管理指标 API

1. `GET /api/admin/metrics`

建议返回：

1. 待指派 Case 数
2. 首次联系超时数
3. 待补资料超 7 天数
4. 今日新增 Case 数
5. 顾问平均负载

## 9. 开发分期建议

### Phase A：顾问管理模块

1. 顾问列表 / 新增 / 编辑 / 停用
2. 顾问负载展示
3. 顾问审计日志

### Phase B：Case 指派中心

1. 管理员 Case 总览页
2. 单条指派 + 批量指派
3. 推荐指派规则（第一版）

### Phase C：Case 状态治理

1. 状态流转约束校验
2. Case 时间线与审计页
3. SLA 异常联动（首次联系、待补资料）

## 10. 待拍板决策

1. 顾问删除是否仅允许软删除（推荐：是）
2. 指派默认策略是否为“系统推荐 + 人工确认”（推荐：是）
3. `closed` 是否允许回退到 `admin_following`（推荐：允许，需填写回退原因）
