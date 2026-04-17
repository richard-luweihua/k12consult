# 香港学校数据库：第一版核心字段设计草案

## 1. 结论

学校数据库是整个系统的核心底层指标。  
我们不需要像百科全书那样大而全，但必须在 **“插班诊断”** 这个维度上做到极细。

设计原则采用 **方案 C**：基础字段靠爬虫/AI，核心判断字段（带“私货”的）靠顾问手动维护。

---

## 2. 字段分类设计

## 2.1 基础信息类（大模型可获取）
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint | 主键 |
| name_zh | varchar | 中文全称 |
| name_en | varchar | 英文全称 |
| school_code | varchar | EDB 编号（唯一标识） |
| area_district | varchar | 所属校网 / 区域（如：中西区、沙田） |
| school_type | varchar | 类型：官立 / 津贴 / 直资 / 私立 / 国际 |
| curriculum_type | varchar | 课程：DSE / IB / A-Level / AP / 加拿大 / 澳洲 等 |
| level_range | varchar | 年级段：K / P / S |
| gender_type | varchar | 男女校 / 男校 / 女校 |
| address | text | 详细地址 |
| website | varchar | 官网 URL |

---

## 2.2 诊断核心类：动态状态（核心护城河）
| 字段名 | 类型 | 说明 |
|---|---|---|
| intake_status | varchar | 整体招生状态：open / closed / waitlist / seasonal |
| grade_availability_json | json | **各年级余位细表**。格式：`{"G1": "limited", "G7": "full", ...}` |
| next_intake_window | varchar | 下一个大型招生窗口说明（如：2024年11月） |
| interview_feedback_cycle | int | 面试后预计反馈天数 |

---

## 2.3 诊断核心类：隐形门槛与偏好（核心护城河）
| 字段名 | 类型 | 说明 |
|---|---|---|
| identity_requirement | varchar | 身份硬门槛：如“仅收受养人”、“接受受养人及高才” |
| lang_instruction | varchar | 授课语言：纯英 / 英粤 / 英普 |
| interview_lang | varchar | 面试语言：普 / 粤 / 英 组合 |
| exams_difficulty | int | 笔试总难度等级 (1-10) |
| english_exam_focus | varchar | 英文笔试重点：听说 / 读写 / 语法 / 全面 |
| mainland_friendly_score| int | 对内地生友好度 (1-10)。根据历史录取、包容度判定 |
| eal_support_level | int | 英语衔接支持力度 (0-10)。0 为无，10 为极强 |
| parent_vibe_pref | varchar | 对家长背景偏好摘要 |

---

## 2.4 财务成本类
| 字段名 | 类型 | 说明 |
|---|---|---|
| tuition_annual_range | json | 学费范围（分年级）。格式：`{"P": 120000, "S": 150000}` |
| total_annual_cost_est | int | 年度总持有成本预估（含杂费） |
| debenture_type | varchar | 债券类型：无 / 必买 / 选买 / 企业券 |
| debenture_price_ref | varchar | 债券参考价格或损耗说明 |

---

## 2.5 顾问评价类（带“刺”的数据）
| 字段名 | 类型 | 说明 |
|---|---|---|
| academic_intensity | int | 学术压力指数 (1-10) |
| bully_prevention_score | int | 校园氛围 / 霸凌预防（顾问口碑分，1-10） |
| consultant_top_pros | text | 顾问点评：核心核心优点 |
| consultant_top_cons | text | 顾问点评：核心避坑点 |

---

## 3. 如何与诊断逻辑（Rule Logic）挂钩

这些字段不只是用来显示的，它们是规则引擎的参数：

- **预警逻辑 A**：若 `eal_support_level < 3` 且 用户 `english_level = beginner` -> **触发“极高衔接风险”预警**。
- **过滤逻辑 B**：若 `identity_requirement` 不包含用户当前签证类型 -> **直接标记该校“不可申请”**。
- **推荐逻辑 C**：若用户关注“学术压力”，优先推荐 `academic_intensity <= 6` 的学校。

---

## 4. 后台维护建议

### 管理员工作流：
1. **基础同步**：每月由爬虫更新一次官网学费、地址、电话等。
2. **状态更新**：每周或根据突发情报，更新一次 `grade_availability_json`（这是管理员最重的工作）。
3. **标签定调**：每季度根据录取案例情况，由首席顾问更新 `mainland_friendly_score` 和 `eal_support_level`。

---

## 5. 下一步建议

学校数据库的“底座”定下来了。

我建议下一步：
**定义第一版诊断报告（AI Report）的 Prompt 结构。**

既然我们已经有了“带刺”的学校数据，Prompt 就不再是“请根据以上信息写一份报告”，而是要包含：
- **如何引用 `consultant_top_cons`（避坑点）**
- **如何根据 `academic_intensity` 做对比建议**
- **如何分阶段输出行动清单**

如果你同意，我下一步直接做：
**《K12consult AI 诊断报告 Prompt 结构化设计草案》**