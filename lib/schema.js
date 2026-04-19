export const formSections = [
  {
    id: "eligibility",
    title: "0. 资格前置",
    description: "先确认身份条件，这是判断入读可行性的第一道门槛。",
    fields: [
      {
        name: "identity_type",
        label: "你的身份/签证情况",
        type: "radio",
        required: true,
        options: [
          ["planning", "计划中 / 还没申请（仅作了解）"],
          ["approved_talent", "已获批高才通 / 优才 / 专才其一"],
          ["dependant", "受养人签证（配偶或父母已在港）"],
          ["permanent_resident", "已持有香港永久居民身份证"],
          ["one_way_permit", "单程证"],
          ["other_visa", "其他合法受教育签证"]
        ]
      },
      {
        name: "identity_type_other",
        label: "其他签证补充说明（选填）",
        type: "text",
        placeholder: "例如：IANG / 受教育签证类别"
      }
    ]
  },
  {
    id: "basic",
    title: "1. 基础信息",
    description: "这些字段决定初步匹配的学校路径和窗口。",
    fields: [
      {
        name: "student_name",
        label: "孩子称呼",
        type: "text",
        placeholder: "例如：Mia",
        required: true
      },
      {
        name: "current_grade",
        label: "孩子目前所在年级",
        type: "radio",
        required: true,
        options: [
          ["kindergarten", "幼儿园"],
          ["g1-g3", "小学 1-3 年级"],
          ["g4-g6", "小学 4-6 年级"],
          ["g7-g9", "初中 7-9 年级"],
          ["g10-g12", "高中 10-12 年级"]
        ]
      },
      {
        name: "current_city",
        label: "孩子目前所在城市",
        type: "text",
        placeholder: "例如：深圳 / 上海 / 杭州",
        required: true
      },
      {
        name: "school_system",
        label: "当前学校体系",
        type: "radio",
        required: true,
        options: [
          ["public", "公立学校"],
          ["private", "民办学校"],
          ["bilingual", "双语学校"],
          ["international", "国际学校"],
          ["other", "其他"]
        ]
      },
      {
        name: "teaching_language",
        label: "主要授课语言",
        type: "radio",
        required: true,
        options: [
          ["chinese", "中文为主"],
          ["bilingual", "中英双语"],
          ["english", "英文为主"],
          ["other", "其他"]
        ]
      },
      {
        name: "school_performance_level",
        label: "孩子目前校内整体成绩水平",
        type: "radio",
        required: true,
        options: [
          ["top", "班级前 20% 左右"],
          ["upper", "班级中上"],
          ["middle", "班级中等"],
          ["lower", "班级中下 / 暂不稳定"],
          ["unknown", "暂不方便判断"]
        ]
      }
    ]
  },
  {
    id: "language_goal",
    title: "2. 目标与能力",
    description: "用于判断英文衔接风险、路径匹配与时机紧迫度。",
    fields: [
      {
        name: "english_level",
        label: "孩子目前的英文水平",
        type: "radio",
        required: true,
        options: [
          ["weak", "暂无标准化成绩，且英文基础较弱"],
          ["ket", "已达到 Cambridge KET 水平或校内中等偏下"],
          ["pet", "已达到 Cambridge PET 水平或校内中等偏上"],
          ["fce_plus", "已达到 Cambridge FCE 及以上或可较好适应英文授课"]
        ]
      },
      {
        name: "cambridge_exam_result",
        label: "剑桥英语成绩（选填）",
        type: "text",
        placeholder: "例如：PET 良好"
      },
      {
        name: "other_english_scores",
        label: "其他英语成绩（选填）",
        type: "text",
        placeholder: "例如：校内英语 92 分"
      },
      {
        name: "target_intake",
        label: "你希望孩子何时入学香港学校",
        type: "radio",
        required: true,
        options: [
          ["urgent", "今年 9 月 / 明年 2 月插班（较紧）"],
          ["year", "明年 9 月（1 年内）"],
          ["two-years", "2 年内"],
          ["explore", "时间未定，希望先判断"]
        ]
      },
      {
        name: "long_term_goal",
        label: "你对孩子未来路径的主要规划",
        type: "radio",
        required: true,
        options: [
          ["hk_path", "长期在香港读书并走香港升学路径"],
          ["hybrid_path", "先进入香港体系，未来再看国际/海外"],
          ["intl_overseas", "以国际学校 / 海外升学为主"],
          ["unsure", "目前还没有完全想清楚"]
        ]
      },
      {
        name: "tuition_budget",
        label: "你对学费/教育预算的范围",
        type: "radio",
        required: true,
        options: [
          ["under-80k", "每学年 8 万以下"],
          ["80k-150k", "每学年 8-15 万"],
          ["150k-300k", "每学年 15-30 万"],
          ["300k-plus", "每学年 30 万以上"],
          ["unknown", "暂无明确预算，先看匹配"]
        ]
      }
    ]
  },
  {
    id: "concerns",
    title: "3. 顾虑与意向",
    description: "这部分帮助系统定位风险标签和跟进优先级。",
    fields: [
      {
        name: "main_concerns",
        label: "你现在最主要的顾虑（可多选）",
        type: "checkbox",
        required: true,
        options: [
          ["english_gap", "英文跟不上"],
          ["adaptation", "孩子适应不了香港环境"],
          ["school_choice", "不知道该选什么学校"],
          ["path_unclear", "不清楚未来升学路径"],
          ["timing", "时间安排来不及"],
          ["budget", "学费或整体预算压力"],
          ["identity", "身份 / 住址 / 手续问题"],
          ["other", "其他"]
        ]
      },
      {
        name: "other_concern",
        label: "其他顾虑补充（选填）",
        type: "text",
        placeholder: "如果选择了“其他”，可在这里补充"
      },
      {
        name: "main_concern_details",
        label: "你最担心的具体情况（选填）",
        type: "textarea",
        placeholder: "例如：担心孩子英语跟不上，转学后信心受挫"
      },
      {
        name: "child_willingness",
        label: "孩子本人对去香港读书的态度",
        type: "radio",
        required: true,
        options: [
          ["willing", "很愿意"],
          ["acceptable", "基本接受"],
          ["resistant", "有些抗拒"],
          ["unsure", "还不确定 / 还没认真聊过"]
        ]
      },
      {
        name: "consultation_intent",
        label: "是否希望顾问进一步解读报告",
        type: "radio",
        required: true,
        options: [
          ["high", "希望尽快联系我"],
          ["medium", "可以进一步聊聊"],
          ["low", "先看报告再决定"]
        ]
      },
      {
        name: "contact_window",
        label: "方便联系时间",
        type: "radio",
        required: true,
        options: [
          ["workday", "工作日白天"],
          ["evening", "工作日晚间"],
          ["weekend", "周末"],
          ["flexible", "均可"]
        ]
      }
    ]
  },
  {
    id: "contact",
    title: "4. 报告解锁通知",
    description: "请至少留下一种联系方式，报告生成后我们会第一时间通知你。",
    fields: [
      {
        name: "parent_name",
        label: "家长称呼（选填）",
        type: "text",
        placeholder: "例如：陈女士"
      },
      {
        name: "mobile",
        label: "手机号（选填）",
        type: "text",
        placeholder: "例如：13800000000"
      },
      {
        name: "wechat_id",
        label: "微信号（选填）",
        type: "text",
        placeholder: "例如：abc_parent88"
      }
    ]
  }
];

const legacyFieldLabelMap = {
  studentName: "孩子称呼",
  grade: "孩子目前所在年级",
  location: "孩子目前所在城市",
  currentSchoolType: "当前学校体系",
  hkIdentity: "身份/签证情况",
  academicLevel: "校内成绩水平",
  englishLevel: "英文水平",
  subjectRisk: "学业薄弱项风险",
  selfDrive: "孩子自驱力",
  motivation: "主要动机与顾虑说明",
  preferredPath: "长期路径偏好",
  timeline: "目标入学时间",
  transitionAcceptance: "过渡方案接受度",
  budget: "预算范围",
  residencyFlex: "居住安排灵活度",
  parentPriority: "家长优先关注点",
  biggestConcern: "最大顾虑",
  consultationIntent: "顾问解读意向",
  contactName: "家长称呼",
  contactMethod: "主要联系方式",
  contactWindow: "方便联系时间",
  sourceChannel: "来源渠道"
};

const legacyOptionLabelMap = {
  grade: {
    kindergarten: "幼儿园",
    "g1-g3": "小学 1-3 年级",
    "g4-g6": "小学 4-6 年级",
    "g7-g9": "初中 7-9 年级",
    "g10-g12": "高中 10-12 年级"
  },
  sourceChannel: {
    xiaohongshu: "小红书",
    wechat: "朋友圈 / 微信群",
    friend: "朋友转介绍",
    content: "公众号 / 内容平台",
    other: "其他"
  },
  consultationIntent: {
    high: "希望尽快联系我",
    medium: "可以进一步聊聊",
    low: "先看报告再决定"
  }
};

export const optionLabelMap = formSections.reduce((acc, section) => {
  section.fields.forEach((field) => {
    if (!field.options) {
      return;
    }

    acc[field.name] = Object.fromEntries(field.options);
  });

  return acc;
}, { ...legacyOptionLabelMap });

export function getFieldLabel(fieldName) {
  for (const section of formSections) {
    const match = section.fields.find((field) => field.name === fieldName);
    if (match) {
      return match.label;
    }
  }

  return legacyFieldLabelMap[fieldName] || fieldName;
}

export function getOptionLabel(fieldName, value) {
  if (Array.isArray(value)) {
    return value.map((item) => optionLabelMap[fieldName]?.[item] ?? item).join("、");
  }

  return optionLabelMap[fieldName]?.[value] ?? value ?? "未填写";
}

export const requiredFieldNames = formSections.flatMap((section) =>
  section.fields.filter((field) => field.required).map((field) => field.name)
);

export const v3TableSchemas = {
  users: {
    primaryKey: "id",
    required: ["id", "role", "status", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["mobile_verified_at", "email_verified_at", "last_login_at", "created_at", "updated_at"]
  },
  user_identities: {
    primaryKey: "id",
    required: ["id", "user_id", "identity_type", "identity_value", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["verified_at", "created_at", "updated_at"]
  },
  user_sessions: {
    primaryKey: "id",
    required: ["id", "user_id", "status", "expires_at", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["expires_at", "last_seen_at", "created_at", "updated_at"]
  },
  login_challenges: {
    primaryKey: "id",
    required: ["id", "identity_type", "identity_value", "challenge_type", "code_hash", "status", "expires_at"],
    jsonFields: [],
    dateFields: ["expires_at", "created_at", "updated_at"]
  },
  user_profiles: {
    primaryKey: "id",
    required: ["id", "user_id", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["created_at", "updated_at"]
  },
  consultant_profiles: {
    primaryKey: "id",
    required: ["id", "user_id", "specialty_tags", "active_status", "created_at", "updated_at"],
    jsonFields: ["specialty_tags"],
    dateFields: ["created_at", "updated_at"]
  },
  admin_profiles: {
    primaryKey: "id",
    required: ["id", "user_id", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["created_at", "updated_at"]
  },
  students: {
    primaryKey: "id",
    required: ["id", "user_id", "child_name", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["created_at", "updated_at"]
  },
  cases: {
    primaryKey: "id",
    required: ["id", "case_no", "status", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["closed_at", "created_at", "updated_at"]
  },
  questionnaire_responses: {
    primaryKey: "id",
    required: ["id", "case_id", "response_json", "created_at", "updated_at"],
    jsonFields: ["response_json"],
    dateFields: ["submitted_at", "created_at", "updated_at"]
  },
  standardized_inputs: {
    primaryKey: "id",
    required: ["id", "case_id", "questionnaire_response_id", "input_snapshot_json", "created_at"],
    jsonFields: ["input_snapshot_json"],
    dateFields: ["created_at"]
  },
  diagnostic_jobs: {
    primaryKey: "id",
    required: ["id", "case_id", "questionnaire_response_id", "job_status", "created_at"],
    jsonFields: ["version_snapshot"],
    dateFields: ["started_at", "finished_at", "created_at"]
  },
  diagnostic_results: {
    primaryKey: "id",
    required: ["id", "diagnostic_job_id", "created_at"],
    jsonFields: ["rule_result_json", "school_data_snapshot_json", "risk_tags", "path_tags", "school_match_hint_json"],
    dateFields: ["created_at"]
  },
  reports: {
    primaryKey: "id",
    required: ["id", "case_id", "report_version", "report_type", "content_json", "created_at"],
    jsonFields: ["content_json", "summary_json"],
    dateFields: ["viewed_at", "created_at"]
  },
  consultation_requests: {
    primaryKey: "id",
    required: ["id", "case_id", "request_status", "submitted_at", "created_at", "updated_at"],
    jsonFields: [],
    dateFields: ["submitted_at", "created_at", "updated_at"]
  }
};

export const v3TableNames = Object.freeze(Object.keys(v3TableSchemas));

export function getV3TableSchema(tableName) {
  return v3TableSchemas[tableName] || null;
}
