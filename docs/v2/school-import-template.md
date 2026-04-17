# K12consult 香港学校库：Excel 批量导入母表模板设计

## 1. 结论

本模板基于 **方案 A（管理员统一审核导入）** 设计。  
顾问通过协作 Excel 填写或更新信息，管理员下载后上传至系统，系统执行 **Upsert（增量更新/新增）** 操作。

---

## 2. 核心字段分组列表 (Excel 列定义)

请将此作为 Excel 的首行（Header）。

### Group A: 身份标识与基础信息 (必填)
- `school_id`：系统内部 ID（更新时使用，新增留空）
- `edb_code`：教育局编号（作为判重唯一标识）
- `name_zh`：中文全称 *
- `name_en`：英文全称 *
- `district`：所属区域（如：油尖旺、中西区）
- `category`：类型（官立/津贴/直资/私立/国际）
- `curriculum`：主要课程（DSE/IB/A-Level/AP/英基等）
- `gender`：男女校/男/女
- `level`：年级段（K/P/S）
- `website`：官网地址

### Group B: 招生动态与时机 (最值钱的)
- `intake_status`：招生状态（Open/Waitlist/Closed）
- `grade_availability_summary`：余位简述（如：G1-G6全满，G7有少量补录）
- `next_window_date`：下一个窗口期日期
- `last_updated_date`：顾问最后一次核实日期

### Group C: 分年级余位 (JSON 推理辅助)
*这部分在 Excel 中建议分列，导入时自动转为 JSON*
- `avail_G1` / `avail_G2` / `avail_G3` ... `avail_G12`
- (填写值：0-无位, 1-少量, 2-有位)

### Group D: 门槛与录取偏好 (隐形门槛)
- `lang_inst`：教学语言（纯英/英普/英粤）
- `interview_lang_req`：面试语言要求
- `exam_difficulty_avg`：笔试难度分 (1-10)
- `english_entry_barrier`：英语门槛描述（如：对标 CEFR B2）
- `mainland_score`：内地生友好度 (1-10)
- `eal_support`：是否有英语支持包 (Yes/No)
- `identity_limit`：身份限制描述（如：高才/受养人均可）

### Group E: 成本与财务
- `tuition_year_min`：最低年学费
- `tuition_year_max`：最高年学费
- `bond_type`：债券类型（不限/必须/可选）
- `bond_price_ref`：债券参考价格

### Group F: 顾问专家评价 (私货)
- `academic_level`：学术压力指数 (1-10)
- `school_vibe`：校园氛围简述
- `pros_tags`：核心优势标签（用分号隔开，如：STEM强；升学稳）
- `cons_tags`：核心避坑点（如：粤语环境重；面试极难循环）
- `consultant_direct_quote`：顾问一句话毒评

---

## 3. 导入规范说明

1. **唯一性核对**：导入时优先识别 `edb_code`，若 edb_code 匹配，则执行全字段覆盖更新。
2. **空值处理**：模板空值不代表删除，系统可以选择 [忽略空值更新] 或 [清空该字段]。
3. **标签标准化**：`curriculum` 等字段建议在 Excel 中使用“数据验证”下拉菜单，防止顾问乱填。
4. **JSON 自动化转换**：管理员上传后，系统自动将 `avail_G(x)` 列合并为数据库的 `grade_availability_json` 字段。

---

## 4. 管理员导入流程建议

1. **共享工作表**：在飞书/腾讯文档维护这份 Excel。
2. **顾问填报**：顾问根据最新情报，随时在对应的学校行进行修改。
3. **每周审核日**：管理员每周五下午核对他人的改动（查看修订记录）。
4. **一键同步**：管理员导出 CSV，点击后台 [Upload & Review] 按钮。
5. **冲突检查**：系统高亮显示本次更新涉及的敏感字段（如余位变动、难度变动）。
6. **发布上线**：管理员点击 [Confirm Publish]，全网 AI 诊断逻辑立即生效。

---

## 5. 下一步建议

导入模板有了。

我建议下一步：
**由我（AI）为你爬取第一批（比如 30 家）核心私立/国际学校的基础数据，按这个格式填好 CSV 供你预览。**

你会看到大模型能拿到的数据到哪一步，以及剩下的哪些字段（比如“内地生友好度”、“真实余位”）必须由你和顾问人工补上。

如果你同意，我下一步直接做：
**《首批 30 家核心香港学校：数据爬取与初步填报 CSV》**