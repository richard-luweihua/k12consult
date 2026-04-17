# 香港转学 AI 诊断系统：数据库表结构草案（字段级）

## 1. 已确认的数据库原则

目前已确认：

1. **有基础会员体系**：包含用户、顾问、管理员
2. **登录方式支持手机号 + 微信**
3. **问卷答案先用 JSON 保存**
4. **报告先单表 + version 字段**
5. **follow_up 单独建表**
6. **consultant_assignments 单独建表**
7. **报告允许顾问修订形成正式版**
8. **管理员跟进单独建表记录**
9. **咨询承接流程为：用户提交咨询意向 → 管理员跟进 → 顾问正式咨询**

---

## 2. 设计原则

- 第一版优先保证业务闭环，不追求大而全
- 核心业务数据结构化，变化快的内容优先 JSON 化
- 原始输入、标准化输入、规则结果、报告结果分开保存
- 业务状态与任务状态分离
- 所有关键节点尽量可追溯、可回放、可复盘

---

## 3. 核心表结构

## 3.1 users
统一账号基础表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| role | varchar(32) | 角色：parent_user / consultant / admin / super_admin |
| mobile | varchar(32) | 手机号，可空 |
| wechat_id | varchar(64) | 微信号或微信唯一标识，可空 |
| email | varchar(128) | 邮箱，可空 |
| password_hash | varchar(255) | 如支持密码登录时使用，可空 |
| status | varchar(32) | 账号状态：active / disabled / pending |
| last_login_at | datetime | 最近登录时间，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 约束建议
- mobile、wechat_id 至少有一个
- mobile 可建立普通索引
- wechat_id 可建立普通索引
- role 必填

---

## 3.2 user_profiles
家长 / 普通用户资料表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| user_id | bigint / uuid | 关联 users.id |
| name | varchar(64) | 姓名 |
| preferred_contact | varchar(32) | 偏好联系渠道：mobile / wechat |
| source_channel | varchar(64) | 来源渠道 |
| notes | text | 备注，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3.3 consultant_profiles
顾问资料表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| user_id | bigint / uuid | 关联 users.id |
| display_name | varchar(64) | 顾问显示名 |
| specialty_tags_json | json | 擅长标签 |
| bio | text | 顾问简介，可空 |
| active_status | varchar(32) | active / inactive |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3.4 admin_profiles
管理员资料表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| user_id | bigint / uuid | 关联 users.id |
| name | varchar(64) | 管理员姓名 |
| admin_level | varchar(32) | admin / super_admin |
| notes | text | 备注，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3.5 students
孩子资料表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| user_id | bigint / uuid | 关联 users.id |
| child_name | varchar(64) | 孩子姓名 |
| gender | varchar(16) | 性别，可空 |
| birth_year | int | 出生年份，可空 |
| current_grade_raw | varchar(64) | 当前年级原始输入 |
| current_city | varchar(64) | 当前所在城市 |
| current_school_name | varchar(128) | 当前学校名称，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 约束建议
- user_id 必填
- 可增加索引：`(user_id, child_name)`

---

## 3.6 cases
业务主表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| user_id | bigint / uuid | 关联 users.id |
| student_id | bigint / uuid | 关联 students.id |
| case_no | varchar(64) | 案例编号 |
| status | varchar(32) | 业务状态 |
| source_channel | varchar(64) | 来源渠道 |
| questionnaire_version | varchar(32) | 问卷版本 |
| current_report_id | bigint / uuid | 当前生效报告，可空 |
| assigned_consultant_id | bigint / uuid | 当前分配顾问，可空 |
| closed_at | datetime | 关闭时间，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### status 枚举建议
- draft
- contact_pending
- submitted
- processing
- report_ready
- report_viewed
- consult_intent_submitted
- admin_following
- awaiting_user_info
- consult_ready_for_assignment
- consult_assigned
- consult_scheduled
- consult_completed
- nurturing
- follow_up
- closed

### 约束建议
- case_no 唯一
- 对 `(student_id, status)` 建索引
- 业务层控制：同一孩子同一时间只有一个活跃 case

---

## 3.7 questionnaire_responses
问卷原始答案表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| questionnaire_version | varchar(32) | 问卷版本 |
| response_json | json | 原始答案 |
| is_locked | boolean | 是否锁定 |
| submitted_at | datetime | 提交时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3.8 standardized_inputs
标准化输入快照表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| questionnaire_response_id | bigint / uuid | 关联 questionnaire_responses.id |
| input_snapshot_json | json | 标准化输入快照 |
| normalization_version | varchar(32) | 标准化规则版本 |
| created_at | datetime | 创建时间 |

---

## 3.9 diagnostic_jobs
诊断任务表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| questionnaire_response_id | bigint / uuid | 关联 questionnaire_responses.id |
| standardized_input_id | bigint / uuid | 关联 standardized_inputs.id |
| job_status | varchar(32) | 任务状态 |
| rule_version | varchar(32) | 规则版本 |
| prompt_version | varchar(32) | Prompt 版本 |
| model_name | varchar(128) | 模型名称 |
| retry_count | int | 重试次数 |
| error_message | text | 错误信息，可空 |
| started_at | datetime | 开始时间 |
| finished_at | datetime | 完成时间，可空 |
| created_at | datetime | 创建时间 |

### job_status 枚举建议
- queued
- running
- succeeded
- failed
- manual_review

---

## 3.10 diagnostic_results
诊断结构化结果表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| diagnostic_job_id | bigint / uuid | 关联 diagnostic_jobs.id |
| rule_result_json | json | 规则判断结果 |
| risk_tags_json | json | 风险标签 |
| path_tags_json | json | 路径标签 |
| school_match_hint_json | json | 学校范围提示 |
| consultation_recommendation | varchar(32) | 是否建议真人咨询 |
| created_at | datetime | 创建时间 |

---

## 3.11 reports
报告表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| diagnostic_job_id | bigint / uuid | 关联 diagnostic_jobs.id |
| report_version | int | 报告版本号 |
| report_type | varchar(32) | ai_draft / consultant_final |
| content_markdown | longtext / text | 报告正文 |
| summary_json | json | 报告摘要结构化数据 |
| is_current | boolean | 是否当前版本 |
| viewed_at | datetime | 用户首次查看时间，可空 |
| created_by_user_id | bigint / uuid | 创建人，可空 |
| created_at | datetime | 创建时间 |

### 约束建议
- 对 `(case_id, report_version)` 建唯一索引
- 同一 case 理论上只应有一个 `is_current = true`

---

## 3.12 consultation_requests
咨询意向 / 预约申请表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| request_status | varchar(32) | 意向状态 |
| contact_time_preference | varchar(128) | 联系时间偏好 |
| notes | text | 用户补充说明，可空 |
| submitted_at | datetime | 提交时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### request_status 枚举建议
- submitted
- admin_following
- awaiting_user_info
- qualified
- nurturing
- assigned
- cancelled
- expired

---

## 3.13 admin_follow_up_records
管理员跟进记录表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| consultation_request_id | bigint / uuid | 关联 consultation_requests.id |
| admin_user_id | bigint / uuid | 关联 users.id |
| follow_up_status | varchar(32) | 跟进状态 |
| intent_level | varchar(32) | 咨询意愿等级 |
| target_timeline | varchar(64) | 推进时间判断 |
| budget_level | varchar(32) | 预算接受度 |
| consult_focus_json | json | 咨询重点 |
| missing_info_json | json | 缺失资料 |
| handoff_summary | text | 交接摘要 |
| next_action | varchar(255) | 下一步动作 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### follow_up_status 枚举建议
- following
- awaiting_user_info
- qualified
- nurturing
- closed

---

## 3.14 consultant_assignments
顾问分配记录表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| consultant_id | bigint / uuid | 关联 users.id |
| assigned_by_admin_id | bigint / uuid | 关联 users.id |
| priority_level | varchar(32) | low / normal / high |
| handoff_summary | text | 管理员交接摘要 |
| assigned_at | datetime | 分配时间 |
| status | varchar(32) | assigned / accepted / reassigned / completed |
| created_at | datetime | 创建时间 |

---

## 3.15 consultations
正式咨询记录表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| consultant_id | bigint / uuid | 关联 users.id |
| consultation_request_id | bigint / uuid | 关联 consultation_requests.id |
| scheduled_at | datetime | 预约时间，可空 |
| completed_at | datetime | 完成时间，可空 |
| consultation_status | varchar(32) | pending / scheduled / completed / cancelled |
| notes_markdown | text | 咨询记录正文 |
| final_advice_json | json | 最终建议结构化摘要 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3.16 follow_up_records
跟进记录表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| consultation_id | bigint / uuid | 关联 consultations.id |
| consultant_id | bigint / uuid | 关联 users.id |
| follow_up_type | varchar(32) | qa / service_follow_up / close_note |
| content | text | 跟进内容 |
| next_action | varchar(255) | 下一步动作，可空 |
| created_at | datetime | 创建时间 |

---

## 4. 第一版推荐索引

### users
- idx_users_mobile
- idx_users_wechat_id
- idx_users_role

### students
- idx_students_user_id

### cases
- uk_cases_case_no
- idx_cases_user_id
- idx_cases_student_id
- idx_cases_status
- idx_cases_assigned_consultant_id

### questionnaire_responses
- idx_qr_case_id

### diagnostic_jobs
- idx_dj_case_id
- idx_dj_job_status

### reports
- uk_reports_case_version (`case_id`, `report_version`)
- idx_reports_case_id
- idx_reports_is_current

### consultation_requests
- idx_cr_case_id
- idx_cr_request_status

### admin_follow_up_records
- idx_afr_case_id
- idx_afr_admin_user_id
- idx_afr_follow_up_status

### consultant_assignments
- idx_ca_case_id
- idx_ca_consultant_id

### consultations
- idx_consultations_case_id
- idx_consultations_consultant_id
- idx_consultations_status

### follow_up_records
- idx_followup_case_id
- idx_followup_consultation_id

---

## 5. 字段设计上的关键建议

### 5.1 能变动快的内容优先 JSON
适合放 JSON 的：
- 问卷原始答案
- 标准化输入
- 规则判断结果
- 风险标签 / 路径标签
- 报告摘要
- 最终建议摘要
- 管理员咨询重点
- 管理员缺失资料判断

### 5.2 文本正文统一 markdown / text
适合用 text / markdown 的：
- 报告正文
- 管理员交接摘要
- 咨询记录
- 跟进记录

### 5.3 时间字段尽量完整
关键表建议都保留：
- created_at
- updated_at
- submitted_at / viewed_at / completed_at 这类业务时间点

这样后面才能做漏斗分析。

---

## 6. 我建议下一步先做的不是所有 SQL，而是两件事

1. **字段分组确认**
   - 哪些是 MVP 必填字段
   - 哪些先可空

2. **页面字段映射与工作台流转确认**
   - 用户端每个页面写哪些字段
   - 管理员跟进页写哪些字段
   - 顾问端接手页写哪些字段

---

## 7. 下一步建议

下一步最适合继续细化：

1. **顾问工作台页面结构设计**
2. **管理员跟进页页面结构设计**

因为新的流程里，管理员这一层已经是核心枢纽。