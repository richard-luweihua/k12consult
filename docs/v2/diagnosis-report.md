# 香港转学 AI 诊断报告 (模板 V1.2)

## 0. 基本信息
- **学生主体**：{{student_name}}
- **当前年级**：{{current_grade}}
- **身份状态**：{{identity_status_verdict}}
- **预算匹配**：{{budget_match_summary}}

---

## 1. 核心结论 (The Verdict)
{{core_conclusion_vibe}}

> **AI 专家判定**：
> {{identity_warning_if_any}}
> {{overall_risk_level_summary}}

---

## 2. 核心诊断维度

### 2.1 申请时机与窗口 (Intake Timing)
- **判定状态**：{{intake_window_verdict}}
- **详细评估**：
{{intake_timing_analysis}}

### 2.2 语言衔接风险 (English Gap)
- **预警等级**：{{english_risk_level}}
- **能力对比**：
- 用户当前：{{user_english_level_desc}}
- 目标池门槛：{{target_pool_english_barrier}}
- **专家建议**：{{english_bridge_advice}}

---

## 3. 目标学校穿透建议 (Target School Drilldown)

{{#each recommended_schools}}
### {{school_name}}
- **适配度评估**：{{match_score}} / 10
- **关键卡点**：{{critical_bottleneck}}
- **顾问私货**：{{consultant_insider_tips}}
- **学费提示**：{{tuition_fit_note}}
{{/each}}

---

## 4. 深度风险预警 (Critical Alerts)
{{#each critical_warnings}}
- **{{warning_title}}**：{{warning_content}}
{{/each}}

---

## 5. 后续行动清单 (Next Steps)

### 第一阶段：立即执行 (下一步 24 小时)
1. {{action_1}}
2. {{action_2}}

### 第二阶段：资料储备 (1-2 周)
1. {{action_3}}
2. {{action_4}}

---

## 6. 专家人工介入引导 (Convert to Consultation)

> **由于你的案例涉及 {{personalized_complexity_labels}}，建议立即预约资深顾问进行深度线下评估。**

[ 立即预约资深顾问 ]
[ 拨通咨询电话 ]

---

## 7. 诊断依据声明
- 规则版本：V1.0
- 模型引擎：K12-Expert-Engine
- 学校库快照：{{data_snapshot_date}}
