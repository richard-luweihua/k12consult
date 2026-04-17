# 香港转学 AI 诊断系统：最终数据库架构设计 (V1.0)

## 1. 核心架构决策 (已确认)

本版本数据库架构基于以下核心商业逻辑：

1. **多孩子支持 (1:N)**：一名家长账户可关联多个孩子主体。
2. **快照式历史保留**：每次提交诊断均生成独立记录，支持用户修改问卷后的结论对比。
3. **数据快照依据**：保存生成报告那一瞬间的学校余位、规则模型快照。
4. **报告多版本可见**：用户端可查看 AI 初稿与顾问修订版，体现人工服务增值。
5. **内外部信息隔离**：管理员跟进逻辑及用户意愿分级对用户侧完全不可见。
6. **完整会员体系**：支持用户、顾问、管理员三类角色及独立 Profile。

---

## 2. 实体关系图 (ER 概览)

- `users` (1) --- (N) `students`
- `students` (1) --- (N) `cases`
- `cases` (1) --- (N) `questionnaire_responses`
- `cases` (1) --- (N) `reports`
- `cases` (1) --- (1) `admin_follow_up_records`
- `cases` (1) --- (N) `consultations`
- `diagnostic_jobs` (1) --- (1) `diagnostic_results` (含学校数据快照)

---

## 3. 详细表结构定义

## 3.1 身份与账户层

### users (账户主表)
- `id`: primary key
- `role`: enum (parent_user, consultant, admin, super_admin)
- `mobile`: varchar (unique index)
- `wechat_id`: varchar (unique index)
- `password_hash`: varchar (optional)
- `status`: enum (active, disabled)
- `created_at`, `updated_at`

### user_profiles / consultant_profiles / admin_profiles (资料表)
- `id`: primary key
- `user_id`: foreign key -> users.id
- [各自业务字段，见之前设计]
- `created_at`, `updated_at`

---

## 3.2 业务主体层

### students (学生主体)
- `id`: primary key
- `user_id`: foreign key -> users.id (建立 idx_user_id)
- `child_name`: varchar
- `gender`, `birth_year`
- `current_grade_raw`, `current_city`
- `created_at`, `updated_at`

### cases (咨询案例)
- `id`: primary key
- `case_no`: unique varchar (业务编号)
- `user_id`, `student_id`: foreign keys
- `status`: enum (见状态机定义)
- `assigned_consultant_id`: foreign key -> users.id (可空)
- `current_report_id`: foreign key -> reports.id (指向当前生效版本)
- `created_at`, `updated_at`, `closed_at`

---

## 3.3 诊断与输入层

### questionnaire_responses (问卷响应记录)
- `id`: primary key
- `case_id`: foreign key
- `response_json`: json (保存本次提交的全量答案)
- `is_latest`: boolean (标记是否为该 case 下最新一份答案)
- `created_at`

### diagnostic_jobs (诊断任务)
- `id`: primary key
- `case_id`, `response_id`: foreign keys
- `job_status`: enum (queued, running, succeeded, failed)
- `version_snapshot`: json (重要：保存此时的规则版本、Prompt版本、模型名)
- `started_at`, `finished_at`

### diagnostic_results (诊断结果快照)
- `id`: primary key
- `job_id`: foreign key
- `rule_result_json`: json
- `school_data_snapshot_json`: json (重要：**保存生成当时匹配到的学校名称、余位状态、关键参数快照**)
- `recommendation_tags`: json (风险/路径标签)
- `created_at`

---

## 3.4 交付与服务层

### reports (诊断报告)
- `id`: primary key
- `case_id`, `job_id`: foreign keys
- `report_version`: int (1, 2, 3...)
- `report_type`: enum (ai_draft, consultant_final)
- `content_markdown`: longtext
- `is_visible_to_user`: boolean (默认 true)
- `viewed_at`: datetime (用户首次查看时间)
- `created_by`: foreign key -> users.id
- `created_at`

### admin_follow_up_records (管理员跟进/交接)
- `id`: primary key
- `case_id`: foreign key (unique index, 一个 case 一个记录)
- `admin_user_id`: foreign key
- `intent_level`, `target_timeline`, `budget_level`: varchar (内部标签)
- `follow_up_notes`: text
- `handoff_summary`: text (给顾问看的摘要)
- `qualified_at`: datetime
- `created_at`, `updated_at`

### consultations (顾问正式咨询)
- `id`: primary key
- `case_id`, `consultant_id`: foreign keys
- `status`: enum (scheduled, completed, cancelled)
- `notes_markdown`: text
- `final_advice_json`: json (结构化结论)
- `created_at`, `updated_at`

### follow_up_records (会后跟进)
- `id`: primary key
- `case_id`, `consultant_id`: foreign keys
- `category`: varchar (答疑, 进度跟进)
- `content`: text
- `created_at`

---

## 4. 关键索引建议 (优化性能)

1. **联合索引 `(student_id, status)`**: 快速查询某孩子当前的活跃案例。
2. **唯一索引 `(case_id, report_version)`**: 确保报告版本逻辑不乱。
3. **索引 `mobile` 和 `wechat_id`**: 极速登录。
4. **索引 `diagnostic_jobs.job_status`**: 方便后台队列处理程序拉取待执行任务。

---

## 5. 存储策略总结

| 策略项 | 实现方式 |
|---|---|
| **修改问卷后如何对比？** | 每次提交生成新的 `questionnaire_responses` 记录，报告版本增加，通过时间戳和版本号回溯。 |
| **学校数据更新了怎么办？** | 报告生成时将关联学校的核心参数（如余位、难度）直接冗余存入 `diagnostic_results.school_data_snapshot_json`。 |
| **如何体现顾问劳动力？** | 用户能看到两个版本报告，一个类型为 `ai_draft`，一个为 `consultant_final`。 |

---

## 6. 下一步建议

数据库最终架构已定。

我建议现在做最后一步：
**《K12consult 第一版：核心业务规则判定逻辑表 (Rule Book)》**

我们需要把下面这些“死规则”定下来：
- 身份 (Dependant/Quality Talent) 对应可入读学校类型的逻辑矩阵。
- 英文水平 (Beginner -> Advanced) 对应风险等级的算法。
- 年级段与插班窗口期的对应关系。

如果你同意，我下一步直接：
**细化这些判定规则，作为开发实现的逻辑说明。**