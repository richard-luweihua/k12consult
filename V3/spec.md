# K12consult V3 — 技术规格说明书 (Technical Specification)

> **定位**：本文件是 K12consult 系统的唯一权威技术规格文档。涵盖数据库架构、状态机、登录验证、页面字段映射、学校数据模型、管理后台设计及数据导入规范。所有开发实现以本文件为准。

---

## 1. 架构概览

### 1.1 核心架构决策
1. **多孩子支持 (1:N)**：一名家长可关联多个孩子
2. **快照式历史保留**：每次诊断生成独立记录，支持结论对比
3. **数据快照依据**：保存生成报告时的学校余位、规则模型快照
4. **报告多版本**：用户可见 `ai_draft` 与 `consultant_final`
5. **内外部信息隔离**：管理员跟进逻辑对用户侧完全不可见
6. **统一账户体系**：用户/顾问/管理员共用认证入口
7. **登录方案 A**：手机号验证码主登录，邮箱密码备用

### 1.2 实体关系概览
```
users (1) --- (N) students
users (1) --- (N) user_identities
users (1) --- (N) user_sessions
students (1) --- (N) cases
cases (1) --- (N) questionnaire_responses
cases (1) --- (N) reports
cases (1) --- (1) admin_follow_up_records
cases (1) --- (N) consultant_assignments
cases (1) --- (N) case_follow_ups
diagnostic_jobs (1) --- (1) diagnostic_results
```

### 1.3 最小可用表集（15 张）
1. `users` — 统一账号
2. `user_identities` — 登录标识绑定
3. `user_sessions` — 会话管理
4. `login_challenges` — 验证码/二次验证
5. `user_profiles` — 家长资料
6. `consultant_profiles` — 顾问资料
7. `admin_profiles` — 管理员资料
8. `students` — 孩子主体
9. `cases` — 业务主表
10. `questionnaire_responses` — 问卷答案
11. `standardized_inputs` — 标准化输入快照
12. `diagnostic_jobs` — 诊断任务
13. `diagnostic_results` — 诊断结果
14. `reports` — 诊断报告
15. `consultation_requests` — 咨询意向
16. `admin_follow_up_records` — 管理员跟进
17. `consultant_assignments` — 顾问派单
18. `case_follow_ups` — 顾问跟进记录

可后续补充：`audit_logs`、`report_versions`、`school_match_logs`、`permissions`

---

## 2. 数据库 DDL（完整 Schema）

### 2.1 身份与账户层

```sql
-- 账户主表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) DEFAULT 'parent_user'
        CHECK (role IN ('parent_user', 'consultant', 'admin', 'super_admin')),
    mobile VARCHAR(32) UNIQUE,
    email VARCHAR(128) UNIQUE,
    wechat_id VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255),           -- 仅邮箱登录使用
    mobile_verified_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'disabled', 'pending')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 登录标识绑定表
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    identity_type VARCHAR(20) CHECK (identity_type IN ('mobile', 'email', 'wechat')),
    identity_value VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identity_type, identity_value)
);

-- 会话表
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_token_hash VARCHAR(255) UNIQUE,
    device_id VARCHAR(128),
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 登录验证码/二次验证
CREATE TABLE login_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),  -- 注册前可空
    identity_type VARCHAR(20) CHECK (identity_type IN ('mobile', 'email')),
    identity_value VARCHAR(100) NOT NULL,
    challenge_type VARCHAR(20)
        CHECK (challenge_type IN ('otp_login', 'otp_signup', 'risk_reauth')),
    code_hash VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    status VARCHAR(20) DEFAULT 'issued'
        CHECK (status IN ('issued', 'verified', 'expired', 'blocked')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 资料层

```sql
-- 家长资料
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    name VARCHAR(64),
    preferred_contact VARCHAR(32),      -- mobile / wechat
    source_channel VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顾问资料
CREATE TABLE consultant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    display_name VARCHAR(64),
    specialty_tags JSONB,               -- 擅长标签
    bio TEXT,
    active_status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员资料
CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    name VARCHAR(64),
    admin_level VARCHAR(32),            -- admin / super_admin
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 业务主体层

```sql
-- 孩子主体
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    child_name VARCHAR(64) NOT NULL,
    gender VARCHAR(16),
    birth_year INT,
    current_grade_raw VARCHAR(64),
    current_city VARCHAR(64),
    current_school_name VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_students_user_id ON students(user_id);

-- 业务主表
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_no VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    student_id UUID REFERENCES students(id),
    status VARCHAR(50) DEFAULT 'draft',
    source_channel VARCHAR(64),
    questionnaire_version VARCHAR(32),
    current_report_id UUID,             -- 指向当前生效 reports.id
    assigned_consultant_id UUID REFERENCES users(id),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cases_student_status ON cases(student_id, status);
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
```

**`cases.status` 枚举**：
```
draft | contact_pending | submitted | processing | report_ready | report_viewed
| consult_intent_submitted | admin_following | awaiting_user_info
| consult_ready_for_assignment | consult_assigned | nurturing | follow_up | closed
```

### 2.4 诊断与输入层

```sql
-- 问卷答案
CREATE TABLE questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) NOT NULL,
    questionnaire_version VARCHAR(32),
    response_json JSONB NOT NULL,        -- 原始答案
    is_locked BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qr_case_id ON questionnaire_responses(case_id);

-- 标准化输入快照
CREATE TABLE standardized_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    questionnaire_response_id UUID REFERENCES questionnaire_responses(id),
    input_snapshot_json JSONB NOT NULL,
    normalization_version VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 诊断任务
CREATE TABLE diagnostic_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    questionnaire_response_id UUID REFERENCES questionnaire_responses(id),
    standardized_input_id UUID REFERENCES standardized_inputs(id),
    job_status VARCHAR(20) DEFAULT 'queued'
        CHECK (job_status IN ('queued', 'running', 'succeeded', 'failed', 'manual_review')),
    rule_version VARCHAR(32),
    prompt_version VARCHAR(32),
    model_name VARCHAR(128),
    version_snapshot JSONB,             -- 规则/Prompt/模型版本快照
    retry_count INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dj_case_id ON diagnostic_jobs(case_id);
CREATE INDEX idx_dj_job_status ON diagnostic_jobs(job_status);

-- 诊断结果
CREATE TABLE diagnostic_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnostic_job_id UUID REFERENCES diagnostic_jobs(id),
    rule_result_json JSONB,
    school_data_snapshot_json JSONB,     -- 生成时匹配学校的参数快照
    risk_tags JSONB,
    path_tags JSONB,
    school_match_hint_json JSONB,
    consultation_recommendation VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 交付与服务层

```sql
-- 诊断报告
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    diagnostic_job_id UUID REFERENCES diagnostic_jobs(id),
    report_version INT DEFAULT 1,
    report_type VARCHAR(20) DEFAULT 'ai_draft'
        CHECK (report_type IN ('ai_draft', 'consultant_final')),
    content_json JSONB NOT NULL,        -- 取代 Markdown，保存结构化章节数据
    summary_json JSONB,
    is_current BOOLEAN DEFAULT TRUE,
    is_visible_to_user BOOLEAN DEFAULT TRUE,
    viewed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX uk_reports_case_version ON reports(case_id, report_version);

-- 咨询意向
CREATE TABLE consultation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    request_status VARCHAR(32) DEFAULT 'submitted'
        CHECK (request_status IN (
            'submitted', 'admin_following', 'awaiting_user_info',
            'qualified', 'nurturing', 'assigned', 'cancelled', 'expired'
        )),
    contact_time_preference VARCHAR(128),
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员跟进记录
CREATE TABLE admin_follow_up_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) UNIQUE,
    consultation_request_id UUID REFERENCES consultation_requests(id),
    admin_user_id UUID REFERENCES users(id),
    follow_up_status VARCHAR(32) DEFAULT 'following'
        CHECK (follow_up_status IN ('following', 'awaiting_user_info', 'qualified', 'nurturing', 'closed')),
    intent_level VARCHAR(32),
    target_timeline VARCHAR(64),
    budget_level VARCHAR(32),
    consult_focus_json JSONB,
    missing_info_json JSONB,
    handoff_summary TEXT,
    next_action VARCHAR(255),
    qualified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顾问派单记录
CREATE TABLE consultant_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    consultant_id UUID REFERENCES users(id),
    assigned_by_admin_id UUID REFERENCES users(id),
    priority_level VARCHAR(10) DEFAULT 'normal'
        CHECK (priority_level IN ('low', 'normal', 'high')),
    status VARCHAR(20) DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'accepted', 'reassigned', 'completed')),
    handoff_summary TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 顾问跟进记录
CREATE TABLE case_follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id),
    consultant_id UUID REFERENCES users(id),
    status VARCHAR(20)
        CHECK (status IN ('follow_up', 'closed', 'nurturing')),
    note TEXT,
    next_action VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 学校数据库

```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edb_code VARCHAR(32) UNIQUE,         -- 教育局编号（判重唯一标识）
    name_zh VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    district VARCHAR(64),                -- 所属校网/区域
    category VARCHAR(32),                -- 官立/津贴/直资/私立/国际
    curriculum VARCHAR(64),              -- DSE/IB/A-Level/AP 等
    level_range VARCHAR(16),             -- K/P/S
    gender_type VARCHAR(16),             -- 男女校/男校/女校
    address TEXT,
    website VARCHAR(255),

    -- 招生动态（核心护城河）
    intake_status VARCHAR(32),           -- open/closed/waitlist/seasonal
    grade_availability_json JSONB,       -- {"G1":"limited","G7":"full",...}
    next_intake_window VARCHAR(64),
    interview_feedback_cycle INT,        -- 面试反馈天数

    -- 隐形门槛
    identity_requirement VARCHAR(128),
    lang_instruction VARCHAR(32),        -- 纯英/英普/英粤
    interview_lang VARCHAR(64),          -- 面试语言
    exam_difficulty_avg INT,             -- 笔试难度 1-10
    english_exam_focus VARCHAR(64),
    mainland_friendly_score INT,         -- 内地生友好度 1-10
    eal_support_level INT,              -- EAL 支持 0-10
    parent_vibe_pref VARCHAR(128),

    -- 财务
    tuition_annual_range JSONB,          -- {"P":120000,"S":150000}
    total_annual_cost_est INT,
    debenture_type VARCHAR(32),          -- 无/必买/选买/企业券
    debenture_price_ref VARCHAR(128),

    -- 顾问评价
    academic_intensity INT,              -- 学术压力 1-10
    bully_prevention_score INT,          -- 校园氛围 1-10
    consultant_top_pros TEXT,
    consultant_top_cons TEXT,

    -- 维护信息
    last_updated_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_schools_category ON schools(category);
CREATE INDEX idx_schools_district ON schools(district);
```

---

## 3. 状态机 (Case Lifecycle)

### 3.1 状态与数据库映射

| 业务阶段 | case.status | 核心表写入 | 操作角色 |
|---------|-------------|-----------|---------|
| 问卷填写中 | `draft` | cases, questionnaire_responses | User |
| 待留联系方式 | `contact_pending` | questionnaire_responses | User |
| 已正式提交 | `submitted` | users, cases | User |
| 诊断处理中 | `processing` | diagnostic_jobs, standardized_inputs | System |
| 报告已生成 | `report_ready` | diagnostic_results, reports | System |
| 用户已查看 | `report_viewed` | reports.viewed_at | User |
| 已提交咨询意向 | `consult_intent_submitted` | consultation_requests | User |
| 管理员跟进中 | `admin_following` | admin_follow_up_records | Admin |
| 待用户补资料 | `awaiting_user_info` | admin_follow_up_records | Admin |
| 可分配顾问 | `consult_ready_for_assignment` | admin_follow_up_records | Admin |
| 顾问已接手 | `consult_assigned` | consultant_assignments | Admin |
| 跟进中 | `follow_up` | case_follow_ups | Consultant |
| 未成交转资源库 | `nurturing` | case_follow_ups | Admin/Consultant |
| 成交关闭 | `closed` | cases.closed_at, case_follow_ups | Consultant |

### 3.2 状态流转图

```
draft → submitted → processing → report_ready → report_viewed
→ consult_intent_submitted → admin_following
→ consult_ready_for_assignment → consult_assigned → follow_up → closed

分支：
admin_following → awaiting_user_info → admin_following
admin_following → nurturing
follow_up → nurturing
closed → admin_following (回退，需填写原因)
```

### 3.3 关键约束
1. 进入 `consult_assigned` 前必须有 `assigned_consultant_id`
2. 进入 `follow_up` 前必须至少有 1 条顾问跟进记录
3. 进入 `closed`（成交）前必须填写成交结论
4. 进入 `nurturing`（资源库）前必须填写未成交原因
5. `awaiting_user_info` 超过 7 天进入 SLA 异常池
6. **数据同步原则 (State Sync)**：任何对子状态的变更，**必须在同一事务内同步更新全局主表**：`UPDATE cases SET status = $new_status, updated_at = NOW() WHERE id = $case_id`，杜绝状态双写导致的散落不一致。
7. **任务队列防并发锁 (Critical)**：拉取 `diagnostic_jobs` 队列表时，**必须使用数据库级并发控制** (`FOR UPDATE SKIP LOCKED`)，防止双重执行与扣费。

---

## 4. 登录与认证

### 4.1 登录策略
- 问卷前**不强制登录**
- 强登录门禁：提交咨询意向、补资料、查看"我的案例"
- 统一入口，按角色跳转工作区

### 4.2 登录流程（两步式）
1. 输入账号标识（手机号或邮箱）
2. 系统判断账号状态：
   - 已有账号 + 手机号 → OTP 验证码
   - 已有账号 + 邮箱 → 密码验证
   - 新账号 → 手机号 OTP 注册，补全资料后自动绑定
   - 邮箱注册可选填写手机号；若填写则同步入用户档案与会话
3. 登录成功后按角色跳转，保留 `next` 回跳

### 4.3 会话策略
- Cookie: `httpOnly + sameSite=lax`
- 默认会话 7 天
- 敏感操作要求二次校验

### 4.4 验证脚本

**邮箱密码模式**（当前可用）：
```bash
npm run verify:login
```

**手机验证码模式**：
```bash
BASE_URL=http://127.0.0.1:3002 \
LOGIN_VERIFY_MODE=mobile_otp \
TEST_MOBILE=13800000000 \
npm run verify:login
```

### 4.5 验收标准 (P0)
1. 未登录可正常访问问卷，关键动作被门禁拦截
2. 登录成功后会话生效，通过权限校验
3. 退出后会话失效，受保护接口返回 401
4. 角色跳转正确（家长→dashboard / 顾问→advisor / 管理员→admin）

---

## 5. 页面字段映射

### 5.1 用户端

#### 首页 (`/`)
- 主标题：`香港留学插班一键规划`
- 四价值点：`实时学校信息 · 隐形门槛识别 · 严谨规则诊断 · 服务闭环跟进`
- 唯一按钮：`开始AI诊断`
- 辅助文案：`5-10分钟完成`
- 交互：`开始AI诊断` 统一跳转 ` /questionnaire `（不因登录态变化）
- 右上角登录入口
- 埋点：`home_viewed`, `home_primary_cta_clicked`

#### 问卷页 (`/questionnaire`)
- 标题：`填写信息，生成诊断报告`
- 5 组字段：身份资格 → 孩子基础 → 目标能力 → 顾虑意向 → 联系方式
- 写入：`students` 基础字段 + `questionnaire_responses.response_json`
- 交互：分步展示、自动保存草稿、进度显示、未登录可填写
- 提交时未登录→`/login?next=/questionnaire?resume=1`
- 提交校验：未填必填项需高亮字段，并显示可点击缺失项清单；点击可滚动定位
- 主按钮：`提交并生成诊断报告`

#### 报告页 (`/result/[submissionId]`)
- **严格 8 章节结构**（0-7），顺序不可更改：
  - §0 基本信息
  - §1 核心结论 (The Verdict)
  - §2 核心诊断维度（时机 + 英文风险）
  - §3 目标学校穿透建议（逐校：适配度/卡点/私货/学费）
  - §4 深度风险预警
  - §5 后续行动清单（两阶段）
  - §6 专家人工介入引导（唯一按钮：`立即预约资深顾问`）
  - §7 诊断依据声明
- 正文后：咨询意向提交 + 补资料入口（仅状态允许时显示）
- 数据契约：建议 `reportView` 结构化 JSON
- 咨询意向手机号预填优先级：`consultation_request.mobile` > `questionnaire.mobile` > `session.user.mobile`

#### 家长仪表板 (`/dashboard`)
- **Next Action 主卡**：根据 case.status 动态显示唯一主按钮
- 当状态为 `consult_intent_submitted` 时，主按钮显示“咨询意向已提交”（禁用态），副按钮保留“查看报告”
- **我的案例列表**：按 updatedAt 倒序
- **进展时间线**：问卷提交→报告生成→管理员跟进→顾问分配→关闭
- **一键修改 (Duplicate & Edit)**：因为已提交问卷锁定，仪表板必须提供“克隆并修改”功能进入新草稿，防死胡同。
- **待办提醒**：最多 3 条，按紧急度排序
- 空态：`暂无案例，先完成一份诊断` → `/questionnaire`

#### 咨询预约页
- 写入：`consultation_requests`（时间偏好、重点问题）
- 更新：`cases.status = consult_intent_submitted`
- 门禁：强制登录 + 强制补全联系方式

---

## 11. 2026-04-19 交互修复记录（V3.1.1）

1. 首页“开始AI诊断”入口统一跳转问卷，避免登录态导致错误落页。
2. 问卷提交前增加必填缺失清单 + 字段级高亮 + 自动滚动定位。
3. 报告读取权限修复：顾问可查看自己提交生成的报告（即便未指派给自己）。
4. 仪表板修复：不再将用户流程误导向顾问工作台。
5. 咨询意向提交后，Dashboard 主按钮切换为“已提交”禁用态。
6. 注册手机号同步到会话并用于咨询意向手机号自动带入。

### 5.2 顾问端

#### 案例列表 (`/advisor`)
- 字段：case_no、状态、孩子姓名/年级、家长联系方式、管理员交接摘要、更新时间
- 筛选：按状态、更新时间

#### 案例详情
- 基础信息区：家长+孩子
- 管理员交接区：handoff_summary、intent_level、budget_level、missing_info
- 操作区：顾问备注、下一步动作、成交结论/未成交原因、状态推进按钮

### 5.3 管理后台

#### 总控台 (`/admin/workbench`)
- 三大入口卡：管理顾问、Case 总览与指派、Case 状态管理
- 核心指标：待指派数、首次联系超时数、待补资料超 7 天数、今日新增

#### 顾问管理 (`/admin/consultants`)
- 列表：姓名/邮箱、状态、活跃Case数、产能占用率
- 操作：新增、编辑、停用/恢复、查看名下Case、转派
- 规则：邮箱唯一、软删除、停用前须完成转派

#### Case 总览 (`/admin/cases`)
- 筛选：V2状态、优先级、意愿、预算、是否指派、SLA风险
- 列表：家长/学生、状态、意愿、预算、SLA、顾问、最近备注
- 指派：单条/批量/推荐（专长40%、负载30%、SLA20%、转化10%）

#### Case 详情 (`/admin/cases/[leadId]`)
- 操作：更新意愿/预算/时间、维护缺失资料、填写交接摘要、指派顾问、推进状态
- 查看：状态变更历史与操作日志

### 5.4 权限边界

| 端 | 可见 | 不可见 |
|----|------|--------|
| 用户端 | 本人问卷/case/报告/咨询记录 | 顾问备注、风险标签原始值、规则结果、Prompt/模型信息 |
| 顾问端 | 已分配案例、管理员交接摘要、本案例跟进 | 全局配置、其他顾问绩效 |
| 管理端 | 全量用户/顾问/案例/模板/学校 | 不承担顾问工作台职责 |

---

## 6. 学校数据导入规范

### 6.1 导入方案
采用**方案 A（管理员统一审核导入）**：顾问在协作 Excel 填写 → 管理员导出 CSV → 上传系统 → Upsert

### 6.2 Excel 列定义

**Group A: 身份标识（必填）**
`school_id` / `edb_code` / `name_zh` / `name_en` / `district` / `category` / `curriculum` / `gender` / `level` / `website`

**Group B: 招生动态**
`intake_status` / `grade_availability_summary` / `next_window_date` / `last_updated_date`

**Group C: 分年级余位**
`avail_G1` ~ `avail_G12`（0=无位, 1=少量, 2=有位）→ 导入时自动转 JSON

**Group D: 门槛与偏好**
`lang_inst` / `interview_lang_req` / `exam_difficulty_avg` / `english_entry_barrier` / `mainland_score` / `eal_support` / `identity_limit`

**Group E: 成本**
`tuition_year_min` / `tuition_year_max` / `bond_type` / `bond_price_ref`

**Group F: 顾问评价**
`academic_level` / `school_vibe` / `pros_tags` / `cons_tags` / `consultant_direct_quote`

### 6.3 导入规则
- `edb_code` 作为判重唯一标识
- 命中已有记录 → 全字段覆盖更新
- 空值不默认删除（可配置）
- `curriculum` 等字段建议用数据验证下拉菜单
- 分年级余位列导入时自动合并为 `grade_availability_json`

### 6.4 管理员导入流程
1. 顾问在共享文档维护 Excel
2. 每周五管理员审核改动
3. 导出 CSV → 后台 Upload & Review
4. 系统高亮敏感字段变动（余位、难度）
5. 管理员 Confirm Publish → AI 诊断逻辑即时生效

---

## 7. 管理后台 API（最小可用）

### 7.1 顾问管理
- `GET /api/admin/consultants` — 列表
- `POST /api/admin/consultants` — 新增
- `PATCH /api/admin/consultants/[id]` — 编辑
- `DELETE /api/admin/consultants/[id]` — 软删除

### 7.2 Case 指派与状态
- `GET /api/admin/cases` — 列表（含筛选）
- `PATCH /api/admin/cases/[id]/assign` — 指派顾问
- `PATCH /api/admin/cases/[id]/status` — 状态推进
- `GET /api/admin/cases/[id]/timeline` — 状态变更历史

### 7.3 管理指标
- `GET /api/admin/metrics` — 待指派数、超时数、今日新增、顾问负载

### 7.4 用户端 API
- `GET /api/my-leads` — 家长全部案例
- `GET /api/results/[submissionId]` — 报告详情
- `POST /api/results/[submissionId]/consultation-intent` — 提交咨询意向
- `POST /api/results/[submissionId]/supplemental-info` — 提交补资料

---

## 8. 关键索引汇总

| 表 | 索引 |
|----|------|
| users | `mobile` (UNIQUE), `email` (UNIQUE), `wechat_id` (UNIQUE) |
| user_identities | `(identity_type, identity_value)` (UNIQUE) |
| user_sessions | `session_token_hash` (UNIQUE), `(user_id, status)` |
| login_challenges | `(identity_value, status)` |
| students | `user_id` |
| cases | `case_no` (UNIQUE), `(student_id, status)`, `user_id`, `status` |
| questionnaire_responses | `case_id` |
| diagnostic_jobs | `case_id`, `job_status` |
| reports | `(case_id, report_version)` (UNIQUE), `is_current` |
| consultation_requests | `case_id`, `request_status` |
| admin_follow_up_records | `case_id` (UNIQUE), `admin_user_id`, `follow_up_status` |
| consultant_assignments | `case_id`, `consultant_id` |
| case_follow_ups | `case_id`, `consultant_id`, `status` |
| schools | `edb_code` (UNIQUE), `category`, `district` |

---

## 9. 审计与安全

### 9.1 审计日志（建议表结构）
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(32),
    entity_type VARCHAR(64),
    entity_id UUID,
    action VARCHAR(64),
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.2 必须记录的审计事件
- 顾问新增/编辑/停用/恢复
- Case 指派/转派
- Case 状态变化
- Case 关闭/重新激活
- 账号合并
- 登录/角色变更

### 9.3 安全要求
- RLS 行级安全：用户仅可访问本人 case
- 登录失败频控 + 异常设备提醒
- 内部标签/备注对用户端不可见
- 学校数据库敏感字段（mainland_friendly_score 等）不暴露给用户端

---

## 10. 开发路由映射

| 页面 | 路由 | 实现文件 |
|------|------|---------|
| 首页 | `/` | `app/page.js` |
| 问卷 | `/questionnaire` | `app/questionnaire/page.js` |
| 报告 | `/result/[submissionId]` | `app/result/[submissionId]/page.js` |
| 家长仪表板 | `/dashboard` | `app/dashboard/page.js` |
| 顾问工作台 | `/advisor` | `app/advisor/page.js` |
| 管理总控台 | `/admin/workbench` | `app/admin/workbench/page.js` |
| 顾问管理 | `/admin/consultants` | `app/admin/consultants/page.js` |
| Case 总览 | `/admin/cases` | `app/admin/cases/page.js` |
| Case 详情 | `/admin/cases/[leadId]` | `app/admin/cases/[leadId]/page.js` |
| 培育池 | `/admin/nurturing` | `app/admin/nurturing/page.js` |

---

*Last Updated: 2026-04-19*
*Version: V3.1.1 (Consolidated + Hotfix)*
