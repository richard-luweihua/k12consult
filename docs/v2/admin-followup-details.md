# 香港转学 AI 诊断系统：管理员跟进记录表（字段级）

## 1. 结论

`admin_follow_up_records` 是整个系统的“过滤器”。  
它记录了管理员通过电话或微信联系用户后的所有非结构化到结构化的转化过程。

这些字段将直接作为“交接包”的一部分展示在顾问工作台上。

---

## 2. 表结构定义

## 2.1 admin_follow_up_records
管理员跟进记录表。

| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint / uuid | 主键 |
| case_id | bigint / uuid | 关联 cases.id |
| consultation_request_id | bigint / uuid | 关联 consultation_requests.id |
| admin_user_id | bigint / uuid | 关联 users.id（执行跟进的管理员） |
| follow_up_status | varchar(32) | 跟进状态 |
| intent_level | varchar(32) | 咨询意愿等级 |
| target_timeline | varchar(64) | 推进时间判断 |
| budget_level | varchar(32) | 预算接受度 |
| consult_focus_json | json | 咨询重点（存数组） |
| missing_info_json | json | 缺失资料点（存数组） |
| handoff_summary | text | 给顾问的交接摘要 |
| admin_internal_notes | text | 管理员内部备注，不给顾问看，可空 |
| sla_status | varchar(32) | SLA 状态：in_progress / violated / met |
| first_contact_at | datetime | 首次呼出/联系时间，可空 |
| qualified_at | datetime | 确认为合规案例的时间，可空 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 3. 字段枚举与定义

## 3.1 intent_level（咨询意愿）
- `high`：非常有诚意，已准备好时间，配合度高
- `medium`：有需求，但还有顾虑，需顾问解答
- `low`：只是了解一下，不一定真的咨询

---

## 3.2 target_timeline（推进时间）
- `this_semester`：这学期
- `sep_intake`：今年 9 月插班
- `next_year`：明年及以后
- `uncertain`：尚不确定

---

## 3.3 budget_level（预算接受度）
- `local_oriented`：本地学校（津贴/官立）为主
- `medium_private`：中等学费私立/直资
- `international`：由于预算充足，首选顶级国际
- `unspecified`：未明确表态

---

## 3.4 consult_focus（咨询重点）
管理员勾选的标签，存入 JSON。
- `school_matching`：选校匹配
- `pathway_logic`：转学路径逻辑
- `english_gap`：英文差距与衔接
- `interview_prep`：面试准备
- `logistics_visa`：手续与证件
- `comprehensive`：全方位咨询

---

## 3.5 missing_info（缺失资料点）
标记哪些还没拿到的，存入 JSON。
- `academic_reports`：过去两年成绩单
- `standardized_scores`：雅思/托福等标准化成绩
- `identity_proof`：香港身份/受养人证明
- `address_proof`：住址证明

---

## 3.6 follow_up_status（跟进处置状态）
- `following`：联系中
- `awaiting_user_info`：待补资料
- `qualified`：已转顾问
- `nurturing`：回流培育池
- `closed`：已关闭

---

## 4. SLA 自动处理逻辑（第一版）

## 4.1 首次响应计时
- **触发点**：用户提交咨询意向。
- **目标**：SLA 建议为 **2 小时内**（工作日 9:00-18:00）。
- **动作**：若超时，管理员列表页对应案例置顶变红，标记 `sla_status = violated`。

## 4.2 补资料超时逻辑
- **触发点**：状态变为 `awaiting_user_info`。
- **时限**：**7 天**。
- **动作**：第 7 天用户仍未补齐资料且无动作，管理员收到自动提醒；管理员可一键转入 `nurturing`。

## 4.3 跟进关闭逻辑
- **触发点**：状态长期处于 `admin_following`（如超过 3 天未达成结论）。
- **动作**：管理员需强制填写当前结论或转入培育。

---

## 5. 页面与 API 实现建议

### 管理员保存按钮触发的逻辑
当管理员点 [确认转顾问] 时：

1. **校验入参**：`intent_level`、`target_timeline`、`consult_focus` 必填。
2. **写表**：更新 `admin_follow_up_records`。
3. **分配**：自动在 `consultant_assignments` 生成一条记录。
4. **状态流转**：`case.status` 更新为 `consult_assigned`。
5. **通知**：触发给对应顾问的消息推送（内部消息/微信通知）。

---

## 6. 与顾问页面的衔接

顾问工作台详情页置顶展示：

> **管理员交接摘要：**
> "用户是 B 类高意愿家长，已经拿到高才身份但在纠结 9 月还是明年插。目前最担心的还是孩子在当前内地公立学校的英文衔接问题。我已经确认过他之前的成绩单，数学很好，建议咨询重点放在选校分布和英文补习规划上。"

---

## 7. 下一步建议

这一层做完以后，系统逻辑已经非常闭环了。

我建议下一步可以先停一停设计工作，反过来查一下：
**《香港学校数据库》的核心字段表。**

原因：
不管是 AI 诊断、管理员沟通、还是顾问咨询，最终都要落到具体的学校。  
如果学校数据库的字段不支持“英文要求等级”、“插班学费区间”、“住宿属性”等字段，那么上面的所有设计都会变成虚的。

如果你同意，我下一步直接出：
**《香港学校数据库：第一版核心字段设计》**