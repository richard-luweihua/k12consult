# 香港转学 AI 诊断系统：页面字段映射设计

## 1. 结论

这一版页面字段映射，建议按三端来设计：

1. **用户端**：让家长顺利完成问卷、看懂报告、提交咨询意向
2. **顾问端**：让顾问快速理解案例、完成咨询准备、记录交付结果
3. **管理后台**：让管理员管理用户、顾问、案例、模板和学校数据

字段设计原则是：
- 用户端只展示必要字段，不暴露系统内部判断细节
- 顾问端展示完整业务字段 + AI 诊断依据
- 管理后台展示管理和配置字段，不承担顾问工作台职责

---

## 2. 用户端页面字段映射

## 2.1 落地页 / 首页
### 页面目标
- 说明产品价值
- 降低填写问卷门槛
- 引导开始诊断

### 建议字段
#### 展示字段
- 产品标题
- 产品副标题
- 服务适合对象
- 你将获得什么
- 顾问品牌介绍
- 开始诊断按钮

#### 埋点字段
- `channel_source`
- `campaign_id`（可空）
- `landing_page_version`

### 不建议展示
- 数据库字段
- 报告结构说明
- 内部规则逻辑

---

## 2.2 问卷页
### 页面目标
- 让用户完成问卷
- 降低中途流失
- 收集最小必要信息

### 对应字段
#### 基础对象
- `students.child_name`
- `students.current_grade_raw`
- `students.current_city`
- `students.current_school_name`（可选）

#### 问卷原始字段（写入 `questionnaire_responses.response_json`）
- 当前学校体系
- 主要授课语言
- 校内成绩水平
- 英文水平
- 目标入学时间
- 长期目标
- 主要顾虑
- 顾虑补充说明
- 孩子意愿
- 孩子意愿补充说明
- 粤语基础（选填）
- 预算区间（选填）
- 其他补充情况（选填）

#### 页面状态字段
- `cases.status = draft / contact_pending`
- `questionnaire_version`
- `is_locked`

### 前端建议
- 分步展示
- 自动保存草稿
- 显示当前进度
- 提交前做完整性校验

---

## 2.3 联系方式解锁页
### 页面目标
- 留资
- 解锁报告

### 对应字段
#### 写入 `users`
- `mobile`（可选）
- `wechat_id`（可选）

#### 写入 `user_profiles`
- `preferred_contact`
- `source_channel`

#### 更新字段
- `cases.status = submitted`

### 页面规则
- 手机号 / 微信号至少填一个
- 解锁前不展示完整报告

---

## 2.4 报告生成中页面
### 页面目标
- 承接等待状态
- 降低用户流失

### 对应字段
- `cases.status = processing`
- `diagnostic_jobs.job_status`
- `diagnostic_jobs.retry_count`

### 建议展示
- 正在生成提示文案
- 预计等待说明
- 稍后查看提示

### 不建议展示
- 模型名称
- 报错信息
- 内部重试状态细节

---

## 2.5 报告查看页
### 页面目标
- 让用户快速看懂结果
- 促成咨询转化

### 对应字段
#### 来自 `reports`
- `content_markdown`
- `summary_json`
- `viewed_at`

#### 来自 `cases`
- `status`
- `current_report_id`

#### 来自 `students`
- `child_name`
- `current_grade_raw`

### 页面建议展示内容
- 核心结论摘要
- 当前时机判断
- 首选路径判断
- 核心问题
- 风险与建议
- 下一步建议
- 真人咨询引导按钮

### 不建议展示
- `risk_tags_json` 原始值
- `rule_result_json`
- `school_match_hint_json` 原始结构
- `prompt_version`
- `model_name`

---

## 2.6 咨询预约页
### 页面目标
- 收集咨询意向
- 方便人工后续确认

### 对应字段
#### 写入 `consultation_requests`
- `contact_time_preference`
- `notes`
- `request_status = submitted`
- `submitted_at`

#### 更新 `cases`
- `status = consult_intent_submitted`

### 建议展示字段
- 当前案例基础信息
- 联系方式确认
- 可联系时间偏好
- 想重点咨询的问题

---

## 2.7 用户个人中心
### 页面目标
- 查看历史问卷、报告、咨询记录

### 对应字段
#### 来自 `users`
- `mobile`
- `wechat_id`
- `status`

#### 来自 `user_profiles`
- `name`
- `preferred_contact`

#### 来自 `students`
- 孩子列表

#### 来自 `cases`
- `case_no`
- `status`
- `created_at`

#### 来自 `reports`
- 当前报告版本
- 生成时间

#### 来自 `consultations`
- 咨询状态
- 咨询完成时间

---

## 3. 顾问端页面字段映射

## 3.1 顾问案例列表页
### 页面目标
- 快速接收管理员派单并进入处理

### 对应字段
#### 来自 `cases`
- `case_no`
- `status`
- `assigned_consultant_id`
- `updated_at`

#### 来自 `students`
- `child_name`
- `current_grade_raw`

#### 来自 `users` / `user_profiles`
- 家长姓名
- 联系方式

#### 来自 `admin_follow_up_records`
- `handoff_summary`
- `intent_level`
- `budget_level`

### 建议筛选条件
- 按状态筛选
- 按最近更新时间筛选

---

## 3.2 顾问案例详情页
### 页面目标
- 一页看懂这个案例
- 快速执行跟进与关单

### 应展示字段
#### 基础信息区
- 家长姓名
- 联系方式
- 孩子姓名
- 当前年级

#### 管理员交接区
- `admin_follow_up_records.handoff_summary`
- `admin_follow_up_records.intent_level`
- `admin_follow_up_records.budget_level`
- `admin_follow_up_records.missing_info`

#### 顾问操作区
- 顾问备注输入框
- 下一步动作
- 成交结论（成交关闭时必填）
- 未成交原因（转资源库时必填）
- 状态推进按钮：
  - `consult_assigned`
  - `follow_up`
  - `closed`
  - `nurturing`（资源库）

---

## 3.3 跟进清单页（可选）
### 页面目标
- 聚合“跟进中”与“待关闭/待转资源库”的顾问任务

### 对应字段
#### 来自 `cases`
- `status`（`follow_up` / `closed` / `nurturing`）
- `updated_at`

#### 来自 `case_follow_ups`
- `note`
- `next_action`
- `created_at`

### 页面建议功能
- 新增跟进记录
- 查看最近跟进
- 快速关闭案例
- 快速转入资源库

---

## 4. 管理后台页面字段映射

## 4.1 后台总览页
### 页面目标
- 让管理员看整体业务运行情况

### 核心展示字段
- 问卷提交数
- 报告生成数
- 报告查看率
- 咨询预约数
- 咨询转化率
- 顾问处理中的案例数
- 已关闭案例数

### 数据来源
- `cases`
- `diagnostic_jobs`
- `reports`
- `consultation_requests`
- `consultations`

---

## 4.2 用户管理页
### 页面目标
- 管理用户账户和孩子资料

### 建议字段
#### 来自 `users`
- `id`
- `role`
- `mobile`
- `wechat_id`
- `status`
- `created_at`

#### 来自 `user_profiles`
- `name`
- `source_channel`

#### 关联统计
- 孩子数
- case 数
- 最近报告时间

---

## 4.3 顾问管理页
### 页面目标
- 管理顾问资料、负载和案例分配

### 建议字段
#### 来自 `users`
- `id`
- `role`
- `status`

#### 来自 `consultant_profiles`
- `display_name`
- `specialty_tags_json`
- `active_status`

#### 关联统计
- 当前处理案例数
- 已完成咨询数
- 跟进中案例数

---

## 4.4 案例管理页
### 页面目标
- 全局查看和筛选所有 case

### 建议字段
- `case_no`
- `status`
- 用户姓名
- 孩子姓名
- 当前年级
- 来源渠道
- 当前顾问
- 创建时间
- 最近更新时间

### 建议功能
- 手动分配顾问
- 改变 case 状态
- 查看完整链路

---

## 4.5 模板管理页
### 页面目标
- 管理问卷模板、报告模板、Prompt 模板

### 对应字段
这部分后续建议单独设计配置表。
当前页面至少应支持：
- 模板名称
- 模板版本
- 当前是否启用
- 更新时间

---

## 4.6 学校数据管理页
### 页面目标
- 管理学校库和路径规则

### 当前建议展示
- 学校名称
- 学校类型
- 授课语言
- 年级覆盖
- 学费区间
- 插班规则摘要
- 是否启用

### 说明
学校数据库的详细字段建议后面单独展开。

---

## 5. 页面与字段权限边界

## 5.1 用户端
### 可看
- 自己的问卷
- 自己孩子的 case
- 自己的报告
- 自己的咨询记录

### 不可看
- 顾问内部备注
- 风险标签原始结构
- 系统规则结果
- Prompt / 模型 / 版本信息

---

## 5.2 顾问端
### 可看
- 自己负责的案例执行字段
- 管理员交接摘要
- 本案例跟进记录

### 不可看
- 全量后台配置
- 其他顾问的敏感绩效数据
- 全局模板管理权限

---

## 5.3 管理后台
### 可看
- 全量用户、顾问、案例、模板、学校数据

### 注意
- 管理后台不是顾问工作台，不建议把大量顾问操作全部塞进后台
- 顾问工作动作应留在顾问端

---

## 6. 我建议下一步继续细化的两个方向

1. **管理员端页面字段与审计字段细化**
2. **顾问端“接单-跟进-关闭”状态约束细化**

原因：
- 用户端逻辑已经比较清楚
- 现在最需要定的是状态约束和字段闭环是否完整

---

## 7. 下一步建议

下一步最适合继续做：

**顾问端状态约束与字段校验设计**

因为它直接决定：
- 顾问效率
- 关单质量
- 审计可追溯性
