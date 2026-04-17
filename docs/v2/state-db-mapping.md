# 香港转学 AI 诊断系统：状态机字段与数据库主线映射

## 1. 结论

第一版数据库主线建议围绕 **case** 展开，并建立完整的基础账户体系。

也就是：

**users → profiles（用户 / 顾问 / 管理员）→ students → cases → 问卷 → 诊断任务 → 报告 → 咨询预约 → 顾问分配 → 咨询记录 → 跟进记录**

其中：
- **case 是业务主对象**
- **student（孩子）是 case 的归属主体**
- **questionnaire_response / diagnostic_job / report / consultation** 都挂在 case 下面
- **users + profiles** 负责承接用户、顾问和管理员的基础会员体系

这是当前最适合第一版的结构。

---

## 2. 主线对象设计

## 2.1 users
统一账号基础表，用于承接用户、顾问和管理员的基础身份。

### 作用
- 保存统一登录身份
- 承接基础联系方式
- 为用户、顾问、管理员三类角色提供统一认证入口

### 第一版建议字段
- `id`
- `role`
- `mobile`
- `wechat_id`
- `email`
- `password_hash`（如需要）
- `status`
- `last_login_at`（可空）
- `created_at`
- `updated_at`

### role 枚举建议
- `parent_user`
- `consultant`
- `admin`
- `super_admin`

### 说明
第一版建议采用统一账号表 + 单角色字段，不急着拆多角色关联表。

---

## 2.2 user_profiles
保存家长 / 普通用户资料。

### 第一版建议字段
- `id`
- `user_id`
- `name`
- `preferred_contact`
- `source_channel`
- `notes`（可空）
- `created_at`
- `updated_at`

---

## 2.3 consultant_profiles
保存顾问资料。

### 第一版建议字段
- `id`
- `user_id`
- `display_name`
- `specialty_tags_json`
- `bio`（可空）
- `active_status`
- `created_at`
- `updated_at`

---

## 2.4 admin_profiles
保存管理员资料。

### 第一版建议字段
- `id`
- `user_id`
- `name`
- `admin_level`
- `notes`（可空）
- `created_at`
- `updated_at`

---

## 2.5 students
每个 case 对应一个孩子。

### 第一版建议字段
- `id`
- `user_id`
- `child_name`
- `gender`（可选）
- `birth_year`（可选）
- `current_grade_raw`
- `current_city`
- `current_school_name`（可选）
- `created_at`
- `updated_at`

### 说明
- 第一版按孩子建 case，所以 `student` 是核心归属对象。
- 一个用户可以有多个 student。

---

## 2.6 cases
业务主对象。

### 第一版建议字段
- `id`
- `user_id`
- `student_id`
- `case_no`
- `status`
- `source_channel`
- `questionnaire_version`
- `current_report_id`（可空）
- `assigned_consultant_id`（可空）
- `closed_at`（可空）
- `created_at`
- `updated_at`

### status 枚举建议
- `draft`
- `contact_pending`
- `submitted`
- `processing`
- `report_ready`
- `report_viewed`
- `consult_pending`
- `consult_assigned`
- `consult_completed`
- `follow_up`
- `closed`

### 说明
- `case.status` 是全系统最重要的业务状态字段。
- 页面显示、顾问待办、后台筛选，基本都围绕它走。

---

## 2.7 questionnaire_responses
保存一份问卷提交结果。

### 第一版建议字段
- `id`
- `case_id`
- `questionnaire_version`
- `response_json`
- `is_locked`
- `submitted_at`
- `created_at`
- `updated_at`

### 说明
- 第一版规则是“提交即锁定”，所以 `is_locked` 必须有。
- 问卷原始答案建议 JSON 保存，便于前期快速迭代。

---

## 2.8 standardized_inputs
保存标准化后的诊断输入快照。

### 第一版建议字段
- `id`
- `case_id`
- `questionnaire_response_id`
- `input_snapshot_json`
- `normalization_version`
- `created_at`

### 作用
- 把自由填写内容转成系统可判断字段
- 保证后续诊断可复盘

---

## 2.9 diagnostic_jobs
每次诊断任务一条记录。

### 第一版建议字段
- `id`
- `case_id`
- `questionnaire_response_id`
- `standardized_input_id`
- `job_status`
- `rule_version`
- `prompt_version`
- `model_name`
- `retry_count`
- `error_message`（可空）
- `started_at`
- `finished_at`（可空）
- `created_at`

### job_status 枚举建议
- `queued`
- `running`
- `succeeded`
- `failed`
- `manual_review`

### 说明
- `case.status` 管业务流程
- `diagnostic_job.job_status` 管任务执行状态
- 这两个不要混在一起

---

## 2.10 diagnostic_results
保存规则判断和数据库匹配结果。

### 第一版建议字段
- `id`
- `diagnostic_job_id`
- `rule_result_json`
- `risk_tags_json`
- `path_tags_json`
- `school_match_hint_json`
- `consultation_recommendation`
- `created_at`

### 作用
- 把 AI 生成前的结构化依据落库
- 后面做质量评估、规则优化时很关键

---

## 2.11 reports
保存报告正文。

### 第一版建议字段
- `id`
- `case_id`
- `diagnostic_job_id`
- `report_version`
- `report_type`（ai_draft / consultant_final）
- `content_markdown`
- `summary_json`
- `is_current`
- `viewed_at`（可空）
- `created_at`

### 说明
- 第一版虽然用户只看页面版，但内容仍建议以 markdown/html 可渲染方式保存。
- 后续如果顾问修订，可继续新增版本。

---

## 2.12 consultation_requests
保存用户咨询预约申请。

### 第一版建议字段
- `id`
- `case_id`
- `request_status`
- `contact_time_preference`
- `notes`
- `submitted_at`
- `created_at`
- `updated_at`

### request_status 枚举建议
- `submitted`
- `contacting`
- `confirmed`
- `cancelled`
- `expired`

---

## 2.13 consultant_assignments
保存顾问分配记录。

### 第一版建议字段
- `id`
- `case_id`
- `consultant_id`
- `assigned_by_admin_id`
- `assigned_at`
- `status`
- `created_at`

### status 枚举建议
- `assigned`
- `accepted`
- `reassigned`
- `completed`

---

## 2.14 consultations
保存正式咨询记录。

### 第一版建议字段
- `id`
- `case_id`
- `consultant_id`
- `consultation_request_id`
- `scheduled_at`（可空）
- `completed_at`（可空）
- `consultation_status`
- `notes_markdown`
- `final_advice_json`
- `created_at`
- `updated_at`

### consultation_status 枚举建议
- `pending`
- `scheduled`
- `completed`
- `cancelled`

---

## 2.15 follow_up_records
保存咨询后的跟进记录。

### 第一版建议字段
- `id`
- `case_id`
- `consultation_id`
- `consultant_id`
- `follow_up_type`
- `content`
- `next_action`
- `created_at`

### follow_up_type 示例
- `qa`
- `service_follow_up`
- `close_note`

---

## 3. 状态机与表字段映射

| 业务阶段 | case.status | 核心表 | 关键写入 |
|---|---|---|---|
| 问卷填写中 | `draft` | `cases`, `questionnaire_responses` | 创建 case 草稿、保存问卷草稿 |
| 待留联系方式 | `contact_pending` | `questionnaire_responses` | 问卷完成，待留资 |
| 已正式提交 | `submitted` | `users`, `user_profiles`, `cases` | 联系方式绑定、用户识别、case 激活 |
| 诊断处理中 | `processing` | `diagnostic_jobs`, `standardized_inputs` | 创建任务、标准化输入 |
| 报告已生成 | `report_ready` | `diagnostic_results`, `reports` | 保存结果、生成报告 |
| 用户已查看 | `report_viewed` | `reports` | 写入 viewed_at |
| 待顾问介入 | `consult_pending` | `consultation_requests` | 创建咨询预约申请 |
| 顾问已接手 | `consult_assigned` | `consultant_assignments` | 管理员分配顾问 |
| 咨询已完成 | `consult_completed` | `consultations` | 保存咨询结果 |
| 跟进中 | `follow_up` | `follow_up_records` | 保存跟进记录 |
| 已关闭 | `closed` | `cases` | 写入 closed_at |

---

## 4. 推荐的最小数据库主线

如果第一版保留最小够用且可扩展的结构，我建议先做这 14 张：

1. `users`
2. `user_profiles`
3. `consultant_profiles`
4. `admin_profiles`
5. `students`
6. `cases`
7. `questionnaire_responses`
8. `standardized_inputs`
9. `diagnostic_jobs`
10. `diagnostic_results`
11. `reports`
12. `consultation_requests`
13. `consultations`
14. `follow_up_records`

### 为什么这样配
因为你已经明确：
- 第一版要有基础会员体系
- 要有用户 / 顾问 / 管理员三类角色
- follow_up 需要单独保留

所以相比“极简 MVP 表数”，这版更适合真实业务落地。

### 可后续补充的表
- `consultant_assignments`
- `report_versions`
- `audit_logs`
- `school_match_logs`
- `permissions`

如果你希望首版顾问分配记录更规范，我建议 `consultant_assignments` 也直接首版上。

---

## 5. 我对第一版的建议

## 5.1 必须单独保留的对象
这几个不要省：
- `users`
- `students`
- `cases`
- `questionnaire_responses`
- `diagnostic_jobs`
- `reports`
- `consultations`
- `follow_up_records`

因为它们分别对应：
- 基础身份
- 服务对象
- 业务主线
- 原始输入
- 执行过程
- 输出结果
- 顾问交付
- 后续转化与服务沉淀

---

## 5.2 原始问卷和标准化输入不要混在一起
建议：
- 原始答案保留在 `questionnaire_responses.response_json`
- 标准化结果保留在 `standardized_inputs.input_snapshot_json`

原因：
- 便于回溯
- 便于修改标准化规则
- 避免把原始数据污染

---

## 5.3 任务状态和业务状态一定分开
建议：
- `cases.status` 管业务
- `diagnostic_jobs.job_status` 管系统任务

不要只用一个 status 字段管所有事情，后面一定乱。

---

## 5.4 账户体系第一版先做“统一账号 + 分角色资料”
建议：
- 统一认证入口放在 `users`
- 家长资料、顾问资料、管理员资料分表
- 第一版先采用单角色字段 `role`
- 后续如果要支持一人多角色，再升级成 `user_roles`

这是当前性价比最高的做法。

---

## 6. 已确认的数据库方向

目前已确认：

1. **账户体系单独做，包含用户 / 顾问 / 管理员基础会员体系**
2. **问卷答案先用 JSON 保存**
3. **报告先单表 + version 字段**
4. **follow_up 单独建表**

---

## 7. 还需要你拍板的 3 个点

### 决策点 1：accounts 第一版用手机号登录、微信登录，还是两者都支持？
#### 方案 A：手机号优先
#### 方案 B：微信优先
#### 方案 C：两者都支持

**我的建议：选 C。**
因为你现在的留资入口已经有手机号 / 微信号二选一，后面账户体系最好保持一致。

---

### 决策点 2：consultant_assignments 首版要不要单独建表？
#### 方案 A：不单独建，只在 cases 上挂 assigned_consultant_id
#### 方案 B：单独建表，保留历史分配记录

**我的建议：选 B。**
因为顾问分配是重要运营动作，后面很可能要追踪“谁分给谁、何时改派”。

---

### 决策点 3：reports 首版是否允许顾问修订并形成 consultant_final？
#### 方案 A：首版只保留 ai_draft
#### 方案 B：首版允许顾问修订并形成正式版

**我的建议：选 B。**
因为你后面真人咨询一定会有顾问判断，报告体系最好从一开始就留出口。

---

## 8. 下一步建议

下一步最适合继续细化：

1. **数据库表结构草案（字段级）**
2. **顾问工作台与管理后台的字段流转设计**

如果你同意，我下一步就先把上面 3 个决策点给出建议版，等你拍板后，我继续出字段级数据库设计。